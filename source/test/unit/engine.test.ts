import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, liveFrom, makeSnapshot, setLast } from '../../src/core/engine';
import { RECONCILE_GAP_MS } from '../../src/core/constants';
import { dayKey } from '../../src/core/time';
import { freshState, localTime, MIN, obs, SEC, T0 } from './helpers';

function started(state: ReturnType<typeof freshState>, at: number, host: string | null, extra: Partial<Parameters<typeof obs>[0]> = {}) {
  const o = obs({ ...extra, at: extra.at ?? at, host: extra.host !== undefined ? extra.host : host });
  advance(state, o, null);
  return o;
}

test('60 productive minutes earn exactly 5 minutes at the default ratio', () => {
  const state = freshState();
  started(state, T0, 'khanacademy.org');
  let t = T0;
  for (let i = 0; i < 120; i++) {
    t += 30 * SEC;
    const r = advance(state, obs({ at: t, host: 'khanacademy.org' }), 30 * SEC);
    assert.equal(r.kind, 'ok');
  }
  assert.equal(state.balanceMs, 5 * MIN);
  const day = state.days[dayKey(T0)];
  assert.equal(day.prodMs, 60 * MIN);
  assert.equal(day.earnedMs, 5 * MIN);
  assert.equal(day.usedMs, 0);
});

test('unproductive time consumes the balance and never creates debt live', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'instagram.com');
  let t = T0;
  for (let i = 0; i < 40; i++) {
    t += 30 * SEC;
    advance(state, obs({ at: t, host: 'instagram.com' }), 30 * SEC);
  }
  assert.equal(state.balanceMs, 0);
  assert.equal(state.debtMs, 0);
  assert.equal(state.days[dayKey(T0)].unprodMs, 10 * MIN);
  assert.equal(state.days[dayKey(T0)].usedMs, 10 * MIN);
});

test('background, minimized and unfocused windows are not counted', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'instagram.com', { at: T0, focused: false });
  advance(state, obs({ at: T0 + 60 * SEC, host: 'instagram.com', focused: false }), 60 * SEC);
  advance(state, obs({ at: T0 + 120 * SEC, host: 'instagram.com', tabActive: false }), 60 * SEC);
  assert.equal(state.balanceMs, 10 * MIN);
  assert.equal(state.days[dayKey(T0)], undefined);
});

test('internal pages and unlisted sites are not counted', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, null, { at: T0, host: null, internalPage: true });
  advance(state, obs({ at: T0 + 60 * SEC, host: null, internalPage: true }), 60 * SEC);
  advance(state, obs({ at: T0 + 120 * SEC, host: 'example.org' }), 60 * SEC);
  advance(state, obs({ at: T0 + 180 * SEC, host: 'example.org' }), 60 * SEC);
  assert.equal(state.balanceMs, 10 * MIN);
  assert.equal(state.days[dayKey(T0)]?.prodMs ?? 0, 0);
});

test('an idle transition does not charge the 15-second detection window', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'instagram.com');
  advance(state, obs({ at: T0 + 60 * SEC, host: 'instagram.com', idle: 'idle' }), 60 * SEC);
  // 60 s elapsed, but the user was last active 15 s before the idle report.
  assert.equal(state.days[dayKey(T0)].unprodMs, 45 * SEC);
  assert.equal(state.balanceMs, 10 * MIN - 45 * SEC);
});

test('audible media keeps counting while the user is idle', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'instagram.com', { at: T0, audible: true });
  advance(state, obs({ at: T0 + 60 * SEC, host: 'instagram.com', idle: 'idle', audible: true }), 60 * SEC);
  assert.equal(state.days[dayKey(T0)].unprodMs, 60 * SEC);
});

test('a half-productive site without a mode choice is not counted', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'youtube.com');
  advance(state, obs({ at: T0 + 5 * MIN, host: 'youtube.com' }), 5 * MIN);
  assert.equal(state.balanceMs, 10 * MIN);
  assert.equal(liveFrom(state.last!).why, 'choose-mode');
});

test('Productive Mode on YouTube pending the filter does not count; a failing filter charges as unproductive', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  state.sessions['1'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  started(state, T0, 'youtube.com', { at: T0, filterState: 'pending' });
  advance(state, obs({ at: T0 + 60 * SEC, host: 'youtube.com', filterState: 'pending' }), 60 * SEC);
  assert.equal(state.balanceMs, 10 * MIN, 'pending: nothing counted');

  advance(state, obs({ at: T0 + 120 * SEC, host: 'youtube.com', filterState: 'bad' }), 60 * SEC);
  advance(state, obs({ at: T0 + 180 * SEC, host: 'youtube.com', filterState: 'bad' }), 60 * SEC);
  assert.equal(state.balanceMs, 10 * MIN - 60 * SEC, 'bad filter: the 60 s after the report is charged');
  assert.equal(state.days[dayKey(T0)].halfUnprodMs, 60 * SEC);
  assert.equal(state.days[dayKey(T0)].halfProdMs, 0);
});

