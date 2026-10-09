/**
 * Live accounting. The controller takes a checkpoint (an Observation) on every alarm tick and
 * browser event. The interval since the previous checkpoint is charged to the role that was in
 * effect during that interval, then the new observation becomes the reference.
 *
 * All arithmetic is in integer milliseconds (credits are rounded once per slice).
 */

import { IDLE_DETECTION_MS, RECONCILE_GAP_MS } from './constants';
import { dayKey, splitByLocalDay } from './time';
import { countsForAccounting, roleOf } from './roles';
import { addLedger, addScreenTime, creditEarned, incurDebt, spendFromBalance, statsFor, pruneDays } from './wallet';
import type { EarnState, LiveStatus, Observation, Role, Snapshot } from './types';

export type AdvanceResult =
  | { kind: 'ok' }
  | { kind: 'reconcile'; from: number; to: number }
  | { kind: 'clock-back'; backwardMs: number; chargedMs: number };

export interface SliceResult {
  creditMs: number;
  chargedMs: number;
  debtAddedMs: number;
  repaidMs: number;
}

export const ZERO_SLICE: SliceResult = { creditMs: 0, chargedMs: 0, debtAddedMs: 0, repaidMs: 0 };

export function makeSnapshot(state: EarnState, obs: Observation): Snapshot {
  return { ...obs, role: roleOf(state, obs) };
}

export function setLast(state: EarnState, snap: Snapshot): void {
  state.last = snap;
  state.lastAt = snap.at;
}

/** Screen-time credit for `ms` of productive time under the current ratio. */
export function creditFor(state: EarnState, ms: number): number {
  return Math.round((ms * state.settings.earnToMin) / state.settings.earnFromMin);
}

/**
 * Charges one slice that lies within a single local day.
 * mode 'live': spending is capped at the balance (no debt).
 * mode 'gap' : spending beyond the balance becomes debt (reconciliation only).
 */
function chargeSlice(
  state: EarnState,
  role: Role,
  from: number,
  to: number,
  mode: 'live' | 'gap',
  observedHost?: string | null,
): SliceResult {
  const ms = to - from;
  if (ms <= 0) return { ...ZERO_SLICE };
  // Screen time is recorded before the billing rules are applied, so a day's per-site breakdown also
  // covers the sites EarnTime does not charge for. Time reconstructed from history after an
  // interruption is marked as estimated: it is capped per visit and cannot be exact.
  //
  // "Not at the screen" is not screen time: a background window, an idle user and a locked screen
  // are excluded, exactly as they are excluded from billing. A page that is in front of the user but
  // not classifiable (an internal page, a half-productive site with no mode chosen yet, content
  // closed by the YouTube filter) IS screen time — that is the honest answer to "where did the day
  // go", and it is why this number can be larger than the time EarnTime charged.
  const away = role.k === 'none' && (role.why === 'background' || role.why === 'idle' || role.why === 'locked');
  const screenHost = 'host' in role && role.host ? role.host : (observedHost ?? null);
  if (screenHost && !away) addScreenTime(state, dayKey(from), screenHost, ms, mode === 'gap');
  if (role.k === 'none' || role.k === 'neutral') return { ...ZERO_SLICE };
  const at = to;
  const stats = statsFor(state, dayKey(from));
  const mergeable = mode === 'live';

  const earn = (host: string | null): SliceResult => {
    const credit = creditFor(state, ms);
    const { repaidMs } = creditEarned(state, credit, at, 'study time', host ?? undefined);
    stats.earnedMs += credit;
    stats.repaidMs += repaidMs;
    addLedger(state, 'earn', at, credit, 'Productive time credited', host ?? undefined, mergeable);
    return { creditMs: credit, chargedMs: 0, debtAddedMs: 0, repaidMs };
  };

  const spend = (host: string | null, note: string): SliceResult => {
    const fromBalance = spendFromBalance(state, ms);
    const debtAdd = mode === 'gap' ? ms - fromBalance : 0;
    // The balance runs out first; debt starts at that moment, not at the end of the slice.
    if (debtAdd > 0) incurDebt(state, debtAdd, from + fromBalance, `${note} (${host ?? 'unknown'})`);
    const charged = fromBalance + debtAdd;
    stats.usedMs += charged;
    if (charged > 0) addLedger(state, 'spend', at, charged, note, host ?? undefined, mergeable);
    return { creditMs: 0, chargedMs: charged, debtAddedMs: debtAdd, repaidMs: 0 };
  };

  switch (role.k) {
    case 'productive':
      stats.prodMs += ms;
      return earn(role.host);
    case 'half': {
      if (role.mode === 'productive' && !role.degraded) {
        stats.halfProdMs += ms;
        return earn(role.host);
      }
      const note = role.degraded ? 'Filter unavailable, counted as unproductive' : 'Half-productive site, Unproductive Mode';
      const result = spend(role.host, note);
      stats.halfUnprodMs += result.chargedMs;
      return result;
    }
    case 'unproductive': {
      const result = spend(role.host, 'Unproductive site');
      stats.unprodMs += result.chargedMs;
      return result;
    }
  }
}

