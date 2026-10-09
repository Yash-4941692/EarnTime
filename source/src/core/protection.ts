/**
 * Protection rules. After setup, any change that makes usage easier costs screen time ("unlock cost").
 * Tightening changes are always free. Nothing here is a hard lock: it is a cost model the
 * extension can enforce inside its own UI and storage. See the limitations report for what Chrome
 * does and does not let an extension protect.
 */

import { MINUTE_MS } from './constants';
import type { EarnState, ListName, RuleResult } from './types';
import { addLedger } from './wallet';

type Place = ListName | 'neutral';

const RANK: Record<Place, number> = { neutral: -1, unproductive: 0, half: 1, productive: 2 };

/**
 * True when moving a host from `from` to `to` lifts a restriction EarnTime was already enforcing.
 * `neutral` means the host is not on any list.
 *
 * A host that is on no list is **not restricted at all**: it opens freely and simply is not tracked.
 * Putting such a host on a list can therefore only ever add tracking — it never makes a site that
 * EarnTime was holding back easier to reach. Adding a site is free on every list, including
 * Productive, so the lists can be filled in without paying for each entry.
 *
 * A cost applies only when an existing restriction is lifted:
 *  - Removing a half-productive or unproductive site (it becomes untracked, so always open).
 *  - Moving a site up the rank order (unproductive < half < productive).
 * Removing a productive site, and every downward move, is stricter and free.
 */
export function siteChangeLoosens(from: Place, to: Place): boolean {
  if (from === to) return false;
  if (from === 'neutral') return false;
  if (to === 'neutral') return from === 'half' || from === 'unproductive';
  return RANK[to] > RANK[from];
}

/**
 * True when editing the YouTube keyword or WhatsApp chat lists lifts a restriction.
 *
 * These lists never control access to a site: YouTube and WhatsApp Web stay reachable either way
 * (they are half-productive, so the mode prompt is what gates them). A keyword only decides which
 * channels count as study inside a Productive Mode the user already chose, and a chat only decides
 * which conversations stay visible there. Editing them is therefore always free.
 */
export function filterListLoosens(): boolean {
  return false;
}

/** True when the ratio change gives more screen time per productive minute. */
export function ratioLoosens(
  oldFrom: number,
  oldTo: number,
  newFrom: number,
  newTo: number,
): boolean {
  return newTo / newFrom > oldTo / oldFrom + 1e-9;
}

export interface PayUnlockOptions {
  /**
   * Human-readable description of the change, shown when asking the user to confirm. Falls back to
   * `reason`, which is written to the ledger and is terser.
   */
  label?: string;
  /**
   * False when the user has not confirmed the change yet. The cost is then only quoted: nothing is
   * charged, nothing is mutated, and the caller is told the price so it can ask first. A loosening
   * change is never charged on the click that requested it.
   */
  confirmed?: boolean;
}

/**
 * Pays an unlock cost from the balance. Never creates debt, and refuses while in debt mode.
 * Before setup is complete nothing is charged.
 *
 * A change that costs screen time is charged only once the user has confirmed it: with
 * `confirmed: false` this quotes the price and returns a `confirm` failure instead of paying. The
 * balance and debt checks run first, so the user is asked to confirm a change that is actually
 * payable rather than one that would be refused anyway.
 */
export function payUnlock(
  state: EarnState,
  minutes: number,
  now: number,
  reason: string,
  options: PayUnlockOptions = {},
): RuleResult {
  if (!state.setupDone || minutes <= 0) return { ok: true };
  if (state.debtMs > 0) {
    return {
      ok: false,
      code: 'debt',
      message: 'Rules cannot be loosened while EarnTime is in debt mode. Repay the debt by studying first.',
    };
  }
  const costMs = minutes * MINUTE_MS;
  if (state.balanceMs < costMs) {
    return {
      ok: false,
      code: 'insufficient',
      needMs: costMs,
      message: `This change costs ${minutes} min of screen time, and you have ${Math.floor(state.balanceMs / MINUTE_MS)} min.`,
    };
  }
  if (options.confirmed === false) {
    const balanceMin = Math.floor(state.balanceMs / MINUTE_MS);
    const label = options.label ?? reason;
    return {
      ok: false,
      code: 'confirm',
      message: `${label} costs ${minutes} min of your screen-time balance (you have ${balanceMin} min).`,
      quote: { minutes, balanceMin, reason, label },
    };
  }
  state.balanceMs -= costMs;
  addLedger(state, 'unlock', now, costMs, `Unlock cost: ${reason}`);
  return { ok: true };
}
