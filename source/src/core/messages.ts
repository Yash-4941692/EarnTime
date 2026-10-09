/** Message protocol between content scripts, UI pages and the service worker. */

import type { Command } from './commands';
import type { PageDirective } from './directive';
import type { AutoReplyJob, HalfMode, RuleErrorCode } from './types';

export type PageMessage =
  | { type: 'page.init'; url: string }
  | { type: 'page.choose'; url: string; mode: HalfMode }
  | { type: 'page.health'; ok: boolean; detail?: string }
  /**
   * WhatsApp Web tab asking for auto-replies to send. `unread` lists the chats that just received a
   * message; `groups` lists the chats the page identified as groups, so fallback rules stay away
   * from them.
   */
  | { type: 'wa.poll'; unread: string[]; groups?: string[] }
  /** WhatsApp Web tab reporting the outcome of one send. */
  | { type: 'wa.result'; jobId: string; chat: string; ruleId: string; ok: boolean; text?: string; error?: string };

/**
 * Service worker → content script. Background tabs have their timers throttled to roughly once a
 * minute, so the worker nudges WhatsApp Web tabs itself instead of waiting for their own clock.
 */
export type WorkerToPageMessage = { type: 'wa.push' };

export type UiMessage =
  | { type: 'ui.command'; command: Command }
  | { type: 'ui.export' }
  | { type: 'ui.reconcileNow' };

export type Incoming = PageMessage | UiMessage;

export interface ReplyError {
  code: RuleErrorCode | 'unknown' | 'unavailable';
  message: string;
  needMs?: number;
}

export type Reply =
  | { ok: true; directive?: PageDirective; data?: unknown; jobs?: AutoReplyJob[] }
  | { ok: false; error: ReplyError };

export function isPageMessage(value: unknown): value is PageMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return type === 'page.init' || type === 'page.choose' || type === 'page.health' || type === 'wa.poll' || type === 'wa.result';
}

export function isUiMessage(value: unknown): value is UiMessage {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return type === 'ui.command' || type === 'ui.export' || type === 'ui.reconcileNow';
}
