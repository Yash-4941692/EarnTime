/**
 * Content script (top frame only, `document_start`).
 *
 * What it does, in the order it happens:
 *
 *  1. **Closes the gate.** Before the site's own markup is parsed, a style element hides the page
 *     and swallows input (`gate.ts`). From that instant the page cannot be used, watched or clicked
 *     until EarnTime has decided what it is. This is what removed the first-visit bypass: the site
 *     used to be open and interactive while EarnTime was still asking its service worker.
 *  2. **Decides locally, while the page loads.** The persisted rules and this tab's half-productive
 *     session are read from `chrome.storage`, which is served by the browser and does not wait for a
 *     cold service worker (`local.ts`). On a half-productive site with no session that puts the
 *     chooser on screen within milliseconds — no reload, no uncovered moment.
 *  3. **Confirms with the service worker.** The worker stays the authority: its directive replaces
 *     the local one, and every mode choice is validated by it. Until it answers, a fail-closed
 *     "Checking this site" cover is shown.
 *  4. **Keeps deciding.** Same-document navigations (single-page apps, `pushState`) are re-checked
 *     here, because Chrome does not re-run a content script for them, and a change to the rules in
 *     Settings is picked up live.
 *
 * The script never decides its own rules. Everything it applies comes from persisted state or from
 * the worker, and the gate is only opened by a positive decision — or by the extension going away,
 * because a page nobody manages must not stay hidden.
 */

import type { PageDirective } from '../core/directive';
import type { HalfMode } from '../core/types';
import { askWorker, type AskOptions } from './askWorker';
import { createGate, extensionContextAlive, type Gate } from './gate';
import { provisionalVerdict, readLocalVerdictInput, stripHash, type LocalVerdictInput, type Provisional } from './local';
import { chooserCard, coverCard, createOverlay, type Overlay } from './overlay';
import { startYouTubeFilter, type YouTubeFilter } from './youtube';

const HEALTH_INTERVAL_MS = 10_000;
/** How long the page waits before the "Checking this site" cover is shown over an empty gate. */
const WAITING_COVER_MS = 300;
/** How often same-document navigations (SPA route changes) are noticed. */
const URL_WATCH_MS = 750;

export { WAITING_COVER_MS, URL_WATCH_MS, HEALTH_INTERVAL_MS };

export interface Reply {
  ok: boolean;
  /** The tab this page is running in, as the worker sees it. */
  tabId?: number | null;
  directive?: PageDirective;
  error?: { message: string };
}

/** Everything this module touches about the page and the extension, injectable for tests. */
export interface PageEnv {
  send(message: unknown): Promise<Reply | undefined>;
  /** `chrome.storage.session.get` — the worker's published verdicts. May be unavailable. */
  sessionGet?(keys: string[]): Promise<Record<string, unknown>>;
  /** `chrome.storage.local.get` — the persisted rules and sessions. */
  localGet(keys: string[]): Promise<Record<string, unknown>>;
  /** Called when the persisted state changes elsewhere (Settings, another tab). */
  onStorageChanged(listener: (changedKeys: string[], area: string) => void): () => void;
  setInterval(handler: () => void, ms: number): number;
  clearInterval(handle: number): void;
  setTimeout(handler: () => void, ms: number): number;
  clearTimeout(handle: number): void;
  now(): number;
  isAlive?(): boolean;
  askOptions?: AskOptions;
}

export interface PageControl {
  /** True while the page is hidden and unusable. */
  gated(): boolean;
  /** Title of the EarnTime card on screen, or null when the page is open with no card. */
  cardTitle(): string | null;
  /** Stops every timer and removes EarnTime's UI. */
  dispose(): void;
}

interface Runtime {
  env: PageEnv;
  doc: Document;
  win: (Window & typeof globalThis) | null;
  gate: Gate;
  overlay: Overlay | null;
  youtube: YouTubeFilter | null;
  /** JSON of the directive currently applied, so identical decisions are not rebuilt. */
  lastKey: string;
  tabId: number | null;
  url: string;
  host: string | null;
  answered: boolean;
  abandoned: boolean;
  disposed: boolean;
  local: LocalVerdictInput | null;
  intervals: number[];
  timeouts: number[];
  cleanups: Array<() => void>;
}

