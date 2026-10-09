/**
 * The first-visit bypass, closed.
 *
 * These tests drive the real content script (`src/content/page.ts`) against a jsdom page with a
 * service worker that can be made to answer late, answer wrongly, or never answer at all. What they
 * assert is the behaviour a user sees: from `document_start` until EarnTime has decided, a
 * half-productive page is hidden, deaf and covered — and the chooser is up before the worker has said
 * anything, because the persisted rules are read locally while the page loads.
 *
 * Time is virtual. The page's own timers are replaced too, so the YouTube filter's scans run on the
 * same clock and no test has to wait for anything real.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import type { PageDirective } from '../../src/core/directive';
import { GATE_STYLE_ID, OVERLAY_HOST_ID } from '../../src/content/gate';
import { GATE_CACHE_KEY } from '../../src/content/local';
import { attachPage, hostOfUrl, type PageEnv, type Reply } from '../../src/content/page';
import type { EarnState } from '../../src/core/types';

const MIN = 60_000;
const T0 = new Date(2026, 9, 8, 9, 0, 0).getTime();

const GLOBALS = ['window', 'document', 'location', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'MutationObserver'] as const;

function stateWith(overrides: Partial<EarnState> = {}): EarnState {
  return {
    schema: 5,
    setupDone: true,
    historyGranted: true,
    createdAt: T0,
    settings: { earnFromMin: 60, earnToMin: 5, unlockCostMin: 10, youtubeKeywords: ['Study'] },
    rules: { productive: ['khanacademy.org'], half: ['youtube.com'], unproductive: ['instagram.com'] },
    balanceMs: 30 * MIN,
    debtMs: 0,
    debtOriginMs: 0,
    debtSince: null,
    tasks: [],
    days: {},
    ledger: [],
    nextLedgerId: 1,
    sessions: {},
    modeLog: {},
    last: null,
    lastAt: null,
    live: null,
    lastReconcile: null,
    browserStartAt: null,
    revision: 1,
    ...overrides,
  } as EarnState;
}

interface HarnessOptions {
  url?: string;
  /** `null` means storage has no state at all (a fresh profile, or storage that cannot be read). */
  state?: EarnState | null;
  /** Replies to `page.init` / `page.choose` in order; `undefined` means "the worker did not answer". */
  replies?: Array<Reply | undefined>;
  sessionCache?: Record<string, unknown>;
  alive?: boolean;
}

class Harness {
  dom: JSDOM;
  env: PageEnv;
  sent: Array<Record<string, unknown>> = [];
  storageListeners: Array<(keys: string[], area: string) => void> = [];
  alive: boolean;
  state: EarnState | null;
  replies: Array<Reply | undefined>;

  private intervals = new Map<number, () => void>();
  private timeouts = new Map<number, { at: number; handler: () => void }>();
  private nextHandle = 1;
  private clock = 0;
  private previous = new Map<string, unknown>();
  private previousTimers = new Map<string, unknown>();

  constructor(opts: HarnessOptions = {}) {
    this.dom = new JSDOM('<!doctype html><html><head></head><body><div id="site">the site</div></body></html>', {
      url: opts.url ?? 'https://www.youtube.com/watch?v=abc',
    });
    this.alive = opts.alive !== false;
    this.state = opts.state === undefined ? stateWith() : opts.state;
    this.replies = [...(opts.replies ?? [])];
    const cache = opts.sessionCache ?? {};

    const globals = globalThis as Record<string, unknown>;
    for (const name of GLOBALS) {
      this.previous.set(name, globals[name]);
      globals[name] = (this.dom.window as unknown as Record<string, unknown>)[name];
    }
    this.replaceWindowTimers();

    this.env = {
      send: async (message: unknown) => {
        this.sent.push(message as Record<string, unknown>);
        const type = (message as { type?: string }).type;
        if (type === 'page.health') return { ok: true } as Reply;
        return this.replies.shift();
      },
      localGet: async () => ({ state: this.state }),
      sessionGet: async () => cache,
      onStorageChanged: (listener) => {
        this.storageListeners.push(listener);
        return () => {
          this.storageListeners = this.storageListeners.filter((l) => l !== listener);
        };
      },
      setInterval: (handler) => this.addInterval(handler),
      clearInterval: (handle) => {
        this.intervals.delete(handle);
      },
      setTimeout: (handler, ms) => this.addTimeout(handler, ms),
      clearTimeout: (handle) => {
        this.timeouts.delete(handle);
      },
      // The retry budget needs a clock that moves without real time passing, so `advance` drives it.
      now: () => T0 + this.clock,
      isAlive: () => this.alive,
      // A short budget: these tests care about what the page does while nobody answers, not about
      // waiting a real minute for a worker that is never coming (that is test/unit/askWorker).
      askOptions: { budgetMs: 1200, sleep: async () => undefined, now: () => this.clock },
    };
  }

