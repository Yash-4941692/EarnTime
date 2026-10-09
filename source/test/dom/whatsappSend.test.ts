/**
 * DOM tests for the WhatsApp sender. These run the real content-script code against a fake
 * WhatsApp Web layout in jsdom, so the selectors, the unread/group detection, the composer
 * automation and the failure reporting are all exercised — no browser binary needed.
 *
 * What they cannot prove is that today's real WhatsApp Web still uses these selectors. That is what
 * the "Test" button in Settings → Auto-reply is for; see docs/TESTING.md.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startWhatsAppAutoReply } from '../../src/content/whatsappSend';
import type { AutoReplyJob } from '../../src/core/types';

interface Chat {
  title: string;
  unread?: number;
  group?: boolean;
}

interface Harness {
  dom: JSDOM;
  composerText(): string;
  openTitle(): string | null;
  sendClicks: number;
  /** Renders a chat row, as the windowed chat list does when it scrolls into view. */
  renderChat(chat: Chat, index?: number): void;
  /** Removes a chat row, as the windowed chat list does when it scrolls out of view. */
  unrenderChat(title: string): void;
  /** Titles currently rendered, top first. */
  rendered(): string[];
}

/** Builds one chat row shaped like WhatsApp's: avatar, title and (when unread) a badge. */
function buildRow(doc: Document, chat: Chat): HTMLElement {
  const row = doc.createElement('div');
  row.setAttribute('role', 'listitem');
  row.dataset.etChat = chat.title;
  const cell = doc.createElement('div');
  cell.setAttribute('role', 'gridcell');
  const avatar = doc.createElement('span');
  avatar.setAttribute('data-icon', chat.group ? 'default-group' : 'default-user');
  const title = doc.createElement('span');
  title.setAttribute('title', chat.title);
  title.textContent = chat.title;
  cell.append(avatar, title);
  if (chat.unread) {
    const badge = doc.createElement('span');
    badge.setAttribute('aria-label', `${chat.unread} unread messages`);
    badge.textContent = String(chat.unread);
    cell.append(badge);
  }
  row.append(cell);
  // Clicking a row opens that conversation, as WhatsApp does.
  row.addEventListener('click', () => {
    const header = doc.querySelector('#main header span[title]') as HTMLElement;
    header.setAttribute('title', chat.title);
    header.textContent = chat.title;
  });
  return row;
}

