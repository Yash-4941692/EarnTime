import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeText, dayKey, formatDuration, formatMinutes, splitByLocalDay } from '../../src/core/time';
import { localTime, MIN } from './helpers';

test('dayKey uses the local calendar day', () => {
  assert.equal(dayKey(localTime(2026, 10, 8, 0, 0, 1)), '2026-10-08');
  assert.equal(dayKey(localTime(2026, 10, 8, 23, 59, 59)), '2026-10-08');
  assert.equal(dayKey(localTime(2026, 1, 5, 12)), '2026-01-05');
});

test('splitByLocalDay splits at local midnight and keeps totals', () => {
  const from = localTime(2026, 10, 8, 23, 50);
  const to = localTime(2026, 10, 9, 0, 10);
  const parts = splitByLocalDay(from, to);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].key, '2026-10-08');
  assert.equal(parts[1].key, '2026-10-09');
  assert.equal(parts[0].to, localTime(2026, 10, 9, 0, 0));
  assert.equal(parts.reduce((sum, p) => sum + (p.to - p.from), 0), to - from);
});

test('splitByLocalDay returns nothing for empty or reversed intervals', () => {
  const t = localTime(2026, 10, 8, 10);
  assert.deepEqual(splitByLocalDay(t, t), []);
  assert.deepEqual(splitByLocalDay(t, t - 1000), []);
});

test('formatDuration renders compact durations', () => {
  assert.equal(formatDuration(35_000), '35s');
  assert.equal(formatDuration(42 * MIN + 5_000), '42m 05s');
  assert.equal(formatDuration(65 * MIN), '1h 05m');
  assert.equal(formatDuration(-5), '0s');
});

test('formatMinutes and badgeText', () => {
  assert.equal(formatMinutes(23.9 * MIN), '23 min');
  assert.equal(badgeText(0), '0m');
  assert.equal(badgeText(30_000), '<1m');
  assert.equal(badgeText(45 * MIN), '45m');
  assert.equal(badgeText(150 * MIN), '2h');
});