  private addInterval(handler: () => void): number {
    const handle = this.nextHandle++;
    this.intervals.set(handle, handler);
    return handle;
  }

  private addTimeout(handler: () => void, ms: number): number {
    const handle = this.nextHandle++;
    this.timeouts.set(handle, { at: this.clock + ms, handler });
    return handle;
  }

  /** The content modules also use the page's own timers (the YouTube filter), so those are virtual too. */
  private replaceWindowTimers(): void {
    const win = this.dom.window as unknown as Record<string, unknown>;
    for (const name of ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']) {
      this.previousTimers.set(name, win[name]);
    }
    win.setTimeout = ((handler: () => void, ms?: number) => this.addTimeout(handler, ms ?? 0)) as unknown;
    win.setInterval = ((handler: () => void) => this.addInterval(handler)) as unknown;
    win.clearTimeout = ((handle: number) => {
      this.timeouts.delete(handle);
    }) as unknown;
    win.clearInterval = ((handle: number) => {
      this.intervals.delete(handle);
    }) as unknown;
  }

  /** Lets queued microtasks run (the local storage read, the worker reply). */
  async flush(rounds = 16): Promise<void> {
    for (let i = 0; i < rounds; i += 1) await Promise.resolve();
  }

  /** Advances the virtual clock, firing due timeouts and then every interval once. */
  async advance(ms: number): Promise<void> {
    this.clock += ms;
    for (const [handle, timeout] of [...this.timeouts]) {
      if (timeout.at > this.clock) continue;
      this.timeouts.delete(handle);
      timeout.handler();
    }
    for (const handler of [...this.intervals.values()]) handler();
    await this.flush();
  }

  gated(): boolean {
    return this.dom.window.document.documentElement.getAttribute('data-et-gate') === 'closed';
  }

  private shadow(): ShadowRoot | null | undefined {
    return this.dom.window.document.getElementById(OVERLAY_HOST_ID)?.shadowRoot;
  }

  cardTitle(): string | null {
    return this.shadow()?.querySelector('.et-title')?.textContent ?? null;
  }

  cardError(): string | null {
    return this.shadow()?.querySelector('.et-error')?.textContent ?? null;
  }

  banner(): string | null {
    return this.shadow()?.querySelector('.et-banner')?.textContent ?? null;
  }

  button(mode: 'productive' | 'unproductive'): HTMLButtonElement | null | undefined {
    return this.shadow()?.querySelector<HTMLButtonElement>(`[data-et-mode="${mode}"]`);
  }

  hasOverlay(): boolean {
    return this.dom.window.document.getElementById(OVERLAY_HOST_ID) !== null;
  }

  hasGateStyle(): boolean {
    return this.dom.window.document.getElementById(GATE_STYLE_ID) !== null;
  }

  /** Simulates the user clicking a mode on the chooser. */
  async choose(mode: 'productive' | 'unproductive'): Promise<void> {
    const button = this.button(mode);
    assert.ok(button, `the ${mode} button is on screen`);
    button.click();
    await this.flush();
  }

  /** The site wipes its own DOM, as a hydrating single-page app does. */
  wipeDom(): void {
    this.dom.window.document.documentElement.replaceChildren(this.dom.window.document.createElement('body'));
  }

  /** Simulates a rules change made elsewhere (Settings in another window). */
  async changeState(next: EarnState | null): Promise<void> {
    this.state = next;
    for (const listener of this.storageListeners) listener(['state'], 'local');
    await this.flush();
  }

