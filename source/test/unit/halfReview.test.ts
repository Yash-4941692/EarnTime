import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyHalfReview, clampReviewAnswer, unresolvedReviews } from '../../src/core/halfReview';
import type { EarnState, HalfReview } from '../../src/core/types';
import { freshState, localTime, MIN, SEC, T0 } from './helpers';

/** The question a 10-minute unverifiable youtube.com stretch produces, already split half/half. */
function review(overrides: Partial<HalfReview> = {}): HalfReview {
  return {
    id: 1,
    at: T0 + 10 * MIN,
    host: 'youtube.com',
    entry: 'youtube.com',
    from: T0,
    to: T0 + 10 * MIN,
    totalMs: 10 * MIN,
    productiveMs: 5 * MIN,
    creditedMs: 25 * SEC,
    chargedMs: 5 * MIN,
    parts: [{ day: '2026-10-08', ms: 10 * MIN }],
    lastMode: null,
    resolvedAt: null,
    ...overrides,
  };
}

/** What the reconciliation writes into a day for the default half/half split of `ms` of estimate. */
function seedDefaultSplit(state: EarnState, day: string, ms = 10 * MIN): void {
  const half = ms / 2;
  state.days[day] = {
    prodMs: 0,
    halfProdMs: half,
    halfUnprodMs: ms - half,
    unprodMs: 0,
    earnedMs: Math.round((half * 5) / 60),
    repaidMs: 0,
    taskMs: 0,
    usedMs: ms - half,
    hosts: { 'youtube.com': ms },
    chargedHosts: { 'youtube.com': ms - half },
    screenMs: ms,
    estimatedScreenMs: ms,
  };
}

test('answer "all study": the charged half is given back and the whole stretch earns credit', () => {
  const state = freshState();
  state.balanceMs = 25 * MIN + 25 * SEC;
  seedDefaultSplit(state, '2026-10-08');
  const question = review();
  state.halfReviews.push(question);

  const change = applyHalfReview(state, question, 10 * MIN, T0 + 11 * MIN);

  assert.equal(change.chargeDeltaMs, -5 * MIN, 'the charged half is refunded');
  assert.equal(change.creditDeltaMs, 25 * SEC, 'the whole stretch earns credit (50 s instead of 25 s)');
  assert.equal(state.balanceMs, 25 * MIN + 25 * SEC + 5 * MIN + 25 * SEC);
  assert.equal(state.debtMs, 0);
  assert.equal(question.productiveMs, 10 * MIN);
  assert.equal(question.chargedMs, 0);
  assert.equal(question.creditedMs, 50 * SEC);
  assert.equal(question.resolvedAt, T0 + 11 * MIN);
  const day = state.days['2026-10-08'];
  assert.equal(day.halfProdMs, 10 * MIN);
  assert.equal(day.halfUnprodMs, 0);
  assert.equal(day.usedMs, 0);
  assert.equal(day.earnedMs, 50 * SEC);
  assert.equal(day.chargedHosts['youtube.com'], 0);
  assert.equal(unresolvedReviews(state).length, 0);
  assert.ok(state.ledger.some((entry) => entry.kind === 'review'));
});

test('answer "none of it was study": the study half is charged again and creates debt', () => {
  const state = freshState();
  state.balanceMs = 2 * MIN;
  seedDefaultSplit(state, '2026-10-08');
  const question = review();
  state.halfReviews.push(question);

  const change = applyHalfReview(state, question, 0, T0 + 12 * MIN);

  assert.equal(change.chargeDeltaMs, 5 * MIN, 'the study half is charged');
  assert.equal(change.creditDeltaMs, -25 * SEC, 'and its credit is taken back');
  assert.equal(state.balanceMs, 0, 'the balance is taken first');
  assert.equal(state.debtMs, 5 * MIN - 2 * MIN + 25 * SEC, 'what the balance cannot cover becomes debt');
  assert.equal(state.debtSince, T0 + 12 * MIN, 'a new debt period starts');
  assert.equal(question.productiveMs, 0);
  assert.equal(question.creditedMs, 0);
  assert.equal(question.chargedMs, 10 * MIN);
  assert.equal(question.resolvedAt, T0 + 12 * MIN);
  const day = state.days['2026-10-08'];
  assert.equal(day.halfProdMs, 0);
  assert.equal(day.halfUnprodMs, 10 * MIN);
  assert.equal(day.earnedMs, 0);
  assert.equal(day.usedMs, 10 * MIN);
  assert.equal(day.chargedHosts['youtube.com'], 10 * MIN);
});

