/**
 * Money primitives. Every mutation of balance, debt, daily stats and the audit ledger goes
 * through these functions so the invariants hold in one place:
 *   - earning repays debt before it grows the balance;
 *   - live spending never takes the balance below zero (no debt is created live);
 *   - debt is created by estimated interruption usage or earlier usage of a newly unproductive site.
 */

import {
  DAY_RETENTION,
  HALF_REVIEW_RETENTION_MS,
  LEDGER_LIMIT,
  LEDGER_MERGE_MS,
  MAX_HALF_REVIEWS,
} from './constants';
import type { DayStats, EarnState, LedgerEntry, LedgerKind } from './types';

export function emptyDayStats(): DayStats {
  return {
    prodMs: 0,
    halfProdMs: 0,
    halfUnprodMs: 0,
    unprodMs: 0,
    earnedMs: 0,
    repaidMs: 0,
    taskMs: 0,
    usedMs: 0,
    hosts: {},
    chargedHosts: {},
    screenMs: 0,
    estimatedScreenMs: 0,
  };
}

export function statsFor(state: EarnState, key: string): DayStats {
  let stats = state.days[key];
  if (!stats) {
    stats = emptyDayStats();
    state.days[key] = stats;
  }
  return stats;
}

/** Maximum number of per-site rows kept for one day, so storage cannot grow without bound. */
export const MAX_DAY_HOSTS = 60;

/**
 * Adds foreground screen time for one host. Screen time is recorded for every site, including the
 * neutral ones EarnTime does not charge, because the analytics answer "where did the day go" — which
 * is a bigger question than "what did EarnTime bill".
 */
export function addScreenTime(state: EarnState, key: string, host: string | null | undefined, ms: number, estimated: boolean): void {
  if (ms <= 0) return;
  const stats = statsFor(state, key);
  stats.screenMs += ms;
  if (estimated) stats.estimatedScreenMs += ms;
  if (!host) return;
  const hosts = stats.hosts ?? (stats.hosts = {});
  hosts[host] = (hosts[host] ?? 0) + ms;
  const keys = Object.keys(hosts);
  if (keys.length <= MAX_DAY_HOSTS) return;
  // Drop the smallest entries: a day is summarised by its biggest sites, not its long tail.
  for (const smallest of keys.sort((a, b) => hosts[a] - hosts[b]).slice(0, keys.length - MAX_DAY_HOSTS)) {
    delete hosts[smallest];
  }
}

/** Keeps only the most recent DAY_RETENTION day buckets. */
export function pruneDays(state: EarnState): void {
  const keys = Object.keys(state.days).sort();
  while (keys.length > DAY_RETENTION) {
    const oldest = keys.shift();
    if (oldest !== undefined) delete state.days[oldest];
  }
}

/**
 * Appends a ledger entry. Consecutive entries of the same kind and host are merged within
 * LEDGER_MERGE_MS so that 30-second checkpoints do not flood the audit log.
 */
export function addLedger(
  state: EarnState,
  kind: LedgerKind,
  at: number,
  ms: number,
  note: string,
  host?: string,
  mergeable = false,
): void {
  const tail = state.ledger[state.ledger.length - 1];
  if (
    mergeable &&
    tail &&
    tail.kind === kind &&
    tail.host === host &&
    at - tail.at <= LEDGER_MERGE_MS &&
    at >= tail.at
  ) {
    tail.ms += ms;
    tail.at = at;
    tail.note = note;
    return;
  }
  const entry: LedgerEntry = { id: state.nextLedgerId, at, kind, ms, note };
  if (host !== undefined) entry.host = host;
  state.nextLedgerId += 1;
  state.ledger.push(entry);
  if (state.ledger.length > LEDGER_LIMIT) {
    state.ledger.splice(0, state.ledger.length - LEDGER_LIMIT);
  }
}

/**
 * Credits screen time. Debt is repaid first; the remainder goes to the balance.
 * Returns how much went to repayment and how much to the balance.
 */
export function creditEarned(
  state: EarnState,
  ms: number,
  at: number,
  note: string,
  host?: string,
): { repaidMs: number; toBalanceMs: number } {
  if (ms <= 0) return { repaidMs: 0, toBalanceMs: 0 };
  const repaidMs = Math.min(state.debtMs, ms);
  const toBalanceMs = ms - repaidMs;
  state.debtMs -= repaidMs;
  state.balanceMs += toBalanceMs;
  if (repaidMs > 0) {
    addLedger(state, 'repay', at, repaidMs, `Debt repaid: ${note}`, host, true);
  }
  if (state.debtMs === 0 && state.debtSince !== null) {
    addLedger(state, 'debt', at, 0, 'Debt cleared', undefined, false);
    state.debtSince = null;
    state.debtOriginMs = 0;
  }
  return { repaidMs, toBalanceMs };
}