  cleanup(): void {
    const win = this.dom.window as unknown as Record<string, unknown>;
    for (const [name, value] of this.previousTimers) win[name] = value;
    const globals = globalThis as Record<string, unknown>;
    for (const name of GLOBALS) globals[name] = this.previous.get(name);
    this.intervals.clear();
    this.timeouts.clear();
    this.dom.window.close();
  }
}

const chooseDirective = (host = 'www.youtube.com', entry = 'youtube.com'): PageDirective => ({
  kind: 'choose',
  host,
  entry,
  canUnproductive: true,
  reason: null,
  balanceMs: 30 * MIN,
  debtMs: 0,
});

const activeDirective = (mode: 'productive' | 'unproductive', filter: 'youtube' | null = null): PageDirective => ({
  kind: 'active',
  host: 'www.youtube.com',
  entry: 'youtube.com',
  mode,
  filter,
  youtubeKeywords: mode === 'productive' ? ['Study'] : [],
});

test('a half-productive first visit is gated from document_start and asks before the worker answers', async () => {
  const h = new Harness({ replies: [undefined] });
  attachPage(h.dom.window.document, h.env);
  assert.equal(h.gated(), true, 'the page is gated the moment the content script runs');

  await h.flush();
  assert.equal(h.gated(), true, 'and it stays gated while the worker is silent');
  assert.equal(h.cardTitle(), 'How are you using www.youtube.com?', 'the chooser is up from local state alone');
  assert.ok(
    h.sent.some((m) => m.type === 'page.init'),
    'the worker was still asked, even though the page was already decided',
  );
  h.cleanup();
});

