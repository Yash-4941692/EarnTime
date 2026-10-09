/**
 * WhatsApp Web automation for auto-replies.
 *
 * This is the only place in EarnTime that drives another site's interface, and it is deliberately
 * narrow: read chat titles, unread badges and group icons, open a chat, type into the composer,
 * press send. WhatsApp Web has no extension API, so every selector here is a guess about its current
 * layout. Each step therefore fails loudly and reports why, instead of half-sending: if the chat
 * cannot be opened, the box cannot be typed into, or the text is still in the box afterwards, the
 * attempt is reported as failed and logged in Settings → Auto-reply.
 *
 * Three rails keep this from hammering WhatsApp:
 *  - at most a few messages per cycle, with a pause between them;
 *  - after three failures in a row the tab stops trying until WhatsApp is reloaded;
 *  - nothing at all happens unless the page is logged in and the chat list is on screen.
 *
 * Chrome throttles timers in a background tab to roughly once a minute, so the service worker also
 * pushes a `wa.push` nudge on every 30-second tick and the moment a task is ticked off. That is what
 * makes delivery work while WhatsApp sits in an unfocused tab.
 */

import { normalizeName } from '../core/matchers';
import type { AutoReplyJob } from '../core/types';

const LIST_SELECTORS = ['#pane-side', '[aria-label="Chat list"]', 'div[role="grid"]'];
const ROW_SELECTORS = '[role="listitem"], div[role="row"]';
const TITLE_SELECTORS = ['#main header span[title]', '#main header [title]', 'header span[title]'];
const SEARCH_BUTTON_SELECTORS = ['#side [data-icon="search"]', '#side button[aria-label*="Search" i]', 'header [data-icon="search"]'];
const SEARCH_INPUT_SELECTORS = ['#side div[contenteditable="true"][data-tab]', '#side div[contenteditable="true"]', '#side input[type="text"]'];
const COMPOSER_SELECTORS = ['#main footer div[contenteditable="true"][data-tab]', '#main footer div[contenteditable="true"]', '#main div[contenteditable="true"][data-tab]'];

/** Pause between two sends in the same cycle, so WhatsApp never sees a burst of automation. */
const SEND_GAP_MS = 1200;
/** Consecutive failed sends after which this tab gives up until WhatsApp is reloaded. */
const MAX_CONSECUTIVE_FAILURES = 3;
/**
 * How far down the chat list a conversation may sit and still count as "just messaged you" when the
 * previous scan could not see it.
 *
 * WhatsApp renders only the visible slice of a long chat list, so a chat that messages you from
 * below the fold first appears **already holding its badge** — there is no earlier count for it to
 * grow from, and comparing counts alone silences it for good. What makes the top rows safe to trust
 * is that WhatsApp floats a conversation to the top when a message arrives: a chat that appears
 * unread in the top rows got there because it just received something. A chat further down is an old
 * thread being scrolled back into view, which must not fire.
 */
const NEW_CHAT_ROW_WINDOW = 6;
/** Cap on the remembered baseline, so a long-lived tab with a big chat list cannot grow without bound. */
const MAX_TRACKED_CHATS = 300;

export interface WhatsAppAutoReplyOptions {
  /** Asks the service worker what to send, reporting new messages and the groups it could identify. */
  requestJobs(unread: string[], groups: string[]): Promise<AutoReplyJob[]>;
  /** Tells the service worker how a send went, so it appears in the activity log. */
  report(job: AutoReplyJob, ok: boolean, error: string | null, text: string): Promise<void>;
  /** Notified while a send is in flight, so the Productive Mode filter stands aside. */
  onSending(active: boolean): void;
  /** Called once when this tab stops trying after repeated failures. */
  onGiveUp(reason: string): Promise<void>;
  pollMs?: number;
}

export interface WhatsAppAutoReply {
  stop(): void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitFor<T>(probe: () => T | null, timeoutMs: number, stepMs = 150): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() >= deadline) return null;
    await wait(stepMs);
  }
}

