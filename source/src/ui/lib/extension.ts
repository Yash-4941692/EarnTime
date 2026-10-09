/** Thin bridge between React pages and the service worker, plus live state subscription. */

import { useEffect, useState } from 'react';
import { STATE_KEY } from '../../core/constants';
import type { Command } from '../../core/commands';
import type { Reply } from '../../core/messages';
import type { EarnState, UnlockQuote } from '../../core/types';

export interface CommandResult {
  ok: boolean;
  data?: unknown;
  message?: string;
  needMs?: number;
  /** Present when the change costs screen time and has not been confirmed yet. */
  quote?: UnlockQuote;
}

/** Sends a user command to the service worker and normalises the reply for the UI. */
export async function runCommand(command: Command): Promise<CommandResult> {
  try {
    const reply = (await chrome.runtime.sendMessage({ type: 'ui.command', command })) as Reply | undefined;
    if (!reply) return { ok: false, message: 'EarnTime is not responding. Try again in a moment.' };
    if (reply.ok) return { ok: true, data: reply.data };
    return { ok: false, message: reply.error.message, needMs: reply.error.needMs, quote: reply.error.quote };
  } catch {
    return { ok: false, message: 'EarnTime is not responding. Try again in a moment.' };
  }
}

export async function exportAudit(): Promise<Record<string, unknown> | null> {
  const reply = (await chrome.runtime.sendMessage({ type: 'ui.export' })) as Reply | undefined;
  return reply && reply.ok ? (reply.data as Record<string, unknown>) : null;
}

/** Reads the stored state and re-renders whenever the service worker writes a new one. */
export function useStoredState(): EarnState | null {
  const [state, setState] = useState<EarnState | null>(null);
  useEffect(() => {
    let alive = true;
    void chrome.storage.local.get(STATE_KEY).then((values) => {
      if (alive) setState((values[STATE_KEY] as EarnState | undefined) ?? null);
    });
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local' || !(STATE_KEY in changes)) return;
      setState((changes[STATE_KEY].newValue as EarnState | undefined) ?? null);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);
  return state;
}

/** Current time, refreshed every `intervalMs` (used for live balances). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function openExtensionPage(path: string): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(path) });
}

export async function incognitoAllowed(): Promise<boolean> {
  try {
    return await chrome.extension.isAllowedIncognitoAccess();
  } catch {
    return false;
  }
}