/** Hostname of an http(s) URL, or null for anything EarnTime does not manage. */
export function hostOfUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

function cardTitleOf(rt: Runtime): string | null {
  return rt.overlay?.root.shadowRoot?.querySelector('.et-title')?.textContent ?? null;
}

/**
 * Attaches EarnTime to a document. Called once per page load by the content-script entry point.
 * Returns immediately: the gate is closed synchronously, the decisions follow asynchronously.
 */
export function attachPage(doc: Document, env: PageEnv): PageControl {
  const rt: Runtime = {
    env,
    doc,
    win: doc.defaultView,
    gate: null as unknown as Gate,
    overlay: null,
    youtube: null,
    lastKey: '',
    tabId: null,
    url: doc.defaultView?.location.href ?? '',
    host: null,
    answered: false,
    abandoned: false,
    disposed: false,
    local: null,
    intervals: [],
    timeouts: [],
    cleanups: [],
  };
  rt.host = hostOfUrl(rt.url);

  rt.gate = createGate(doc, env.isAlive ?? extensionContextAlive, () => abandon(rt));
  // Installed before anything is awaited, so the very first paint is already gated.
  rt.gate.install();

  const control: PageControl = {
    gated: () => rt.gate.closed && !rt.abandoned && !rt.disposed,
    cardTitle: () => cardTitleOf(rt),
    dispose: () => {
      rt.disposed = true;
      stopAll(rt);
      rt.gate.dispose();
      rt.overlay?.remove();
      rt.overlay = null;
    },
  };

  void run(rt);
  return control;
}

async function run(rt: Runtime): Promise<void> {
  const { env } = rt;

  // 1. A page EarnTime does not manage at all (chrome://, an extension page, a non-http scheme)
  //    must never be hidden, so it is released before any waiting happens.
  if (!rt.host) {
    release(rt, 'none');
    return;
  }

  // The cover for a still-undecided page. It does nothing when a decision has already been applied.
  const waiting = env.setTimeout(() => {
    if (rt.answered || rt.abandoned || rt.disposed || rt.lastKey !== '') return;
    showWaiting(rt);
  }, WAITING_COVER_MS);
  rt.timeouts.push(waiting);

  // 2. Decide locally while the page loads. This read does not need the service worker, so the
  //    chooser for a half-productive first visit is on screen before the site paints.
  await refreshLocal(rt);
  if (stopped(rt)) return;
  applyProvisional(rt, provisionalVerdict(rt.host, rt.tabId, rt.local));
  watchUrl(rt);
  watchRules(rt);

  // 3. The worker's answer replaces the local verdict. It is retried well past the worker's
  //    cold-start window; until it arrives the page stays as the local verdict left it.
  const reply = await askWorker<Reply>({ type: 'page.init', url: rt.url }, env.send, env.askOptions);
  if (stopped(rt)) return;
  rt.answered = true;
  rememberTab(rt, reply);

  if (reply && reply.ok) {
    applyDirective(rt, reply.directive ?? { kind: 'none' });
    return;
  }
  if (reply) {
    // An explicit refusal is still an answer: nothing to show, but the page must not stay covered.
    release(rt, 'none');
    return;
  }

  // 4. The worker never answered. Re-read the persisted state and keep whatever it decides.
  //
  //    This is the fail-closed rule, and it is the whole point of the gate: a page EarnTime cannot
  //    classify stays covered rather than opening. Storage can only be unreadable if the extension
  //    is going away, and the watchdog releases the page in that case, so "covered until you reload"
  //    is the honest state — not "open, uncounted", which is what the first-visit bypass was.
  if (rt.lastKey === '' || rt.lastKey === 'hold') {
    await refreshLocal(rt);
    if (stopped(rt)) return;
    const fallback = provisionalVerdict(rt.host, rt.tabId, rt.local);
    if (fallback.kind === 'open') release(rt, 'none');
    else if (fallback.kind === 'directive') applyProvisional(rt, fallback);
    else showWaiting(rt);
  }
}

function stopped(rt: Runtime): boolean {
  return rt.abandoned || rt.disposed;
}