/** Charges [from, to) to a role, splitting at local midnights. */
export function chargeInterval(
  state: EarnState,
  role: Role,
  from: number,
  to: number,
  mode: 'live' | 'gap',
  observedHost?: string | null,
): SliceResult {
  const total: SliceResult = { ...ZERO_SLICE };
  if (to <= from) return total;
  for (const slice of splitByLocalDay(from, to)) {
    const part = chargeSlice(state, role, slice.from, slice.to, mode, observedHost);
    total.creditMs += part.creditMs;
    total.chargedMs += part.chargedMs;
    total.debtAddedMs += part.debtAddedMs;
    total.repaidMs += part.repaidMs;
  }
  return total;
}

/**
 * Advances accounting to `obs.at`. Returns 'reconcile' (without changing state) when the gap since
 * the last checkpoint is too long to trust; the controller then plans history reconciliation.
 *
 * monoDeltaMs: elapsed time measured with a monotonic clock since the previous checkpoint in this
 * worker, or null. Used only when the wall clock moved backwards.
 */
export function advance(state: EarnState, obs: Observation, monoDeltaMs: number | null): AdvanceResult {
  const prev = state.last;
  const lastAt = state.lastAt;
  if (!prev || lastAt === null) {
    setLast(state, makeSnapshot(state, obs));
    pruneDays(state);
    return { kind: 'ok' };
  }

  const now = obs.at;
  const gap = now - lastAt;

  if (gap < 0) {
    // Wall clock moved backwards. Charge only the monotonic time actually observed, never the
    // negative gap, so setting the clock back cannot erase usage.
    const backwardMs = -gap;
    let chargedMs = 0;
    if (monoDeltaMs !== null && monoDeltaMs > 0 && countsForAccounting(prev.role)) {
      const span = Math.min(monoDeltaMs, RECONCILE_GAP_MS);
      chargedMs = chargeInterval(state, prev.role, now - span, now, 'live', prev.host).chargedMs;
    }
    addLedger(
      state,
      'clock',
      now,
      backwardMs,
      `System clock moved back ${Math.round(backwardMs / 1000)}s; charged ${Math.round(chargedMs / 1000)}s of observed time`,
    );
    setLast(state, makeSnapshot(state, obs));
    return { kind: 'clock-back', backwardMs, chargedMs };
  }

  if (gap > RECONCILE_GAP_MS) {
    return { kind: 'reconcile', from: lastAt, to: now };
  }

  let end = now;
  // chrome.idle reports 'idle' only after the detection interval of no input, so the user was
  // last active one interval earlier. Do not charge that quiet period.
  if (countsForAccounting(prev.role) && prev.idle === 'active' && obs.idle === 'idle' && !prev.audible) {
    end = now - IDLE_DETECTION_MS;
  }
  if (end < lastAt) end = lastAt;
  chargeInterval(state, prev.role, lastAt, end, 'live', prev.host);
  setLast(state, makeSnapshot(state, obs));
  pruneDays(state);
  return { kind: 'ok' };
}

/** Public view of the current role, stored in state for the popup and settings pages. */
export function liveFrom(snap: Snapshot): LiveStatus {
  const role = snap.role;
  const base = { host: null as string | null, mode: null as LiveStatus['mode'], degraded: false, why: null as LiveStatus['why'] };
  switch (role.k) {
    case 'none':
      return { k: 'none', tabId: snap.tabId, at: snap.at, ...base, host: role.host ?? null, why: role.why };
    case 'neutral':
      return { k: 'neutral', tabId: snap.tabId, at: snap.at, ...base, host: role.host };
    case 'productive':
      return { k: 'productive', tabId: snap.tabId, at: snap.at, ...base, host: role.host };
    case 'unproductive':
      return { k: 'unproductive', tabId: snap.tabId, at: snap.at, ...base, host: role.host };
    case 'half':
      return {
        k: 'half',
        tabId: snap.tabId,
        at: snap.at,
        host: role.host,
        mode: role.mode,
        degraded: role.degraded,
        why: null,
      };
  }
}