test('an intentional YouTube cover is neither credited nor charged', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  state.sessions['1'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  started(state, T0, 'youtube.com', { at: T0, filterState: 'covered' });
  advance(state, obs({ at: T0 + 60 * SEC, host: 'youtube.com', filterState: 'covered' }), 60 * SEC);
  assert.equal(state.balanceMs, 10 * MIN);
  // Covered time is not billed, but it IS screen time: the user was looking at that page, so the
  // per-site breakdown has to say so even though nothing was earned or charged.
  const day = state.days[dayKey(T0)]!;
  assert.equal(day.prodMs + day.halfProdMs + day.halfUnprodMs + day.unprodMs, 0, 'covered time is not billed');
  assert.equal(day.earnedMs + day.usedMs, 0, 'covered time neither earns nor spends');
  assert.equal(day.screenMs, 60 * SEC, 'covered time is still recorded as screen time');
  assert.deepEqual(day.hosts, { 'youtube.com': 60 * SEC });
  assert.equal(liveFrom(state.last!).why, 'filter-covered');
});

test('a healthy Productive Mode on YouTube earns', () => {
  const state = freshState();
  state.sessions['1'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  started(state, T0, 'youtube.com', { at: T0, filterState: 'ok' });
  let t = T0;
  for (let i = 0; i < 120; i++) {
    t += 30 * SEC;
    advance(state, obs({ at: t, host: 'youtube.com', filterState: 'ok' }), 30 * SEC);
  }
  assert.equal(state.balanceMs, 5 * MIN);
  assert.equal(state.days[dayKey(T0)].halfProdMs, 60 * MIN);
});

test('a 60-minute gap with no checkpoints is not trusted live; it is handed to reconciliation', () => {
  const state = freshState();
  state.sessions['1'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  started(state, T0, 'youtube.com', { at: T0, filterState: 'ok' });
  const r = advance(state, obs({ at: T0 + 60 * MIN, host: 'youtube.com', filterState: 'ok' }), 60 * MIN);
  assert.equal(r.kind, 'reconcile');
  assert.equal(state.balanceMs, 0);
});

test('a backwards clock change never produces negative time or erases usage', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'instagram.com');
  // Wall clock jumps back 1 hour, but only 30 s of real time passed (monotonic delta).
  const r = advance(state, obs({ at: T0 - 60 * MIN + 30 * SEC, host: 'instagram.com' }), 30 * SEC);
  assert.equal(r.kind, 'clock-back');
  assert.equal(state.balanceMs, 10 * MIN - 30 * SEC);
  assert.ok(state.balanceMs >= 0);
  assert.equal(state.ledger.at(-1)?.kind, 'clock');
  // Afterwards, normal accounting resumes from the new reference point.
  advance(state, obs({ at: T0 - 60 * MIN + 60 * SEC, host: 'instagram.com' }), 30 * SEC);
  assert.equal(state.balanceMs, 10 * MIN - 60 * SEC);
});

test('a gap longer than the reconcile threshold asks for reconciliation and changes nothing', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  started(state, T0, 'instagram.com');
  const before = JSON.stringify(state.days);
  const r = advance(state, obs({ at: T0 + RECONCILE_GAP_MS + SEC, host: 'instagram.com' }), null);
  assert.deepEqual(r, { kind: 'reconcile', from: T0, to: T0 + RECONCILE_GAP_MS + SEC });
  assert.equal(state.balanceMs, 10 * MIN);
  assert.equal(JSON.stringify(state.days), before);
});

test('intervals that cross local midnight are split between the two days', () => {
  const state = freshState();
  const start = localTime(2026, 10, 8, 23, 59, 30);
  started(state, start, 'khanacademy.org');
  advance(state, obs({ at: start + 60 * SEC, host: 'khanacademy.org' }), 60 * SEC);
  assert.equal(state.days['2026-10-08'].prodMs, 30 * SEC);
  assert.equal(state.days['2026-10-09'].prodMs, 30 * SEC);
});

test('consecutive productive checkpoints merge into one ledger entry', () => {
  const state = freshState();
  started(state, T0, 'khanacademy.org');
  let t = T0;
  for (let i = 0; i < 10; i++) {
    t += 30 * SEC;
    advance(state, obs({ at: t, host: 'khanacademy.org' }), 30 * SEC);
  }
  const earns = state.ledger.filter((e) => e.kind === 'earn');
  assert.equal(earns.length, 1);
  assert.equal(earns[0].ms, 25 * SEC);
});

test('makeSnapshot and setLast keep the reference point consistent', () => {
  const state = freshState();
  const snap = makeSnapshot(state, obs({ at: T0, host: 'instagram.com' }));
  assert.equal(snap.role.k, 'unproductive');
  setLast(state, snap);
  assert.equal(state.lastAt, T0);
  assert.equal(state.last?.role.k, 'unproductive');
});
