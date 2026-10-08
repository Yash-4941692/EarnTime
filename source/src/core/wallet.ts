/**
 * Money primitives. Every mutation of balance, debt, daily stats and the audit ledger goes
 * through these functions so the invariants hold in one place:
 *   - earning repays debt before it grows the balance;
 *   - live spending never takes the balance below zero (no debt is created live);
 *   - debt is created only by history reconciliation after an interruption.
 */

import { DAY_RETENTION, LEDGER_LIMIT, LEDGER_MERGE_MS } from './constants';
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

/** Adds debt (only reconciliation does this). */
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

/** Sums of debt-progress numbers for the UI. */
export function debtProgress(state: EarnState): { repaidMs: number; ratio: number } {
  if (state.debtMs <= 0 || state.debtOriginMs <= 0) return { repaidMs: 0, ratio: 0 };
  const repaidMs = Math.max(0, state.debtOriginMs - state.debtMs);
  return { repaidMs, ratio: Math.min(1, repaidMs / state.debtOriginMs) };
}
