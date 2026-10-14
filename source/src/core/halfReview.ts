/**
 * The estimate question. During an interruption a half-productive site's mode cannot be verified,
 * so EarnTime splits that estimated time down the middle: half credited as study at the current
 * earn ratio, half charged as unproductive (which can create debt, exactly as the old fail-closed
 * rule did for the whole stretch).
 *
 * The default is applied immediately so no time is left unbilled, and this module re-prices the same
 * stretch when the user answers the question with the truth. Corrections are symmetric: saying more
 * study than half earns the difference back (repaying debt first), saying less charges it again.
 */

import { MINUTE_MS } from './constants';
import { creditFor } from './engine';
import { dayKey } from './time';
import {
  addLedger,
  creditEarned,
  incurDebt,
  refundSpending,
  revokeCredit,
  spendFromBalance,
  statsFor,
} from './wallet';
import type { EarnState, HalfReview } from './types';

export interface HalfReviewChange {
  /** Screen-time credit this answer added (positive) or took back (negative). */
  creditDeltaMs: number;
  /** Time charged as unproductive this answer added (positive) or refunded (negative). */
  chargeDeltaMs: number;
  /** How much of a granted credit went to repaying debt. */
  repaidMs: number;
}

/** The questions still waiting for an answer, oldest first. */
export function unresolvedReviews(state: EarnState): HalfReview[] {
  return state.halfReviews.filter((review) => review.resolvedAt === null);
}

/** Milliseconds of `review.totalMs` that the user says were study, clamped to the estimate. */
export function clampReviewAnswer(review: HalfReview, productiveMs: number): number {
  if (!Number.isFinite(productiveMs)) return review.productiveMs;
  return Math.min(review.totalMs, Math.max(0, Math.round(productiveMs)));
}

/**
 * Re-prices an estimate with the user's answer. The money moves through the same primitives as
 * ordinary accounting (debt repaid before the balance grows, balance taken before new debt), and
 * the day buckets are adjusted on the days the estimated time was actually spent.
 */
export function applyHalfReview(state: EarnState, review: HalfReview, productiveMs: number, now: number): HalfReviewChange {
  const next = clampReviewAnswer(review, productiveMs);
  if (next === review.productiveMs) {
    review.resolvedAt = review.resolvedAt ?? now;
    return { creditDeltaMs: 0, chargeDeltaMs: 0, repaidMs: 0 };
  }

  // The applied split is kept per estimated day, so answering a question about a gap that crossed
  // midnight still lands on the right days.
  const parts = review.parts.length > 0 ? review.parts : [{ day: dayKey(review.at), ms: review.totalMs }];
  const share0 = review.productiveMs / review.totalMs;
  const share1 = next / review.totalMs;

  let creditDeltaMs = 0;
  let chargeDeltaMs = 0;
  const perDay = new Map<string, { halfProdMs: number; halfUnprodMs: number; earnedMs: number; usedMs: number }>();
  for (const part of parts) {
    const before = Math.round(part.ms * share0);
    const after = Math.round(part.ms * share1);
    const creditBefore = creditFor(state, before);
    const creditAfter = creditFor(state, after);
    creditDeltaMs += creditAfter - creditBefore;
    chargeDeltaMs += before - after; // unproductive portion: part.ms - productive
    const day = perDay.get(part.day) ?? { halfProdMs: 0, halfUnprodMs: 0, earnedMs: 0, usedMs: 0 };
    day.halfProdMs += after - before;
    day.halfUnprodMs += before - after;
    day.earnedMs += creditAfter - creditBefore;
    day.usedMs += before - after;
    perDay.set(part.day, day);
  }

  const note = `Half-productive estimate (${review.host}) revised to ${Math.round(next / MINUTE_MS)} study min of ${Math.round(review.totalMs / MINUTE_MS)}`;
  let repaidMs = 0;
  // Reversals first: the books never hold more credit or less charge than the answer allows, even
  // for the instant in between.
  if (chargeDeltaMs < 0) refundSpending(state, -chargeDeltaMs, now, note, review.host);
  else if (creditDeltaMs < 0) revokeCredit(state, -creditDeltaMs, now, note, review.host);
  if (creditDeltaMs > 0) repaidMs = creditEarned(state, creditDeltaMs, now, note, review.host).repaidMs;
  if (chargeDeltaMs > 0) {
    const fromBalance = spendFromBalance(state, chargeDeltaMs);
    const debtAdd = chargeDeltaMs - fromBalance;
    if (debtAdd > 0) incurDebt(state, debtAdd, now, `${note} (${review.host})`);
    else addLedger(state, 'review', now, chargeDeltaMs, note, review.host);
  }

  // One audit line for the correction itself, whatever the money primitives logged above.
  addLedger(state, 'review', now, creditDeltaMs - chargeDeltaMs, note, review.host);

  for (const [day, delta] of perDay) {
    const stats = statsFor(state, day);
    stats.halfProdMs = Math.max(0, stats.halfProdMs + delta.halfProdMs);
    stats.halfUnprodMs = Math.max(0, stats.halfUnprodMs + delta.halfUnprodMs);
    stats.earnedMs = Math.max(0, stats.earnedMs + delta.earnedMs);
    stats.usedMs = Math.max(0, stats.usedMs + delta.usedMs);
  }
  if (repaidMs > 0) statsFor(state, dayKey(now)).repaidMs += repaidMs;
  if (chargeDeltaMs !== 0) {
    const stats = statsFor(state, dayKey(now));
    stats.chargedHosts[review.host] = Math.max(0, (stats.chargedHosts[review.host] ?? 0) + chargeDeltaMs);
  }

  review.productiveMs = next;
  review.creditedMs = creditFor(state, next);
  review.chargedMs = review.totalMs - next;
  review.resolvedAt = now;
  return { creditDeltaMs, chargeDeltaMs, repaidMs };
}