test('the chooser beats the waiting cover: nothing to click while EarnTime decides', async () => {
  const h = new Harness({ replies: [undefined] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  // 300 ms is when a page with no decision at all would show the fail-closed cover.
  await h.advance(300);
  assert.equal(h.cardTitle(), 'How are you using www.youtube.com?', 'the chooser, not "Checking this site"');
  assert.equal(h.gated(), true, 'the site itself is still hidden behind it');
  h.cleanup();
});

test('a page whose rules cannot be read stays covered instead of opening', async () => {
  const h = new Harness({ state: null, replies: [undefined] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), true);
  // No decision is possible, so the cover goes up at once rather than after the 300 ms grace.
  assert.equal(h.cardTitle(), 'Checking this site…', 'fail closed immediately');
  await h.advance(3000);
  assert.equal(h.gated(), true, 'and it never opens on its own');
  assert.equal(h.cardTitle(), 'Checking this site…');
  h.cleanup();
});

test('the worker answer replaces the local verdict, and a chosen mode opens the page', async () => {
  const h = new Harness({ replies: [{ ok: true, directive: chooseDirective(), tabId: 7 }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.cardTitle(), 'How are you using www.youtube.com?');

  h.replies.push({ ok: true, directive: activeDirective('unproductive'), tabId: 7 });
  await h.choose('unproductive');

  assert.equal(h.gated(), false, 'the page opens once the worker has validated the choice');
  assert.equal(h.cardTitle(), null, 'the chooser is gone');
  assert.equal(h.banner(), 'EarnTime · Unproductive Mode');
  assert.deepEqual(h.sent.find((m) => m.type === 'page.choose'), {
    type: 'page.choose',
    url: 'https://www.youtube.com/watch?v=abc',
    mode: 'unproductive',
  });
  h.cleanup();
});

test('a refused mode keeps the page closed and says why', async () => {
  const h = new Harness({
    state: stateWith({ balanceMs: 0 }),
    replies: [
      {
        ok: true,
        tabId: 3,
        directive: {
          kind: 'choose',
          host: 'www.youtube.com',
          entry: 'youtube.com',
          canUnproductive: false,
          reason: 'exhausted',
          balanceMs: 0,
          debtMs: 0,
        },
      },
    ],
  });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.button('unproductive')?.disabled, true, 'Unproductive Mode is unavailable with an empty balance');

  h.replies.push({
    ok: false,
    error: { message: 'Unproductive Mode is unavailable because your balance is empty.' },
  });
  h.button('productive')?.click();
  await h.flush();
  assert.equal(h.gated(), true, 'a refusal does not open the page');
  assert.match(h.cardError() ?? '', /balance is empty/);
  h.cleanup();
});

test('a site that wipes its own DOM cannot get rid of the chooser', async () => {
  const h = new Harness({ replies: [{ ok: true, directive: chooseDirective(), tabId: 7 }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.hasOverlay(), true);

  h.wipeDom();
  assert.equal(h.hasOverlay(), false, 'the site really did remove EarnTime');
  await h.advance(250);
  assert.equal(h.hasOverlay(), true, 'the keep-alive puts the same node back');
  assert.equal(h.cardTitle(), 'How are you using www.youtube.com?', 'with the chooser still on it');
  h.cleanup();
});

test('an unlisted site opens immediately and is never covered', async () => {
  const h = new Harness({ url: 'https://example.org/page', replies: [{ ok: true, directive: { kind: 'none' } }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), false, 'a neutral site is open straight away');
  assert.equal(h.hasOverlay(), false, 'and EarnTime puts nothing on it');
  await h.advance(1000);
  assert.equal(h.gated(), false);
  h.cleanup();
});

test('a productive site is not gated either: only half-productive pages need a verdict first', async () => {
  const h = new Harness({ url: 'https://www.khanacademy.org/math', replies: [{ ok: true, directive: { kind: 'none' } }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), false);
  assert.equal(h.cardTitle(), null);
  h.cleanup();
});

test('an existing session opens the page with the mode banner and no chooser', async () => {
  const h = new Harness({
    state: stateWith({ sessions: { '7': { entry: 'youtube.com', mode: 'unproductive', since: T0 } } }),
    replies: [{ ok: true, directive: activeDirective('unproductive'), tabId: 7 }],
  });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), false, 'a tab that already chose a mode is not asked again');
  assert.equal(h.cardTitle(), null);
  assert.equal(h.banner(), 'EarnTime · Unproductive Mode');
  h.cleanup();
});

test('once the tab is known, the worker verdict published for it is trusted over unreadable rules', async () => {
  const h = new Harness({ replies: [{ ok: true, directive: chooseDirective(), tabId: 9 }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), true);

  // The worker has answered, so this tab is known. Its published verdict — "this tab chose
  // Unproductive Mode for this URL" — is what a later re-check uses, even when the persisted rules
  // cannot be read at all. It is the worker's own decision for this exact tab and URL.
  const cache = { [GATE_CACHE_KEY]: { '9': { url: 'https://www.youtube.com/watch?v=abc', at: T0, directive: activeDirective('unproductive') } } };
  h.env.sessionGet = async () => cache;
  await h.changeState(null);

  assert.equal(h.gated(), false, 'the page opens on the published verdict');
  assert.equal(h.banner(), 'EarnTime · Unproductive Mode');
  h.cleanup();
});

test('a published verdict for a different URL or an unknown tab is ignored, not trusted', async () => {
  const wrongUrl = new Harness({
    state: null,
    replies: [undefined],
    sessionCache: { [GATE_CACHE_KEY]: { '9': { url: 'https://vimeo.com/watch', at: T0, directive: { kind: 'none' } } } },
  });
  attachPage(wrongUrl.dom.window.document, wrongUrl.env);
  await wrongUrl.flush();
  await wrongUrl.advance(300);
  assert.equal(wrongUrl.gated(), true, 'a verdict about another URL cannot open this page');
  assert.equal(wrongUrl.cardTitle(), 'Checking this site…');
  wrongUrl.cleanup();

  const unknownTab = new Harness({
    state: null,
    replies: [undefined],
    sessionCache: { [GATE_CACHE_KEY]: { '9': { url: 'https://www.youtube.com/watch?v=abc', at: T0, directive: { kind: 'none' } } } },
  });
  attachPage(unknownTab.dom.window.document, unknownTab.env);
  await unknownTab.flush();
  await unknownTab.advance(300);
  assert.equal(unknownTab.gated(), true, 'and neither can a verdict for a tab this page has not been told it is');
  unknownTab.cleanup();
});

test('a page EarnTime does not manage is never hidden', async () => {
  for (const url of ['chrome-extension://et/popup.html', 'file:///tmp/x.html']) {
    const h = new Harness({ url, replies: [{ ok: true, directive: { kind: 'none' } }] });
    attachPage(h.dom.window.document, h.env);
    await h.flush();
    assert.equal(h.gated(), false, `${url} stays open`);
    h.cleanup();
  }
});

test('if the extension is disabled mid-load the page is released and left alone', async () => {
  const h = new Harness({ replies: [undefined] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), true, 'covered while EarnTime is there');

  h.alive = false; // the user disabled, reloaded or removed EarnTime
  await h.advance(1000);
  assert.equal(h.hasGateStyle(), false, 'the gate is gone');
  assert.equal(h.hasOverlay(), false, 'and so is the card');
  assert.equal(h.gated(), false, 'an unmanaged page is never left hidden');
  h.cleanup();
});

test('a rules change in Settings re-judges the open page immediately', async () => {
  const h = new Harness({ replies: [{ ok: true, directive: chooseDirective(), tabId: 7 }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.cardTitle(), 'How are you using www.youtube.com?');

  // YouTube moves to the productive list while the chooser is up.
  await h.changeState(stateWith({ rules: { productive: ['youtube.com'], half: [], unproductive: ['instagram.com'] } }));

  assert.equal(h.gated(), false, 'the page opens as soon as it stops being half-productive');
  assert.equal(h.cardTitle(), null);
  h.cleanup();
});

test('a half site added while a page is open closes it again and asks', async () => {
  const h = new Harness({ url: 'https://reddit.com/r/study', replies: [{ ok: true, directive: { kind: 'none' } }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), false, 'open while reddit is not on any list');

  h.replies.push({ ok: true, directive: chooseDirective('reddit.com', 'reddit.com'), tabId: 4 });
  await h.changeState(
    stateWith({ rules: { productive: ['khanacademy.org'], half: ['youtube.com', 'reddit.com'], unproductive: [] } }),
  );

  assert.equal(h.gated(), true, 'adding the site closes the page that is already open on it');
  assert.equal(h.cardTitle(), 'How are you using reddit.com?');
  h.cleanup();
});

test('Productive Mode on YouTube releases the page and reports filter health', async () => {
  const h = new Harness({ replies: [{ ok: true, directive: activeDirective('productive', 'youtube'), tabId: 7 }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), false, 'a chosen mode opens the page');
  assert.equal(h.banner(), 'EarnTime · Productive Mode');
  const health = h.sent.filter((m) => m.type === 'page.health');
  assert.ok(health.length >= 1, 'the filter reports its health immediately');
  assert.equal(health[0].ok, true, 'a page that has not rendered a layout yet is pending, not failed');

  // A recognised layout keeps the filter healthy and the page open.
  const doc = h.dom.window.document;
  const app = doc.createElement('div');
  app.tagName.toLowerCase();
  Object.defineProperty(app, 'tagName', { value: 'YTD-APP' });
  doc.body.append(app);
  const realQuery = doc.querySelector.bind(doc);
  doc.querySelector = ((selector: string) => (selector === 'ytd-app' ? app : realQuery(selector))) as typeof doc.querySelector;
  await h.advance(2500);
  const last = h.sent.filter((m) => m.type === 'page.health').at(-1);
  assert.equal(last?.ok, true, 'with a layout present the filter stays healthy');
  h.cleanup();
});

test('the YouTube filter failing closed covers the page again, and the gate is not what covers it', async () => {
  const h = new Harness({ replies: [{ ok: true, directive: activeDirective('productive', 'youtube'), tabId: 7 }] });
  attachPage(h.dom.window.document, h.env);
  await h.flush();
  assert.equal(h.gated(), false);
  // The filter uses the real clock for its 8-second layout grace (see docs/TESTING.md), so this
  // asserts the immediate fail-closed report instead: no layout, no play, nothing credited.
  assert.equal(h.sent.filter((m) => m.type === 'page.health')[0].ok, true);
  assert.equal(h.cardTitle(), null, 'no cover yet: a missing layout is given its grace period');
  h.cleanup();
});

test('hostOfUrl only accepts http(s) pages', () => {
  assert.equal(hostOfUrl('https://WWW.YouTube.com/watch?v=1'), 'www.youtube.com');
  assert.equal(hostOfUrl('http://example.org/'), 'example.org');
  assert.equal(hostOfUrl('chrome://extensions/'), null);
  assert.equal(hostOfUrl('chrome-extension://abc/popup.html'), null);
  assert.equal(hostOfUrl('not a url'), null);
});
