import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDoneToday, toggleTask, validateTask } from '../../src/core/tasks';
import { dayKey } from '../../src/core/time';
import { freshState, localTime, MIN, T0 } from './helpers';
import type { Task } from '../../src/core/types';

function addTask(state: ReturnType<typeof freshState>, over: Partial<Task> = {}): Task {
  const task: Task = {
    id: 't1',
    title: 'Revise formulas',
    rewardMin: 5,
    recurring: true,
    createdAt: T0,
    completedOn: null,
    rewardedOn: null,
    ...over,
  };
  state.tasks.push(task);
  return task;
}

test('recurring task pays once per local day, undo does not pay twice', () => {
  const state = freshState();
  addTask(state);
  const first = toggleTask(state, 't1', T0);
  assert.equal(first.ok && first.data?.rewardedMs, 5 * MIN);
  assert.equal(state.balanceMs, 5 * MIN);
  assert.equal(toggleTask(state, 't1', T0 + MIN).ok, true, 'untick');
  assert.equal(state.tasks[0].completedOn, null);
  assert.equal(state.balanceMs, 5 * MIN, 'undo does not revoke');
  const again = toggleTask(state, 't1', T0 + 2 * MIN);
  assert.equal(again.ok && again.data?.rewardedMs, 0, 'ticking again the same day does not pay');
  assert.equal(state.balanceMs, 5 * MIN);
});

test('recurring task pays again on the next local day', () => {
  const state = freshState();
  addTask(state);
  toggleTask(state, 't1', T0);
  const tomorrow = localTime(2026, 10, 9, 8, 0, 0);
  assert.equal(isDoneToday(state.tasks[0], tomorrow), false);
  const result = toggleTask(state, 't1', tomorrow);
  assert.equal(result.ok && result.data?.rewardedMs, 5 * MIN);
  assert.equal(state.balanceMs, 10 * MIN);
});

test('one-off task pays only once ever', () => {
  const state = freshState();
  addTask(state, { recurring: false });
  toggleTask(state, 't1', T0);
  toggleTask(state, 't1', T0 + MIN);
  const later = localTime(2026, 10, 12, 9, 0, 0);
  const result = toggleTask(state, 't1', later);
  assert.equal(result.ok && result.data?.rewardedMs, 0);
  assert.equal(state.balanceMs, 5 * MIN);
});

test('task reward repays debt before it grows the balance and is counted in stats', () => {
  const state = freshState();
  state.debtMs = 3 * MIN;
  state.debtOriginMs = 3 * MIN;
  state.debtSince = T0 - MIN;
  addTask(state, { rewardMin: 5 });
  toggleTask(state, 't1', T0);
  assert.equal(state.debtMs, 0);
  assert.equal(state.balanceMs, 2 * MIN);
  const day = state.days[dayKey(T0)];
  assert.equal(day.taskMs, 5 * MIN);
  assert.equal(day.repaidMs, 3 * MIN);
  assert.equal(state.ledger.some((e) => e.kind === 'task'), true);
});

test('unknown task ids are reported, not ignored', () => {
  const state = freshState();
  const result = toggleTask(state, 'missing', T0);
  assert.equal(result.ok, false);
});

test('task validation enforces names and reward bounds', () => {
  assert.equal(validateTask({ title: '  ', rewardMin: 5, recurring: true }).ok, false);
  assert.equal(validateTask({ title: 'x', rewardMin: 0, recurring: true }).ok, false);
  assert.equal(validateTask({ title: 'x', rewardMin: 61, recurring: true }).ok, false);
  assert.equal(validateTask({ title: 'x'.repeat(81), rewardMin: 5, recurring: true }).ok, false);
  const ok = validateTask({ title: '  Read  ', rewardMin: 7.4, recurring: false });
  assert.deepEqual(ok, { ok: true, data: { title: 'Read', rewardMin: 7, recurring: false } });
});
