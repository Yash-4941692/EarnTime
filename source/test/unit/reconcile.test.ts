import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyReconcile, planReconcile, type ReconcileInput } from '../../src/core/reconcile';
import { CONTINUATION_CAP_MS, MAX_RECONCILE_WINDOW_MS, VISIT_CAP_MS } from '../../src/core/constants';
import { freshState, MIN, SEC, T0 } from './helpers';
import type { Role } from '../../src/core/types';

const instagramRole: Role = { k: 'unproductive', host: 'instagram.com' };

function run(state: ReturnType<typeof freshState>, input: ReconcileInput, now = input.to) {
  const plan = planReconcile(state, input);
  return { plan, summary: applyReconcile(state, plan, input, now) };
}

test('spec example: balance 10 min, 40 min of unproductive use gives debt 30 min', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  const visits = [0, 10, 20, 30].map((m) => ({ at: T0 + m * MIN, host: 'instagram.com' }));
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 40 * MIN,
    visits,
    prevRole: null,
    prevHost: null,
    current: { counts: true, host: 'instagram.com' },
    startupAt: null,
  };
  const { summary } = run(state, input);
  assert.equal(summary.chargedMs, 40 * MIN);
  assert.equal(state.balanceMs, 0);
  assert.equal(state.debtMs, 30 * MIN);
  assert.equal(state.debtOriginMs, 30 * MIN);
  assert.equal(summary.debtAddedMs, 30 * MIN);
  assert.equal(state.debtSince, T0 + 10 * MIN, 'debt starts when the balance runs out');
  assert.equal(state.ledger.some((e) => e.kind === 'debt'), true);
  assert.deepEqual(summary.breakdown, [{ host: 'instagram.com', ms: 40 * MIN, kind: 'unproductive' }]);
  assert.equal(state.lastReconcile, summary);
});

test('a last visit that is no longer on screen is credited for only the continuation cap', () => {
  const state = freshState();
  state.balanceMs = 60 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 60 * MIN,
    visits: [{ at: T0 + 5 * MIN, host: 'instagram.com' }],
    prevRole: null,
    prevHost: null,
    current: { counts: false, host: null },
    startupAt: null,
  };
  const { summary } = run(state, input);
  assert.equal(summary.chargedMs, CONTINUATION_CAP_MS);
  assert.equal(state.balanceMs, 60 * MIN - CONTINUATION_CAP_MS);
});

test('a single visit is capped at the visit cap even when the next visit is much later', () => {
  const state = freshState();
  state.balanceMs = 120 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 3 * 60 * MIN,
    visits: [
      { at: T0, host: 'instagram.com' },
      { at: T0 + 60 * MIN, host: 'example.org' },
    ],
    prevRole: null,
    prevHost: null,
    current: { counts: false, host: null },
    startupAt: null,
  };
  const { plan, summary } = run(state, input);
  assert.equal(plan.cappedCount >= 1, true);
  assert.equal(summary.chargedMs, VISIT_CAP_MS);
});

test('productive visits repay existing debt before growing the balance', () => {
  const state = freshState();
  state.balanceMs = 0;
  state.debtMs = 30 * MIN;
  state.debtOriginMs = 30 * MIN;
  state.debtSince = T0 - MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 60 * MIN,
    visits: [{ at: T0, host: 'khanacademy.org' }],
    prevRole: null,
    prevHost: null,
    current: { counts: true, host: 'khanacademy.org' },
    startupAt: null,
  };
  const { summary } = run(state, input);
  // 15 min of productive time (visit cap) at 60:5 credits 1 min 15 s.
  assert.equal(summary.productiveCreditMs, 75 * SEC);
  assert.equal(summary.repaidMs, 75 * SEC);
  assert.equal(state.debtMs, 30 * MIN - 75 * SEC);
  assert.equal(state.balanceMs, 0);
});

test('half-productive visits are charged as unproductive when their mode cannot be verified', () => {
  const state = freshState();
  state.balanceMs = 30 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 10 * MIN,
    visits: [{ at: T0, host: 'youtube.com' }],
    prevRole: null,
    prevHost: null,
    current: { counts: true, host: 'youtube.com' },
    startupAt: null,
  };
  const { summary } = run(state, input);
  assert.equal(summary.chargedMs, 10 * MIN);
  assert.equal(summary.productiveCreditMs, 0);
  assert.equal(state.balanceMs, 20 * MIN);
});

test('the page active at the start of the gap is attributed up to the continuation cap', () => {
  const state = freshState();
  state.balanceMs = 30 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 20 * MIN,
    visits: [{ at: T0 + 10 * MIN, host: 'example.org' }],
    prevRole: instagramRole,
    prevHost: 'instagram.com',
    current: { counts: false, host: 'example.org' },
    startupAt: null,
  };
  const { summary } = run(state, input);
  assert.equal(summary.chargedMs, 10 * MIN);
  assert.equal(state.balanceMs, 20 * MIN);
});

test('a browser restart inside the gap cuts the gap at the last checkpoint', () => {
  const state = freshState();
  state.balanceMs = 60 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 3 * 60 * MIN,
    visits: [
      { at: T0 + 20 * SEC, host: 'instagram.com' },
      { at: T0 + 2 * 60 * MIN, host: 'instagram.com' },
    ],
    prevRole: instagramRole,
    prevHost: 'instagram.com',
    current: { counts: true, host: 'instagram.com' },
    startupAt: T0 + 2 * 60 * MIN,
  };
  const { plan, summary } = run(state, input);
  assert.equal(plan.startupCut, true);
  assert.equal(summary.startupCut, true);
  // Only the first 30 s before closing, plus the visit after startup (still on screen: capped at 15 min).
  assert.equal(summary.chargedMs, 30 * SEC + VISIT_CAP_MS);
});

test('the reconciliation window never reaches further back than the maximum', () => {
  const state = freshState();
  const input: ReconcileInput = {
    from: T0 - 60 * 24 * 3600 * 1000,
    to: T0,
    visits: [{ at: T0 - 30 * 24 * 3600 * 1000, host: 'instagram.com' }],
    prevRole: null,
    prevHost: null,
    current: { counts: false, host: null },
    startupAt: null,
  };
  const plan = planReconcile(state, input);
  assert.equal(plan.windowFrom, T0 - MAX_RECONCILE_WINDOW_MS);
  assert.equal(plan.visitCount, 0);
  assert.equal(plan.segments.length, 0);
});

test('visits outside the window and non-web pages are handled as boundaries', () => {
  const state = freshState();
  state.balanceMs = 60 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 30 * MIN,
    visits: [
      { at: T0 - MIN, host: 'instagram.com' },
      { at: T0 + 5 * MIN, host: 'instagram.com' },
      { at: T0 + 10 * MIN, host: null },
    ],
    prevRole: null,
    prevHost: null,
    current: { counts: false, host: null },
    startupAt: null,
  };
  const { summary } = run(state, input);
  // Only the visit at +5 min counts, and it ends at the non-web visit at +10 min.
  assert.equal(summary.chargedMs, 5 * MIN);
});

test('neutral sites are never charged during reconciliation', () => {
  const state = freshState();
  state.balanceMs = 5 * MIN;
  const input: ReconcileInput = {
    from: T0,
    to: T0 + 30 * MIN,
    visits: [{ at: T0, host: 'example.org' }],
    prevRole: null,
    prevHost: null,
    current: { counts: true, host: 'example.org' },
    startupAt: null,
  };
  const { summary } = run(state, input);
  assert.equal(summary.chargedMs, 0);
  assert.equal(state.balanceMs, 5 * MIN);
});