test('a bigger answer while in debt clears the debt before growing the balance', () => {
  const state = freshState();
  state.balanceMs = 0;
  state.debtMs = 5 * MIN + 10 * SEC;
  state.debtOriginMs = 5 * MIN + 10 * SEC;
  state.debtSince = T0;
  seedDefaultSplit(state, '2026-10-08');
  const question = review();
  state.halfReviews.push(question);

  const change = applyHalfReview(state, question, 10 * MIN, T0 + 13 * MIN);

  assert.equal(state.debtMs, 0, 'the refunded charge and the extra credit settle the debt');
  assert.equal(state.balanceMs, 15 * SEC, 'the credit left over is spendable');
  assert.equal(state.debtSince, null);
  assert.equal(change.repaidMs, 10 * SEC, 'only the part the credit covered is repayment');
  assert.equal(state.days['2026-10-08'].repaidMs, 10 * SEC, 'the credit that went to debt is recorded');
});

test('a correction lands on the days the estimate came from, not on the day of the answer', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  const from = localTime(2026, 10, 7, 23, 55, 0);
  const to = localTime(2026, 10, 8, 0, 5, 0);
  const question = review({
    at: T0,
    from,
    to,
    totalMs: 10 * MIN,
    productiveMs: 5 * MIN,
    creditedMs: 25 * SEC,
    chargedMs: 5 * MIN,
    parts: [
      { day: '2026-10-07', ms: 5 * MIN },
      { day: '2026-10-08', ms: 5 * MIN },
    ],
  });
  state.halfReviews.push(question);
  seedDefaultSplit(state, '2026-10-07', 5 * MIN);
  seedDefaultSplit(state, '2026-10-08', 5 * MIN);

  applyHalfReview(state, question, 8 * MIN, T0 + 14 * MIN);

  assert.equal(state.days['2026-10-07'].halfProdMs, 4 * MIN, '80% of the first day is study');
  assert.equal(state.days['2026-10-07'].halfUnprodMs, MIN);
  assert.equal(state.days['2026-10-08'].halfProdMs, 4 * MIN);
  assert.equal(state.days['2026-10-08'].halfUnprodMs, MIN);
  assert.equal(state.days['2026-10-08'].earnedMs, 20 * SEC);
  assert.equal(state.balanceMs, 10 * MIN + 3 * MIN + 15 * SEC, '3 min refunded plus 15 s of study credit');
});

test('keeping the default answer closes the question without moving money', () => {
  const state = freshState();
  state.balanceMs = 7 * MIN;
  const question = review();
  state.halfReviews.push(question);

  const change = applyHalfReview(state, question, question.productiveMs, T0 + 15 * MIN);

  assert.deepEqual(change, { creditDeltaMs: 0, chargeDeltaMs: 0, repaidMs: 0 });
  assert.equal(state.balanceMs, 7 * MIN);
  assert.equal(state.debtMs, 0);
  assert.equal(question.resolvedAt, T0 + 15 * MIN);
  assert.equal(unresolvedReviews(state).length, 0);
});

test('answers are clamped to the estimate', () => {
  const question = review();
  assert.equal(clampReviewAnswer(question, -5), 0);
  assert.equal(clampReviewAnswer(question, 99 * MIN), 10 * MIN);
  assert.equal(clampReviewAnswer(question, 3.4 * MIN), 3.4 * MIN);
  assert.equal(clampReviewAnswer(question, Number.NaN), 5 * MIN);
});
