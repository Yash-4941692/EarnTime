/**
 * WhatsApp Web Productive Mode. Only chats named on the user's list are visible. Titles are
 * compared exactly (after normalisation). If the layout cannot be read, the chat list is hidden and
 * the page reports itself unhealthy, so the time is not credited as productive.
 */

import { chatAllowed } from '../core/matchers';
import { coverCard, type Overlay } from './overlay';

const LIST_SELECTORS = ['#pane-side', '[aria-label="Chat list"]', 'div[role="grid"]'];
const ROW_SELECTORS = ['[role="listitem"]', 'div[role="row"]'];
const HEADER_TITLE_SELECTORS = ['#main header span[title]', '#main header [title]', 'header span[title]'];
const CONVERSATION_SELECTORS = ['#main'];

export interface WhatsAppOptions {
  chats: string[];
  overlay: Overlay;
  leave: () => void;
  onHealth: (ok: boolean) => void;
}

export interface WhatsAppFilter {
  stop(): void;
  healthy(): boolean;
}

function titleOf(row: HTMLElement): string | null {
  const titled = row.querySelector<HTMLElement>('span[title]');
  const title = titled?.getAttribute('title') ?? titled?.textContent ?? null;
  return title && title.trim() ? title : null;
}

function hide(node: HTMLElement): void {
  node.dataset.etHidden = '1';
  node.style.setProperty('display', 'none', 'important');
}

function show(node: HTMLElement): void {
  if (node.dataset.etHidden === '1') {
    node.dataset.etHidden = '';
    node.style.removeProperty('display');
  }
}

export function startWhatsAppFilter(opts: WhatsAppOptions): WhatsAppFilter {
  let healthy = true;
  let scheduled: number | null = null;
  const started = Date.now();
  let lastCover = '';

  const setHealthy = (next: boolean) => {
    if (next !== healthy) {
      healthy = next;
      opts.onHealth(healthy);
    }
  };

  /** Pauses calls and voice notes while a cover hides the conversation. */
  const pauseMedia = () => {
    for (const media of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
      if (!media.paused) media.pause();
    }
  };

  const showCover = (key: string, title: string, text: string) => {
    // A covered chat is not study time: it counts as unproductive until the cover is gone.
    setHealthy(false);
    pauseMedia();
    if (lastCover === key) return;
    lastCover = key;
    opts.overlay.set(
      coverCard({
        eyebrow: 'EarnTime · Productive Mode',
        title,
        text: `${text} This time counts as unproductive.`,
        actions: [{ label: 'Back', onClick: opts.leave, secondary: true }],
      }),
    );
  };

  const clearCover = () => {
    if (lastCover === '') return;
    lastCover = '';
    opts.overlay.set(null);
  };

  const scan = () => {
    scheduled = null;
    let list: HTMLElement | null = null;
    for (const selector of LIST_SELECTORS) {
      list = document.querySelector<HTMLElement>(selector);
      if (list) break;
    }
    const qrPage = Boolean(document.querySelector('canvas[aria-label="Scan me!"], [data-ref]'));
    // Until the layout is known, the grace period applies; afterwards a missing chat list is a failure.
    setHealthy(Boolean(list) || qrPage || Date.now() - started < 10_000);

    if (!list) {
      if (!qrPage && Date.now() - started >= 10_000) {
        showCover('layout', 'WhatsApp layout not recognised', 'EarnTime cannot verify the chat list, so nothing is shown. This time is counted as unproductive until WhatsApp loads correctly.');
      }
      return;
    }

    if (opts.chats.length === 0) {
      for (const selector of ROW_SELECTORS) {
        for (const row of list.querySelectorAll<HTMLElement>(selector)) hide(row);
      }
      showCover('empty', 'No chats are allowed yet', 'Add the exact chat names you need in EarnTime settings → WhatsApp. Until then, every chat is hidden in Productive Mode.');
      return;
    }

    for (const selector of ROW_SELECTORS) {
      for (const row of list.querySelectorAll<HTMLElement>(selector)) {
        if (chatAllowed(titleOf(row), opts.chats)) show(row);
        else hide(row);
      }
    }

    // An open conversation must also be on the list.
    let openTitle: string | null = null;
    for (const selector of HEADER_TITLE_SELECTORS) {
      const node = document.querySelector<HTMLElement>(selector);
      const value = node?.getAttribute('title') ?? node?.textContent ?? null;
      if (value && value.trim()) {
        openTitle = value;
        break;
      }
    }
    const main = document.querySelector<HTMLElement>(CONVERSATION_SELECTORS[0]);
    if (main && openTitle !== null && !chatAllowed(openTitle, opts.chats)) {
      showCover(`chat:${openTitle}`, 'Chat not on your list', `"${openTitle}" is not in your allowed WhatsApp chats, so it is closed in Productive Mode.`);
      return;
    }
    if (main && openTitle === null) {
      // A conversation pane with no readable title is treated as not allowed (fail closed).
      const hasMessages = Boolean(main.querySelector('[role="application"], [data-testid="conversation-panel-messages"]'));
      if (hasMessages) {
        showCover('unknown-chat', 'Chat name not recognised', 'EarnTime cannot read the name of this conversation, so it is closed in Productive Mode.');
        return;
      }
    }
    setHealthy(true);
    clearCover();
  };

  const schedule = () => {
    if (scheduled !== null) return;
    scheduled = window.setTimeout(scan, 300);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  const interval = window.setInterval(schedule, 3000);
  scan();

  return {
    stop() {
      observer.disconnect();
      window.clearInterval(interval);
    },
    healthy: () => healthy,
  };
}