function rememberTab(rt: Runtime, reply: Reply | undefined): void {
  if (reply && typeof reply.tabId === 'number') rt.tabId = reply.tabId;
}

/** Decides from locally readable state. `hold` keeps the gate closed until the worker answers. */
function applyProvisional(rt: Runtime, verdict: Provisional): void {
  if (stopped(rt)) return;
  if (verdict.kind === 'open') {
    release(rt, 'none');
    return;
  }
  if (verdict.kind === 'hold') {
    rt.gate.close();
    rt.lastKey = 'hold';
    showWaiting(rt);
    return;
  }
  applyDirective(rt, verdict.directive);
}

function applyDirective(rt: Runtime, directive: PageDirective | undefined): void {
  if (stopped(rt)) return;
  if (!directive || directive.kind === 'none') {
    release(rt, 'none');
    return;
  }

  const key = JSON.stringify(directive);
  if (key === rt.lastKey) {
    // The same decision again (a retried `page.init`, the worker confirming the local verdict):
    // re-assert the state it describes, in case the page removed EarnTime's UI in the meantime.
    if (directive.kind === 'choose') rt.gate.close();
    return;
  }
  rt.lastKey = key;

  if (directive.kind === 'choose') {
    teardownFilters(rt);
    rt.gate.close();
    const overlay = ensureOverlay(rt);
    overlay.banner(null);
    overlay.set(
      chooserCard({
        host: directive.host,
        canUnproductive: directive.canUnproductive,
        reason: directive.reason,
        onChoose: (mode: HalfMode) => choose(rt, mode),
        onLeave: () => leave(rt),
      }),
    );
    return;
  }

  // An active session means a mode has been chosen and validated by the worker: the page opens.
  const overlay = ensureOverlay(rt);
  overlay.set(null);
  teardownFilters(rt);
  rt.gate.open();
  if (directive.mode === 'productive') {
    overlay.banner('EarnTime · Productive Mode', 'ok');
    if (directive.filter === 'youtube') {
      rt.youtube = startYouTubeFilter({
        keywords: directive.youtubeKeywords,
        overlay,
        leave: () => leave(rt),
        onHealth: (ok, detail) => reportHealth(rt, ok, detail),
      });
      const sendCurrentHealth = () => {
        const health = rt.youtube?.health() ?? { ok: true };
        reportHealth(rt, health.ok, health.detail);
      };
      // This can be an intentional cover, which reports `detail: 'covered'`, or a broken filter.
      sendCurrentHealth();
      rt.intervals.push(rt.env.setInterval(sendCurrentHealth, HEALTH_INTERVAL_MS));
    }
  } else {
    overlay.banner('EarnTime · Unproductive Mode', 'warn');
  }
}

/** The page is open and EarnTime has nothing on it. */
function release(rt: Runtime, key: string): void {
  if (stopped(rt)) return;
  teardownFilters(rt);
  rt.overlay?.set(null);
  rt.overlay?.banner(null);
  rt.gate.open();
  rt.lastKey = key;
}

function showWaiting(rt: Runtime): void {
  if (stopped(rt)) return;
  rt.gate.close();
  const overlay = ensureOverlay(rt);
  overlay.banner(null);
  if (cardTitleOf(rt) === WAITING_TITLE) return;
  overlay.set(
    coverCard({
      eyebrow: 'EarnTime',
      title: WAITING_TITLE,
      text: 'EarnTime is confirming how this page should be counted. Nothing opens until it answers.',
      actions: [{ label: 'Reload', onClick: () => rt.win?.location.reload(), secondary: true }],
    }),
  );
}

const WAITING_TITLE = 'Checking this site…';

async function choose(rt: Runtime, mode: HalfMode): Promise<string | null> {
  const reply = await askWorker<Reply>(
    { type: 'page.choose', url: rt.win?.location.href ?? rt.url, mode },
    rt.env.send,
    rt.env.askOptions,
  );
  if (stopped(rt)) return null;
  if (!reply) return 'EarnTime is not responding. Please wait a moment and try again.';
  if (!reply.ok) return reply.error?.message ?? 'That mode is not available right now.';
  rememberTab(rt, reply);
  applyDirective(rt, reply.directive);
  return null;
}

