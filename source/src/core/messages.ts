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
  | { type: 'ui.reconcileNow' };

export type Incoming = PageMessage | UiMessage;

export interface ReplyError {
  code: RuleErrorCode | 'unknown' | 'unavailable';
  message: string;
  needMs?: number;
  /** Price of a change the user still has to accept before it is charged. */
  quote?: UnlockQuote;
}

export type Reply =
  | { ok: true; directive?: PageDirective; data?: unknown }
  | { ok: false; error: ReplyError };

export function isPageMessage(value: unknown): value is PageMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return type === 'page.init' || type === 'page.choose' || type === 'page.health';
}

export function isUiMessage(value: unknown): value is UiMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return type === 'ui.command' || type === 'ui.export' || type === 'ui.reconcileNow';
}
