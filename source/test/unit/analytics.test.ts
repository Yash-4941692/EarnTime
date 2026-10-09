/**
 * Screen-time analytics: what the day cost, where it went, and whether the trend is improving.
 * These are the numbers the popup and Settings show, so the rules that produce them are pinned here.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyticsView, dayKeyAgo, displayHost, minutesLabel, sitesForDay } from '../../src/core/analytics';
import { ANALYTICS_TOP_SITES } from '../../src/core/constants';
import { addScreenTime, emptyDayStats, statsFor } from '../../src/core/wallet';
import { dayKey } from '../../src/core/time';
import type { DayStats, EarnState } from '../../src/core/types';

const MIN = 60_000;
/** 2026-10-08 09:00 local. */
const T0 = new Date(2026, 9, 8, 9, 0, 0).getTime();

function stateWith(overrides: Partial<EarnState> = {}): EarnState {
  return {
    schema: 5,
    setupDone: true,
    historyGranted: true,
    createdAt: T0 - 30 * 24 * 60 * MIN,
    settings: { earnFromMin: 60, earnToMin: 5, unlockCostMin: 10, youtubeKeywords: ['Study'] },
    rules: { productive: ['khanacademy.org'], half: ['youtube.com'], unproductive: ['instagram.com'] },
    balanceMs: 20 * MIN,
    debtMs: 0,
    debtOriginMs: 0,
    debtSince: null,
    tasks: [],
    days: {},
    ledger: [],
    nextLedgerId: 1,
    sessions: {},
    modeLog: {},
    last: null,
    lastAt: null,
    live: null,
    lastReconcile: null,
    browserStartAt: null,
    revision: 1,
    ...overrides,
  };
}

function day(overrides: Partial<DayStats> = {}): DayStats {
  return { ...emptyDayStats(), ...overrides };
}

test('displayHost makes one site out of its www and non-www hostnames', () => {
  assert.equal(displayHost('WWW.YouTube.com'), 'youtube.com');
  assert.equal(displayHost('m.youtube.com'), 'm.youtube.com');
  assert.equal(displayHost('example.org'), 'example.org');
});

test('screen time is recorded per host, including hosts EarnTime does not bill', () => {
  const state = stateWith();
  const key = dayKey(T0);
  addScreenTime(state, key, 'www.khanacademy.org', 30 * MIN, false);
  addScreenTime(state, key, 'news.example', 10 * MIN, false);
  addScreenTime(state, key, 'instagram.com', 5 * MIN, false);
  const stats = state.days[key];
  assert.equal(stats.screenMs, 45 * MIN);
  assert.equal(stats.estimatedScreenMs, 0);
  assert.deepEqual(stats.hosts, { 'www.khanacademy.org': 30 * MIN, 'news.example': 10 * MIN, 'instagram.com': 5 * MIN });
  // Screen time is a measurement, not a bill: nothing moved.
  assert.equal(state.balanceMs, 20 * MIN);
  assert.equal(stats.usedMs + stats.earnedMs, 0);
});

test('estimated screen time from history is tracked separately from observed time', () => {
  const state = stateWith();
  const key = dayKey(T0);
  addScreenTime(state, key, 'youtube.com', 20 * MIN, false);
  addScreenTime(state, key, 'reddit.com', 12 * MIN, true);
  assert.equal(state.days[key].screenMs, 32 * MIN);
  assert.equal(state.days[key].estimatedScreenMs, 12 * MIN);
});

test('non-positive and hostless screen time is ignored', () => {
  const state = stateWith();
  const key = dayKey(T0);
  addScreenTime(state, key, 'youtube.com', 0, false);
  addScreenTime(state, key, 'youtube.com', -5 * MIN, false);
  addScreenTime(state, key, null, 5 * MIN, false);
  assert.equal(state.days[key].screenMs, 5 * MIN, 'a hostless interval still counts as screen time');
  assert.deepEqual(state.days[key].hosts, {}, 'but it cannot be attributed to a site');
});

