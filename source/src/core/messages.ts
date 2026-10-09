/** Message protocol between content scripts, UI pages and the service worker. */

import type { Command } from './commands';
import type { PageDirective } from './directive';
import type { HalfMode, RuleErrorCode, UnlockQuote } from './types';

export type PageMessage =
  | { type: 'page.init'; url: string }
  | { type: 'page.choose'; url: string; mode: HalfMode }
  | { type: 'page.health'; ok: boolean; detail?: string };

export type UiMessage =
  | { type: 'ui.command'; command: Command }
  | { type: 'ui.export' }
  | { type: 'ui.reconcileNow' }
  | { type: 'ui.tick' }
  /**
   * Asks the worker to request (or give up) the optional screen-time permission. It has to go
   * through the worker so that the recorded state and what Chrome actually granted can never
   * disagree; the user gesture that allows the prompt is the click in the page that sent it.
   */
  | { type: 'ui.screenTimeAccess'; grant: boolean };

export type Incoming = PageMessage | UiMessage;

export interface ReplyError {
  code: RuleErrorCode | 'unknown' | 'unavailable';
  message: string;
  needMs?: number;
  /** Price of a change the user still has to accept before it is charged. */
  quote?: UnlockQuote;
}

export type Reply =
  | {
      ok: true;
      directive?: PageDirective;
      data?: unknown;
      /**
       * The tab the worker saw the message come from. A content script needs its own tab id to look
       * up its half-productive session in persisted state while the page is still loading, and it
       * has no other way to know it.
       */
      tabId?: number | null;
    }
  | { ok: false; error: ReplyError };

export function isPageMessage(value: unknown): value is PageMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return type === 'page.init' || type === 'page.choose' || type === 'page.health';
}

export function isUiMessage(value: unknown): value is UiMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return (
    type === 'ui.command' ||
    type === 'ui.export' ||
    type === 'ui.reconcileNow' ||
    type === 'ui.tick' ||
    type === 'ui.screenTimeAccess'
  );
}