function leave(rt: Runtime): void {
  const win = rt.win;
  if (!win) return;
  if (win.history.length > 1) win.history.back();
  else win.location.assign('chrome://newtab/');
}

function reportHealth(rt: Runtime, ok: boolean, detail?: string): void {
  if (stopped(rt)) return;
  void rt.env.send({ type: 'page.health', ok, detail });
}

function ensureOverlay(rt: Runtime): Overlay {
  if (!rt.overlay) {
    // Mounted through the gate, so a page that wipes its own DOM cannot remove EarnTime's UI: the
    // keep-alive re-appends the very same node, with its listeners intact.
    const overlay = createOverlay();
    rt.gate.mountOverlay(() => overlay.root);
    rt.overlay = overlay;
  }
  return rt.overlay;
}

function teardownFilters(rt: Runtime): void {
  rt.youtube?.stop();
  rt.youtube = null;
}

function stopAll(rt: Runtime): void {
  for (const handle of rt.intervals) rt.env.clearInterval(handle);
  for (const handle of rt.timeouts) rt.env.clearTimeout(handle);
  for (const off of rt.cleanups) {
    try {
      off();
    } catch {
      // A dead extension context throws on removeListener; there is nothing left to remove.
    }
  }
  rt.intervals = [];
  rt.timeouts = [];
  rt.cleanups = [];
  teardownFilters(rt);
}

/** The extension was disabled, reloaded or removed while this page was loading. */
function abandon(rt: Runtime): void {
  rt.abandoned = true;
  rt.answered = true;
  stopAll(rt);
  rt.overlay = null;
}

async function refreshLocal(rt: Runtime): Promise<void> {
  rt.local = await readLocalVerdictInput(
    rt.tabId,
    rt.win?.location.href ?? rt.url,
    rt.env.sessionGet?.bind(rt.env),
    rt.env.localGet.bind(rt.env),
  );
}

/**
 * Re-checks the URL while the page is open. Chrome does not re-run a content script for a
 * same-document navigation, so a single-page app that moves to another host would otherwise keep
 * the verdict of the page it started on.
 */
function watchUrl(rt: Runtime): void {
  const handle = rt.env.setInterval(() => {
    if (stopped(rt)) return;
    const win = rt.win;
    if (!win) return;
    const url = win.location.href;
    if (stripHash(url) === stripHash(rt.url)) return;
    rt.url = url;
    const host = hostOfUrl(url);
    const hostChanged = host !== rt.host;
    rt.host = host;
    if (!host) {
      release(rt, 'none');
      return;
    }
    void recheck(rt, hostChanged);
  }, URL_WATCH_MS);
  rt.intervals.push(handle);
}

/** Re-judges the page after a URL change, a rules change or a mode chosen in another tab. */
async function recheck(rt: Runtime, hostChanged: boolean): Promise<void> {
  await refreshLocal(rt);
  if (stopped(rt)) return;
  const verdict = provisionalVerdict(rt.host, rt.tabId, rt.local);
  // Never downgrade a chosen session to a chooser before the worker has said so: the session table
  // read here can be a moment behind, and re-asking on a page that is already decided is the exact
  // flicker this whole design exists to avoid.
  const downgrade = verdict.kind === 'directive' && verdict.directive.kind === 'choose' && rt.lastKey.startsWith('{"kind":"active"');
  if (!downgrade) applyProvisional(rt, verdict);
  if (!hostChanged) return;
  // A different host is a different page as far as the rules are concerned: confirm with the worker.
  const reply = await askWorker<Reply>({ type: 'page.init', url: rt.url }, rt.env.send, rt.env.askOptions);
  if (stopped(rt)) return;
  rememberTab(rt, reply);
  if (reply && reply.ok) applyDirective(rt, reply.directive ?? { kind: 'none' });
}

/** Rules changed in Settings, or another tab chose a mode: re-judge this page immediately. */
function watchRules(rt: Runtime): void {
  const off = rt.env.onStorageChanged((keys, area) => {
    if (stopped(rt)) return;
    if (area !== 'local' || !keys.includes('state')) return;
    void recheck(rt, false);
  });
  rt.cleanups.push(off);
}