/** Takes time from the balance without going below zero. Returns the amount actually taken. */
export function spendFromBalance(state: EarnState, ms: number): number {
  if (ms <= 0) return 0;
  const taken = Math.min(Math.max(0, state.balanceMs), ms);
  state.balanceMs -= taken;
  return taken;
}

/**
 * Gives back time that was charged but should not have been (an estimate corrected upwards).
 * Spending took the balance first and created debt last, so the reversal runs in the opposite
 * order: debt first, then the balance.
 */
export function refundSpending(state: EarnState, ms: number, at: number, note: string, host?: string): { fromDebtMs: number; fromBalanceMs: number } {
  if (ms <= 0) return { fromDebtMs: 0, fromBalanceMs: 0 };
  const fromDebtMs = Math.min(state.debtMs, ms);
  if (fromDebtMs > 0) {
    state.debtMs -= fromDebtMs;
    // Keep the "repaid of total" progress bar consistent with the smaller debt.
    state.debtOriginMs = Math.max(state.debtMs, state.debtOriginMs - fromDebtMs);
    addLedger(state, 'review', at, fromDebtMs, `Charge reversed: ${note}`, host);
    if (state.debtMs === 0 && state.debtSince !== null) {
      addLedger(state, 'debt', at, 0, 'Debt cleared', undefined, false);
      state.debtSince = null;
      state.debtOriginMs = 0;
    }
  }
  const fromBalanceMs = ms - fromDebtMs;
  if (fromBalanceMs > 0) state.balanceMs += fromBalanceMs;
  return { fromDebtMs, fromBalanceMs };
}

/**
 * Takes back a credit that should not have been granted (an estimate corrected downwards). Credits
 * repaid debt first and grew the balance after, so the reversal does the opposite: the balance
 * first, then debt. This is the symmetric counterpart of `refundSpending`.
 */
export function revokeCredit(state: EarnState, ms: number, at: number, note: string, host?: string): { fromBalanceMs: number; toDebtMs: number } {
  if (ms <= 0) return { fromBalanceMs: 0, toDebtMs: 0 };
  const fromBalanceMs = Math.min(state.balanceMs, ms);
  state.balanceMs -= fromBalanceMs;
  const toDebtMs = ms - fromBalanceMs;
  if (toDebtMs > 0) incurDebt(state, toDebtMs, at, `Credit reversed: ${note}`);
  else if (fromBalanceMs > 0) addLedger(state, 'review', at, fromBalanceMs, `Credit reversed: ${note}`, host);
  return { fromBalanceMs, toDebtMs };
}

/** Adds debt for previously unbilled usage, never for blocked live browsing. */
export function incurDebt(state: EarnState, ms: number, at: number, note: string): void {
  if (ms <= 0) return;
  if (state.debtMs === 0 || state.debtSince === null) {
    state.debtSince = at;
    state.debtOriginMs = 0;
    addLedger(state, 'debt', at, ms, `Debt started: ${note}`);
  }
  state.debtMs += ms;
  state.debtOriginMs += ms;
}

/**
 * Keeps the estimate questions bounded: unresolved ones are never dropped (the user still owes an
 * answer), answered ones are forgotten after the retention window, and the list as a whole is
 * capped. The default split of anything dropped already stands in the books.
 */
export function pruneHalfReviews(state: EarnState, now: number): void {
  const unresolved = state.halfReviews.filter((review) => review.resolvedAt === null);
  const answered = state.halfReviews.filter(
    (review) => review.resolvedAt !== null && now - review.resolvedAt <= HALF_REVIEW_RETENTION_MS,
  );
  const unresolvedKept = unresolved.slice(-MAX_HALF_REVIEWS);
  const room = Math.max(0, MAX_HALF_REVIEWS - unresolvedKept.length);
  state.halfReviews = [...unresolvedKept, ...(room > 0 ? answered.slice(-room) : [])].sort(
    (a, b) => a.at - b.at || a.id - b.id,
  );
}

/** Sums of debt-progress numbers for the UI. */
export function debtProgress(state: EarnState): { repaidMs: number; ratio: number } {
  if (state.debtMs <= 0 || state.debtOriginMs <= 0) return { repaidMs: 0, ratio: 0 };
  const repaidMs = Math.max(0, state.debtOriginMs - state.debtMs);
  return { repaidMs, ratio: Math.min(1, repaidMs / state.debtOriginMs) };
}
