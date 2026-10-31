import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADULT_PAUSE_LINES, STUDY_LINES, pickMotivationLine } from '../../src/core/motivation';
import { MOTIVATION_PAGE_PATH, BLOCK_PAGE_PATH } from '../../src/core/dnr';

/** A timestamp exactly on a minute boundary, so "the same minute" is easy to reason about. */
const BASE = 1_700_000_040_000;

test('the motivational pause is a page of its own, with no query string a redirect could drop', () => {
  assert.equal(MOTIVATION_PAGE_PATH, '/motivation.html');
  assert.notEqual(MOTIVATION_PAGE_PATH, BLOCK_PAGE_PATH);
  assert.equal(MOTIVATION_PAGE_PATH.includes('?'), false, 'no reason parameter to lose');
  assert.equal(MOTIVATION_PAGE_PATH.includes('#'), false, 'no fragment to lose');
  assert.ok(MOTIVATION_PAGE_PATH.startsWith('/'), 'a declarativeNetRequest extensionPath starts with /');
});

test('a motivation line is stable inside a minute and rotates after it', () => {
  const first = pickMotivationLine(STUDY_LINES, BASE);
  assert.deepEqual(pickMotivationLine(STUDY_LINES, BASE + 59_999), first, 'the same minute reads the same');
  assert.notDeepEqual(pickMotivationLine(STUDY_LINES, BASE + 60_000), first, 'the next minute reads another line');
});

test('every minute picks a line that is in the set, and the set rotates', () => {
  const seen = new Set<string>();
  for (let minute = 0; minute < 60; minute += 1) {
    const line = pickMotivationLine(ADULT_PAUSE_LINES, BASE + minute * 60_000);
    assert.ok(ADULT_PAUSE_LINES.includes(line));
    seen.add(line.title);
  }
  assert.equal(seen.size, ADULT_PAUSE_LINES.length, 'an hour of minutes shows every line');
});

test('a clock before the epoch still picks a line rather than crashing', () => {
  const line = pickMotivationLine(ADULT_PAUSE_LINES, -90_000);
  assert.ok(ADULT_PAUSE_LINES.includes(line));
});

test('an empty set falls back to a neutral line', () => {
  const line = pickMotivationLine([], BASE);
  assert.ok(line.title.length > 0);
  assert.ok(line.text.length > 0);
});

test('the adult-site pause lines never name the intervention, the wallet or a site', () => {
  for (const line of ADULT_PAUSE_LINES) {
    const text = `${line.title} ${line.text}`.toLowerCase();
    for (const word of ['block', 'blocked', 'balance', 'debt', 'earntime', 'adult', 'porn']) {
      assert.equal(text.includes(word), false, `the pause must not mention "${word}"`);
    }
  }
});

test('the study lines are encouragement for the block pages, and none of them is empty', () => {
  assert.ok(STUDY_LINES.length >= 4);
  for (const line of STUDY_LINES) {
    assert.ok(line.title.length > 0);
    assert.ok(line.text.length > 0);
    assert.ok(line.title.length < 80, 'a line stays short enough to read at a glance');
  }
});