function chatList(): HTMLElement | null {
  for (const selector of LIST_SELECTORS) {
    const list = document.querySelector<HTMLElement>(selector);
    if (list) return list;
  }
  return null;
}

function rows(): HTMLElement[] {
  const list = chatList();
  if (!list) return [];
  return Array.from(list.querySelectorAll<HTMLElement>(ROW_SELECTORS));
}

function titleOfRow(row: HTMLElement): string | null {
  const titled = row.querySelector<HTMLElement>('span[title]');
  const value = titled?.getAttribute('title') ?? titled?.textContent ?? null;
  return value && value.trim() ? value.trim() : null;
}

/** Unread badge count for a row, or 0 when the row shows no unread messages. */
function unreadOf(row: HTMLElement): number {
  const badge = row.querySelector<HTMLElement>('[aria-label*="unread" i]');
  if (!badge) return 0;
  const digits = (badge.getAttribute('aria-label') ?? '').match(/\d+/);
  if (digits) return Number(digits[0]);
  const text = (badge.textContent ?? '').trim();
  return /^\d+$/.test(text) ? Number(text) : 1;
}

/**
 * Best-effort group detection. WhatsApp marks a group avatar with a `group` icon; a group that has
 * its own photo gives no such marker, so this is only a second signal. The authoritative list is the
 * one the user keeps in Settings → Auto-reply, and a chat that neither identifies is treated as a
 * group by the fallback rules, so an unknown chat is skipped rather than messaged.
 */
function looksLikeGroup(row: HTMLElement): boolean {
  return Boolean(row.querySelector('[data-icon*="group" i]'));
}

function openChatTitle(): string | null {
  for (const selector of TITLE_SELECTORS) {
    const node = document.querySelector<HTMLElement>(selector);
    const value = node?.getAttribute('title') ?? node?.textContent ?? null;
    if (value && value.trim()) return value.trim();
  }
  return null;
}

function composer(): HTMLElement | null {
  for (const selector of COMPOSER_SELECTORS) {
    const found = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (found.length > 0) return found[found.length - 1];
  }
  return null;
}

function sendButton(): HTMLElement | null {
  const labelled = document.querySelector<HTMLElement>('#main footer [aria-label="Send"], #main footer [aria-label*="Send" i]');
  if (labelled) return labelled.closest('button') ?? labelled;
  const icons = Array.from(document.querySelectorAll<HTMLElement>('#main footer [data-icon]'));
  const icon = icons.find((node) => /send/i.test(node.getAttribute('data-icon') ?? ''));
  if (icon) return icon.closest('button') ?? icon;
  return null;
}

/**
 * Puts `text` into a contenteditable box. `execCommand` is deprecated but is the one input path
 * WhatsApp's editor reliably reacts to; the synthetic paste/input events are fallbacks.
 */
function insertText(target: HTMLElement, text: string): boolean {
  target.focus();
  const before = target.textContent ?? '';
  try {
    document.execCommand('insertText', false, text);
  } catch {
    // Older engines: fall through to the synthetic events below.
  }
  if ((target.textContent ?? '') !== before) return true;
  try {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', text);
    target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  } catch {
    // DataTransfer is unavailable: fall through.
  }
  if ((target.textContent ?? '') !== before) return true;
  target.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true, cancelable: true }));
  target.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
  return (target.textContent ?? '') !== before;
}

function pressEnter(target: HTMLElement): void {
  const init = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
  target.dispatchEvent(new KeyboardEvent('keydown', init));
  target.dispatchEvent(new KeyboardEvent('keypress', init));
  target.dispatchEvent(new KeyboardEvent('keyup', init));
}

