import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, makeSnapshot, setLast } from '../../src/core/engine';
import { applyReconcile, planReconcile, type ReconcileInput } from '../../src/core/reconcile';
import { toggleTask } from '../../src/core/tasks';
import { freshState, MIN, obs, SEC, T0 } from './helpers';
import type { EarnState } from '../../src/core/types';

/** Deterministic PRNG so failures are reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function netOf(state: EarnState): number {
  return state.balanceMs - state.debtMs;
}

function dayTotals(state: EarnState): { earned: number; used: number } {
  let earned = 0;
  let used = 0;
  for (const d of Object.values(state.days)) {
    earned += d.earnedMs;
    used += d.usedMs;
  }
  return { earned, used };
}

test('randomised sequences keep balance and debt non-negative and conserve value', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const random = rng(seed);
    const state = freshState();
    state.balanceMs = Math.floor(random() * 30) * MIN;
    state.tasks.push({ id: 'x', title: 'x', rewardMin: 3, recurring: true, createdAt: T0, completedOn: null, rewardedOn: null });
    const hosts = [null, 'khanacademy.org', 'instagram.com', 'youtube.com', 'example.org'];
    let now = T0;
    advance(state, obs({ at: now, host: 'khanacademy.org' }), null);
    setLast(state, makeSnapshot(state, obs({ at: now, host: 'khanacademy.org' })));
    let dayStart = dayTotals(state);
    let netStart = netOf(state);
    const delta = (): number => {
      const cur = dayTotals(state);
      return cur.earned - dayStart.earned - (cur.used - dayStart.used);
    };
    for (let step = 0; step < 200; step++) {
      const roll = random();
      if (roll < 0.75) {
        now += Math.floor(random() * 90) * SEC + SEC;
        const host = hosts[Math.floor(random() * hosts.length)];
        const o = obs({
          at: now,
          host,
          internalPage: host === null && random() < 0.5,
          focused: random() > 0.1,
          idle: random() < 0.2 ? 'idle' : 'active',
          audible: random() < 0.1,
          tabId: 1,
          filterState: random() < 0.5 ? 'ok' : 'bad',
        });
        if (host === 'youtube.com') state.sessions['1'] = { entry: 'youtube.com', mode: random() < 0.5 ? 'productive' : 'unproductive', since: now - 1 };
        const result = advance(state, o, Math.floor(random() * 90) * SEC);
        if (result.kind === 'reconcile') {
          const visits = [{ at: result.from + 5 * SEC, host: hosts[Math.floor(random() * hosts.length)] }];
          const input: ReconcileInput = {
            from: result.from,
            to: result.to,
            visits,
            prevRole: state.last?.role ?? null,
            prevHost: state.last?.host ?? null,
            current: { counts: true, host: 'instagram.com' },
            startupAt: null,
          };
          applyReconcile(state, planReconcile(state, input), input, now);
          setLast(state, makeSnapshot(state, o));
        }
      } else if (roll < 0.9) {
        toggleTask(state, 'x', now);
      } else {
        // Clock jumps backwards: no negative charge may appear.
        now -= Math.floor(random() * 3600) * SEC;
        advance(state, obs({ at: now, host: 'instagram.com' }), 30 * SEC);
      }
      assert.ok(state.balanceMs >= 0, `seed ${seed} step ${step}: balance ${state.balanceMs}`);
      assert.ok(state.debtMs >= 0, `seed ${seed} step ${step}: debt ${state.debtMs}`);
      assert.ok(state.debtOriginMs >= state.debtMs, `seed ${seed} step ${step}: origin < debt`);
      if (state.debtMs > 0) assert.ok(state.debtSince !== null);
      if (state.debtMs === 0) assert.equal(state.debtOriginMs, 0);
      // Value conservation: net worth moves exactly by credits minus charges (day totals).
      assert.equal(netOf(state) - netStart, delta(), `seed ${seed} step ${step}: conservation`);
      // Keep the checks cumulative and continue from the new reference.
      dayStart = dayTotals(state);
      netStart = netOf(state);
    }
  }
});

test('the ledger never exceeds its limit', () => {
  const state = freshState();
  let t = T0;
  advance(state, obs({ at: t, host: 'khanacademy.org' }), null);
  for (let i = 0; i < 2000; i++) {
    t += 30 * SEC;
    advance(state, obs({ at: t, host: i % 2 ? 'khanacademy.org' : 'instagram.com', focused: true }), 30 * SEC);
    if (i % 2) state.balanceMs = 0;
  }
  assert.ok(state.ledger.length <= 400);
});