test('the per-site breakdown is capped so a long tail cannot grow storage forever', () => {
  const state = stateWith();
  const key = dayKey(T0);
  for (let i = 0; i < 80; i += 1) addScreenTime(state, key, `site${i}.example`, (i + 1) * MIN, false);
  const hosts = Object.keys(state.days[key].hosts);
  assert.ok(hosts.length <= 60, `kept ${hosts.length}`);
  assert.ok(hosts.includes('site79.example'), 'the biggest sites are the ones kept');
  assert.ok(!hosts.includes('site0.example'), 'the smallest are dropped');
});

test('sitesForDay groups www and non-www together and sorts biggest first', () => {
  const state = stateWith();
  const stats = day({ hosts: { 'www.youtube.com': 30 * MIN, 'youtube.com': 10 * MIN, 'm.youtube.com': 5 * MIN, 'khanacademy.org': 60 * MIN } });
  const sites = sitesForDay(state, stats, 105 * MIN);
  assert.deepEqual(
    sites.map((s) => [s.host, s.ms, s.kind]),
    [
      ['khanacademy.org', 60 * MIN, 'productive'],
      ['youtube.com', 40 * MIN, 'half'],
      ['m.youtube.com', 5 * MIN, 'half'],
    ],
  );
  assert.equal(sites[0].share, 60 / 105);
});

test('analytics separates billed time from screen time and says what was not billed', () => {
  const state = stateWith();
  const key = dayKey(T0);
  state.days[key] = day({
    prodMs: 60 * MIN,
    halfProdMs: 20 * MIN,
    halfUnprodMs: 10 * MIN,
    unprodMs: 15 * MIN,
    earnedMs: 7 * MIN,
    usedMs: 25 * MIN,
    screenMs: 140 * MIN,
    estimatedScreenMs: 20 * MIN,
    hosts: { 'khanacademy.org': 60 * MIN, 'www.youtube.com': 30 * MIN, 'instagram.com': 15 * MIN, 'news.example': 35 * MIN },
  });
  const a = analyticsView(state, T0);
  assert.equal(a.screenMs, 140 * MIN);
  assert.equal(a.billedMs, 105 * MIN, 'productive + half (both modes) + unproductive');
  assert.equal(a.unbilledMs, 35 * MIN, 'the neutral site nobody charges for');
  assert.equal(a.exactScreenMs, 120 * MIN);
  assert.equal(a.estimatedScreenMs, 20 * MIN);
  assert.equal(a.partlyEstimated, true);
  // Study share counts credited study time only, not Unproductive Mode on a half site.
  assert.equal(a.studyShare, 80 / 140);
  assert.deepEqual(a.sites.map((s) => s.host), ['khanacademy.org', 'news.example', 'youtube.com', 'instagram.com']);
});

test('an empty day produces an empty analytics view rather than a division by zero', () => {
  const a = analyticsView(stateWith(), T0);
  assert.equal(a.screenMs, 0);
  assert.deepEqual(a.sites, []);
  assert.equal(a.studyShare, 0);
  assert.equal(a.averageScreenMs, 0);
  assert.equal(a.deltaVsAverageMs, null);
  assert.equal(a.trend.length, 14);
  assert.ok(a.trend.every((p) => p.empty));
});

