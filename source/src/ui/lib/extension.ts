/** Thin bridge between React pages and the service worker, plus live state subscription. */

import { useEffect, useState } from 'react';
import { SCREEN_TIME_PERMISSION, STATE_KEY } from '../../core/constants';
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

/**
 * Asks the service worker for a time checkpoint roughly once per second while the caller is mounted.
 *
 * Two things depend on it:
 *  - The stored state (balance, today's totals, live role) advances in real time, so the numbers tick
 *    once per second instead of freezing between 30-second alarm ticks.
 *  - The beat tells the worker that an EarnTime page is open. Chrome gives OS focus to the popup, so
 *    the browser window behind it reports "not focused", and without this the worker treated opening
 *    the popup as walking away: counting paused, the role fell to "Paused", and the balance only
 *    moved after the popup was closed and reopened. With it, the timer keeps running in front of you.
 *
 * The first beat is sent immediately rather than after the first interval, so the very first render
 * after opening is already live.
 */
export function useLiveTick(intervalMs = 1000): void {
  useEffect(() => {
    let alive = true;
    const ask = () => {
      if (!alive) return;
      try {
        void Promise.resolve(chrome.runtime.sendMessage({ type: 'ui.tick' })).catch(() => undefined);
      } catch {
        // Extension context gone: nothing to tick.
      }
    };
    ask();
    const id = window.setInterval(ask, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);
}

/** Whether Chrome currently grants the optional screen-time (history) permission. */
export async function screenTimeAccess(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ permissions: [SCREEN_TIME_PERMISSION] });
  } catch {
    return false;
  }
}

/**
 * Asks the user for screen-time access, or gives it up. It has to be called from the click itself:
 * Chrome only shows an optional-permission prompt while a user gesture is in flight. The worker asks
 * Chrome and then records the answer, so the state can never claim an access the profile does not
 * have. Returns the granted state, or null when EarnTime did not respond.
 */
export async function setScreenTimeAccess(grant: boolean): Promise<boolean | null> {
  try {
    const reply = (await chrome.runtime.sendMessage({ type: 'ui.screenTimeAccess', grant })) as Reply | undefined;
    if (!reply || !reply.ok) return null;
    const data = reply.data as { granted?: boolean } | undefined;
    return data?.granted === true;
  } catch {
    return null;
  }
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