/** Clicks the chat row with this exact title. Returns false when the chat is not in the list. */
function clickChatRow(title: string): boolean {
  const key = normalizeName(title);
  for (const row of rows()) {
    const value = titleOfRow(row);
    if (!value || normalizeName(value) !== key) continue;
    // Optional chaining: a page that lacks the helper must still open the chat, not throw.
    row.scrollIntoView?.({ block: 'center' });
    const clickable = row.querySelector<HTMLElement>('[role="gridcell"], [role="button"], div[tabindex]') ?? row;
    clickable.click();
    return true;
  }
  return false;
}

async function waitForOpenChat(title: string, timeoutMs: number): Promise<boolean> {
  const key = normalizeName(title);
  const found = await waitFor(() => {
    const current = openChatTitle();
    return current && normalizeName(current) === key ? current : null;
  }, timeoutMs);
  return found !== null;
}

/** Opens the chat, using WhatsApp's own search when it is not in the visible list. */
async function openChat(title: string): Promise<string | null> {
  if (clickChatRow(title)) {
    return (await waitForOpenChat(title, 5000)) ? null : `WhatsApp opened something else instead of "${title}"`;
  }

  const search = document.querySelector<HTMLElement>(SEARCH_BUTTON_SELECTORS.join(', '));
  if (!search) return `"${title}" is not in the chat list and WhatsApp's search button was not found`;
  search.click();

  const box = await waitFor(() => {
    for (const selector of SEARCH_INPUT_SELECTORS) {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) return found;
    }
    return null;
  }, 3000);
  if (!box) return `"${title}" is not in the chat list and WhatsApp's search box was not found`;
  if (!insertText(box, title)) return `Could not type "${title}" into WhatsApp search`;
  await wait(900);

  const clicked = clickChatRow(title);
  // Leave the search field either way, so the normal chat list comes back.
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
  if (!clicked) return `No WhatsApp chat or group is named exactly "${title}"`;
  return (await waitForOpenChat(title, 5000)) ? null : `WhatsApp opened something else instead of "${title}"`;
}

/** Opens `chat`, types `text` and sends it. Returns null on success, or the reason it failed. */
async function sendTo(chat: string, text: string): Promise<string | null> {
  if (!chatList()) return 'WhatsApp Web is not logged in yet (no chat list on the page)';
  const previous = openChatTitle();
  const opened = await openChat(chat);
  if (opened) return opened;

  const box = await waitFor(composer, 5000);
  if (!box) return `"${chat}" has no message box (it may be blocked, archived or read-only)`;
  if (!insertText(box, text)) return `Could not type into the message box for "${chat}"`;
  await wait(300);

  const button = sendButton();
  if (button) button.click();
  else pressEnter(box);

  const cleared = await waitFor(() => {
    const current = composer();
    return current && (current.textContent ?? '').trim() === '' ? true : null;
  }, 4000, 200);
  if (!cleared) return `WhatsApp kept the text for "${chat}" in the box, so it was not sent`;

  // Put the conversation the user was reading back on screen.
  if (previous && normalizeName(previous) !== normalizeName(chat)) await openChat(previous);
  return null;
}