test('the trend compares today with yesterday and with the window average', () => {
  const state = stateWith();
  state.days[dayKeyAgo(T0, 0)] = day({ screenMs: 90 * MIN, prodMs: 30 * MIN, earnedMs: 3 * MIN, usedMs: 20 * MIN });
  state.days[dayKeyAgo(T0, 1)] = day({ screenMs: 60 * MIN, prodMs: 40 * MIN, earnedMs: 4 * MIN, usedMs: 10 * MIN });
  state.days[dayKeyAgo(T0, 2)] = day({ screenMs: 30 * MIN, prodMs: 20 * MIN, earnedMs: 2 * MIN, usedMs: 5 * MIN });
  const a = analyticsView(state, T0);

  assert.equal(a.deltaVsYesterdayMs, 30 * MIN, 'more screen time than yesterday');
  assert.equal(a.averageScreenMs, 60 * MIN);
  assert.equal(a.deltaVsAverageMs, 30 * MIN);
  assert.equal(a.totals.screenMs, 180 * MIN);
  assert.equal(a.totals.earnedMs, 9 * MIN);
  assert.equal(a.totals.usedMs, 35 * MIN);
  // The trend is oldest-first so a chart reads left to right into today.
  assert.deepEqual(a.trend.map((p) => p.daysAgo), [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  assert.equal(a.trend[a.trend.length - 1].screenMs, 90 * MIN);
  assert.equal(a.trend[a.trend.length - 1].netMs, -17 * MIN, 'earned minus used');
});

test('a lighter day than yesterday reads as an improvement', () => {
  const state = stateWith();
  state.days[dayKeyAgo(T0, 0)] = day({ screenMs: 20 * MIN });
  state.days[dayKeyAgo(T0, 1)] = day({ screenMs: 100 * MIN });
  const a = analyticsView(state, T0);
  assert.equal(a.deltaVsYesterdayMs, -80 * MIN);
});

test('days without any record are marked empty and left out of the average', () => {
  const state = stateWith();
  state.days[dayKeyAgo(T0, 0)] = day({ screenMs: 40 * MIN });
  state.days[dayKeyAgo(T0, 3)] = day({ screenMs: 80 * MIN });
  const a = analyticsView(state, T0);
  assert.equal(a.averageScreenMs, 60 * MIN, 'two days with data, not fourteen');
  assert.equal(a.trend.filter((p) => p.empty).length, 12);
});

test('analytics reports whether screen-time access is on, so a gap is never shown as zero', () => {
  const withAccess = analyticsView(stateWith({ historyGranted: true }), T0);
  const without = analyticsView(stateWith({ historyGranted: false }), T0);
  assert.equal(withAccess.historyGranted, true);
  assert.equal(without.historyGranted, false);
});

test('dayKeyAgo walks back over local days, including month boundaries', () => {
  const firstOfMarch = new Date(2026, 2, 1, 12).getTime();
  assert.equal(dayKeyAgo(firstOfMarch, 0), '2026-03-01');
  assert.equal(dayKeyAgo(firstOfMarch, 1), '2026-02-28');
  assert.equal(dayKeyAgo(firstOfMarch, 2), '2026-02-27');
});

test('minutesLabel keeps sub-minute values readable', () => {
  assert.equal(minutesLabel(0), '0.00');
  assert.equal(minutesLabel(30_000), '0.50');
  assert.equal(minutesLabel(90 * MIN), '90.0');
  assert.equal(minutesLabel(-5), '0.00');
});

test('the site list is capped for display, with the remainder summarised', () => {
  const state = stateWith();
  const key = dayKey(T0);
  const hosts: Record<string, number> = {};
  for (let i = 0; i < ANALYTICS_TOP_SITES + 5; i += 1) hosts[`site${i}.example`] = (i + 1) * MIN;
  state.days[key] = day({ hosts, screenMs: Object.values(hosts).reduce((a, b) => a + b, 0) });
  const a = analyticsView(state, T0);
  assert.equal(a.sites.length, ANALYTICS_TOP_SITES);
  assert.equal(a.otherSitesCount, 5);
  assert.equal(a.otherSitesMs, (1 + 2 + 3 + 4 + 5) * MIN);
});

test('statsFor creates a day bucket with the screen-time fields present', () => {
  const state = stateWith();
  const stats = statsFor(state, dayKey(T0));
  assert.deepEqual(stats.hosts, {});
  assert.equal(stats.screenMs, 0);
  assert.equal(stats.estimatedScreenMs, 0);
});