/** Builds a page shaped like WhatsApp Web: a chat list, an open conversation and a composer. */
function makeWhatsApp(chats: Chat[], open: string | null = null): Harness {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <div id="side">
        <header><button aria-label="Search…"><span data-icon="search"></span></button></header>
        <div contenteditable="true" data-tab="3"></div>
      </div>
      <div id="pane-side"><div role="grid"></div></div>
      <div id="main">
        <header><span title=""></span></header>
        <footer>
          <div contenteditable="true" data-tab="10"></div>
          <button aria-label="Send"><span data-icon="send"></span></button>
        </footer>
      </div>
    </body></html>`,
    { url: 'https://web.whatsapp.com/' },
  );
  const doc = dom.window.document;
  // jsdom has no layout engine, so scrolling is a no-op there.
  dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {};
  const grid = doc.querySelector('#pane-side [role="grid"]') as HTMLElement;

  for (const chat of chats) grid.append(buildRow(doc, chat));

  if (open) {
    const header = doc.querySelector('#main header span[title]') as HTMLElement;
    header.setAttribute('title', open);
    header.textContent = open;
  }

  const harness: Harness = {
    dom,
    composerText: () => (doc.querySelector('#main footer div[contenteditable]') as HTMLElement).textContent ?? '',
    openTitle: () => (doc.querySelector('#main header span[title]') as HTMLElement).getAttribute('title') || null,
    sendClicks: 0,
    renderChat(chat, index) {
      const row = buildRow(doc, chat);
      const at = index ?? grid.children.length;
      grid.insertBefore(row, grid.children[at] ?? null);
    },
    unrenderChat(title) {
      for (const child of Array.from(grid.children)) {
        if ((child as HTMLElement).dataset.etChat === title) child.remove();
      }
    },
    rendered: () => Array.from(grid.children).map((child) => (child as HTMLElement).dataset.etChat ?? ''),
  };

  const sendButton = doc.querySelector('#main footer button[aria-label="Send"]') as HTMLElement;
  sendButton.addEventListener('click', () => {
    harness.sendClicks += 1;
    (doc.querySelector('#main footer div[contenteditable]') as HTMLElement).textContent = '';
  });

  // jsdom has no execCommand: stand in for the one input path WhatsApp's editor reacts to.
  (doc as unknown as { execCommand: unknown }).execCommand = (_cmd: string, _ui: boolean, text?: string) => {
    const target = doc.activeElement as HTMLElement | null;
    if (!target || typeof text !== 'string') return false;
    target.textContent = (target.textContent ?? '') + text;
    return true;
  };

  return harness;
}

/** Globals a content script gets for free in a browser and needs spelled out under Node. */
const DOM_GLOBALS = ['KeyboardEvent', 'InputEvent', 'ClipboardEvent', 'Element', 'HTMLElement', 'Node', 'MutationObserver'] as const;

/** Installs the globals the content script expects, then returns a cleanup function. */
function useHarness(h: Harness): () => void {
  const g = globalThis as Record<string, unknown>;
  const previous: Record<string, unknown> = { window: g.window, document: g.document, chrome: g.chrome };
  for (const name of DOM_GLOBALS) previous[name] = g[name];

  g.window = h.dom.window;
  g.document = h.dom.window.document;
  for (const name of DOM_GLOBALS) {
    const value = (h.dom.window as unknown as Record<string, unknown>)[name];
    if (value !== undefined) g[name] = value;
  }
  g.chrome = { runtime: { onMessage: { addListener() {}, removeListener() {} } } };

  return () => {
    for (const [name, value] of Object.entries(previous)) g[name] = value;
    h.dom.window.close();
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the engine while the (windowed) chat list changes underneath it, and returns every unread
 * report in order. Each step runs after the previous one's scans have settled, so a step can add or
 * remove rows the way scrolling does.
 */
async function scanSeries(h: Harness, steps: Array<() => void>, settleMs = 80): Promise<string[][]> {
  const reports: string[][] = [];
  const restore = useHarness(h);
  const engine = startWhatsAppAutoReply({
    pollMs: 5,
    async requestJobs(unread) {
      reports.push(unread);
      return [];
    },
    async report() {},
    onSending: () => {},
    async onGiveUp() {},
  });
  try {
    // Let the baseline scan happen before anything changes.
    await wait(settleMs);
    for (const step of steps) {
      step();
      await wait(settleMs);
    }
  } finally {
    engine.stop();
    restore();
  }
  return reports;
}

function job(chat: string, message: string, id = 'j1'): AutoReplyJob {
  return { id, ruleId: 'r1', chat, message, trigger: 'incoming', createdAt: Date.now(), expiresAt: Date.now() + 60_000 };
}

interface Reports {
  unread: string[][];
  groups: string[][];
  sent: Array<{ chat: string; ok: boolean; error: string | null; text: string }>;
  gaveUp: string[];
}

/**
 * Runs the engine until `expect` sends have been reported (or it gives up), then stops it. A real
 * send walks the search fallback and waits for the composer to settle, so this is patient rather
 * than fixed-time.
 */
async function run(h: Harness, jobs: AutoReplyJob[], expect = jobs.length, maxWaitMs = 8000): Promise<Reports> {
  const reports: Reports = { unread: [], groups: [], sent: [], gaveUp: [] };
  const restore = useHarness(h);
  let served = false;
  const engine = startWhatsAppAutoReply({
    pollMs: 5,
    async requestJobs(unread, groups) {
      reports.unread.push(unread);
      reports.groups.push(groups);
      if (served) return [];
      served = true;
      return jobs;
    },
    async report(j, ok, error, text) {
      reports.sent.push({ chat: j.chat, ok, error, text });
    },
    onSending: () => {},
    async onGiveUp(reason) {
      reports.gaveUp.push(reason);
    },
  });
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    if (reports.gaveUp.length > 0 || reports.sent.length >= expect) break;
    await wait(25);
  }
  await wait(30);
  engine.stop();
  restore();
  return reports;
}

// ------------------------------------------------------------------ reading the page

test('the first scan is a baseline: existing unread messages are not answered, and groups are named', async () => {
  const h = makeWhatsApp([
    { title: 'Rahul', unread: 0 },
    { title: 'Priya', unread: 2 },
    { title: 'Progress Check', unread: 1, group: true },
  ]);
  const reports = await run(h, []);

  assert.deepEqual(reports.unread[0], [], 'a page reload does not answer yesterday’s unread messages');
  assert.deepEqual(reports.groups[0], ['Progress Check'], 'the group icon is recognised');
});

test('a chat that is already unread when the page loads is not answered, however near the top it sits', async () => {
  const h = makeWhatsApp([{ title: 'Rahul', unread: 0 }, { title: 'Priya', unread: 1 }]);
  // Priya is unread and inside the top rows, but this is the engine's very first sight of the page.
  const reports = await run(h, []);
  assert.deepEqual(reports.unread[0], [], 'the first scan only baselines, so a reload never answers a backlog');
});

test('a chat that gains an unread message while the page stays open is reported once', async () => {
  const h = makeWhatsApp([{ title: 'Rahul', unread: 0 }]);
  const reports: string[][] = [];
  const restore = useHarness(h);
  const engine = startWhatsAppAutoReply({
    pollMs: 5,
    async requestJobs(unread) {
      reports.push(unread);
      return [];
    },
    async report() {},
    onSending: () => {},
    async onGiveUp() {},
  });
  await wait(30);
  const badge = h.dom.window.document.createElement('span');
  badge.setAttribute('aria-label', '1 unread message');
  (h.dom.window.document.querySelector('[role="gridcell"]') as HTMLElement).append(badge);
  await wait(60);
  engine.stop();
  restore();

  const withUnread = reports.filter((r) => r.length > 0);
  assert.deepEqual(withUnread, [['Rahul']], 'reported on the scan that saw the badge, and not again afterwards');
});

// ------------------------------------------------------------------ the windowed chat list

test('a chat that was below the fold at the baseline is answered when a message floats it up', async () => {
  const h = makeWhatsApp([{ title: 'Rahul', unread: 0 }]);
  const reports = await scanSeries(h, [
    // Priya was never rendered while the baseline was taken, so she has no count to grow from: she
    // appears already holding her badge, which is exactly the case count-comparison alone misses.
    () => h.renderChat({ title: 'Priya', unread: 1 }, 0),
  ]);
  assert.deepEqual(
    reports.filter((r) => r.length > 0),
    [['Priya']],
    `a chat floated to the top with a badge is a new message (saw ${JSON.stringify(reports)})`,
  );
});

test('an old thread scrolled into view further down the list is not treated as a new message', async () => {
  const h = makeWhatsApp([
    { title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' },
    { title: 'E' }, { title: 'F' }, { title: 'G' }, { title: 'H' },
  ]);
  const reports = await scanSeries(h, [
    // Still holding yesterday's badge, and rendered well below the top rows.
    () => h.renderChat({ title: 'Old Thread', unread: 3 }, 7),
  ]);
  assert.deepEqual(
    reports.filter((r) => r.length > 0),
    [],
    `a chat further down is being scrolled into view, not just messaged (saw ${JSON.stringify(reports)})`,
  );
});

test('a chat that scrolls out of the rendered list and back is not answered again', async () => {
  const h = makeWhatsApp([{ title: 'Rahul', unread: 1 }]);
  const reports = await scanSeries(h, [
    () => h.unrenderChat('Rahul'),
    () => h.renderChat({ title: 'Rahul', unread: 1 }, 0),
  ]);
  assert.deepEqual(
    reports.filter((r) => r.length > 0),
    [],
    `the baseline survives the row being unrendered (saw ${JSON.stringify(reports)})`,
  );
});

test('a chat that gains messages while it is unrendered is answered when it comes back', async () => {
  const h = makeWhatsApp([{ title: 'Rahul', unread: 1 }]);
  const reports = await scanSeries(h, [
    () => h.unrenderChat('Rahul'),
    // Two more messages arrived while the row was not on screen.
    () => h.renderChat({ title: 'Rahul', unread: 3 }, 0),
  ]);
  assert.deepEqual(
    reports.filter((r) => r.length > 0),
    [['Rahul']],
    `the remembered count makes the growth visible (saw ${JSON.stringify(reports)})`,
  );
});

// ------------------------------------------------------------------ sending

test('a queued message is typed into the composer and sent, then the previous chat is restored', async () => {
  const h = makeWhatsApp([{ title: 'Rahul' }, { title: 'Progress Check' }], 'Progress Check');
  const reports = await run(h, [job('Rahul', 'I am Jarvis, messaging in place of Yash.')]);

  assert.equal(reports.sent.length, 1);
  assert.equal(reports.sent[0].ok, true, reports.sent[0].error ?? '');
  assert.equal(reports.sent[0].chat, 'Rahul');
  assert.equal(h.sendClicks, 1, 'the send button was pressed');
  assert.equal(h.composerText(), '', 'the composer is empty, so WhatsApp accepted the message');
  assert.equal(h.openTitle(), 'Progress Check', 'the conversation the user was reading is put back');
});

test('a chat that is not there fails cleanly, without touching the composer', async () => {
  const h = makeWhatsApp([{ title: 'Rahul' }], 'Rahul');
  const reports = await run(h, [job('Nobody By That Name', 'Hello?')]);

  assert.equal(reports.sent.length, 1);
  assert.equal(reports.sent[0].ok, false);
  assert.match(reports.sent[0].error ?? '', /No WhatsApp chat or group is named exactly "Nobody By That Name"/);
  assert.equal(h.sendClicks, 0, 'nothing was sent');
  assert.equal(h.composerText(), '', 'no half-typed message was left behind');
});

test('a composer that keeps the text is reported as not sent', async () => {
  const h = makeWhatsApp([{ title: 'Rahul' }], 'Rahul');
  // Break the send button so WhatsApp would keep the draft.
  const button = h.dom.window.document.querySelector('#main footer button[aria-label="Send"]') as HTMLElement;
  button.replaceWith(button.cloneNode(true));
  const reports = await run(h, [job('Rahul', 'Hello?')]);

  assert.equal(reports.sent.length, 1);
  assert.equal(reports.sent[0].ok, false);
  assert.match(reports.sent[0].error ?? '', /kept the text/);
});

test('a page with no chat list reports that WhatsApp is not logged in', async () => {
  const h = makeWhatsApp([{ title: 'Rahul' }]);
  (h.dom.window.document.querySelector('#pane-side') as HTMLElement).remove();
  const reports = await run(h, [job('Rahul', 'Hello?')]);
  assert.equal(reports.sent[0].ok, false);
  assert.match(reports.sent[0].error ?? '', /not logged in/);
  assert.deepEqual(reports.unread[0], [], 'an unread scan on a logged-out page reports nothing');
});

test('three failures in a row stop the tab instead of hammering WhatsApp', async () => {
  const h = makeWhatsApp([{ title: 'Rahul' }], 'Rahul');
  const button = h.dom.window.document.querySelector('#main footer button[aria-label="Send"]') as HTMLElement;
  button.replaceWith(button.cloneNode(true));

  const reports: string[] = [];
  const restore = useHarness(h);
  let count = 0;
  const engine = startWhatsAppAutoReply({
    pollMs: 5,
    async requestJobs() {
      count += 1;
      return [job('Rahul', 'Hello?', `j${count}`)];
    },
    async report() {},
    onSending: () => {},
    async onGiveUp(reason) {
      reports.push(reason);
    },
  });
  const startedAt = Date.now();
  while (reports.length === 0 && Date.now() - startedAt < 30_000) await wait(25);
  await wait(30);
  engine.stop();
  restore();

  assert.equal(reports.length, 1, 'it gives up once, with an explanation');
  assert.match(reports[0], /paused in this tab after 3 failed sends/);
  assert.ok(count <= 4, `it stopped after three failures (made ${count} attempts)`);
});