export function startWhatsAppAutoReply(opts: WhatsAppAutoReplyOptions): WhatsAppAutoReply {
  const pollMs = opts.pollMs ?? 2500;
  /** Last unread count seen per chat title. A chat is only reported when its count grows. */
  let seen = new Map<string, number>();
  let busy = false;
  let stopped = false;
  let failures = 0;
  let timer: number | null = null;

  /**
   * Chat titles that gained an unread message since the previous scan.
   *
   * The obvious rule — report a chat whose count grew — misses every chat the previous scan could
   * not see, because the windowed chat list had not rendered it yet. Such a chat appears already
   * holding its badge and never grows from anything. Those are handled by position instead: a chat
   * no previous scan has seen counts when it sits in the top `NEW_CHAT_ROW_WINDOW` rows, where
   * WhatsApp floats a conversation that just received a message.
   *
   * Two guards keep that from firing on the wrong things:
   *  - nothing counts until a baseline exists, so a reload does not answer yesterday's backlog;
   *  - a chat further down does not count, so scrolling an old thread into view stays silent.
   */
  const takeUnread = (): string[] => {
    const next = new Map<string, number>();
    const arrived: string[] = [];
    const list = rows();
    for (let index = 0; index < list.length; index += 1) {
      const row = list[index];
      const title = titleOfRow(row);
      if (!title) continue;
      const count = unreadOf(row);
      const previous = seen.get(title);
      next.set(title, Math.max(count, next.get(title) ?? 0));
      if (count === 0) continue;
      if (previous === undefined) {
        // Never scanned before: either this is the first scan of a freshly loaded page, where every
        // badge predates EarnTime, or a chat the list had not rendered has just been floated up.
        if (seen.size > 0 && index < NEW_CHAT_ROW_WINDOW) arrived.push(title);
        continue;
      }
      if (count > previous) arrived.push(title);
    }
    // Remember the counts of chats the list is not rendering right now. Without this, scrolling a
    // chat out of view and back would present it as unseen and answer it a second time.
    let retained = Math.max(0, MAX_TRACKED_CHATS - next.size);
    for (const [title, count] of seen) {
      if (next.has(title) || retained === 0) continue;
      retained -= 1;
      next.set(title, count);
    }
    seen = next;
    return arrived;
  };

  /** Titles of the chats this page can identify as groups, so fallback rules avoid them. */
  const detectGroups = (): string[] => {
    const found: string[] = [];
    for (const row of rows()) {
      const title = titleOfRow(row);
      if (title && looksLikeGroup(row)) found.push(title);
    }
    return found;
  };

  const runSend = async (job: AutoReplyJob): Promise<void> => {
    opts.onSending(true);
    try {
      const error = await sendTo(job.chat, job.message);
      if (error === null) failures = 0;
      else failures += 1;
      await opts.report(job, error === null, error, job.message);
    } catch (err) {
      failures += 1;
      await opts.report(job, false, err instanceof Error ? err.message : 'unexpected error', job.message);
    } finally {
      opts.onSending(false);
    }
  };

  const giveUp = async (): Promise<void> => {
    stop();
    await opts.onGiveUp(
      `Auto-reply paused in this tab after ${MAX_CONSECUTIVE_FAILURES} failed sends. WhatsApp's layout may have changed. Reload WhatsApp Web to try again.`,
    );
  };

  const cycle = async (): Promise<void> => {
    if (busy || stopped) return;
    busy = true;
    try {
      const loggedIn = chatList() !== null;
      const unread = loggedIn ? takeUnread() : [];
      const groups = loggedIn ? detectGroups() : [];
      const jobs = await opts.requestJobs(unread, groups);
      for (const job of jobs) {
        if (stopped) break;
        await runSend(job);
        if (failures >= MAX_CONSECUTIVE_FAILURES) {
          await giveUp();
          break;
        }
        await wait(SEND_GAP_MS);
      }
    } catch {
      // The worker is restarting or the page is going away; the next poll tries again.
    } finally {
      busy = false;
    }
  };

  const nudge = (): void => {
    void cycle();
  };

  const schedule = (): void => {
    if (stopped || timer !== null) return;
    timer = window.setTimeout(() => {
      timer = null;
      void cycle().finally(schedule);
    }, pollMs);
  };

  // The worker nudges this tab on every tick and the moment a task is ticked off, because Chrome
  // throttles the timer above to about once a minute in an unfocused tab.
  const onWorkerMessage = (message: unknown): void => {
    if (message && typeof message === 'object' && (message as { type?: string }).type === 'wa.push') nudge();
  };
  try {
    chrome.runtime.onMessage.addListener(onWorkerMessage);
  } catch {
    // No runtime (a plain page context): the tab's own timer still runs.
  }

  schedule();

  function stop(): void {
    stopped = true;
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    try {
      chrome.runtime.onMessage.removeListener(onWorkerMessage);
    } catch {
      // Already detached.
    }
  }

  return { stop };
}
