/**
 * Screen-time analytics: where the day actually went, and whether the trend is improving.
 *
 * Two kinds of number live here, and they are kept apart on purpose:
 *
 *  - **Charged and credited time** — EarnTime's own accounting. Exact, and the only thing that moves
 *    the balance or the debt.
 *  - **Screen time** — every minute a site was in the foreground of a focused window, including
 *    neutral sites EarnTime does not bill, internal pages, and pages closed by a filter. This is the
 *    number that answers "where did my day go", and it is normally larger than the billed time.
 *
 * Screen time observed while the worker was running is exact. Screen time reconstructed from browser
 * history after an interruption (worker suspended, browser closed, extension disabled) is estimated
 * with the same per-visit cap as reconciliation, and is reported separately so a bar chart is never
 * silently mixing measurements with guesses. Without screen-time access there are no estimates at
 * all, and the analytics say so rather than showing a hole as if it were zero.
 *
 * Pure: no Chrome APIs, the UI supplies `now`.
 */

import { ANALYTICS_TOP_SITES, ANALYTICS_TREND_DAYS, DAY_RETENTION, MINUTE_MS } from './constants';
import { classifyHost } from './domains';
import { dayKey } from './time';
import { emptyDayStats } from './wallet';
import type { DayStats, EarnState, ListName } from './types';

export type ScreenKind = ListName | 'neutral';

export interface SiteScreenTime {
  /** Bare hostname with a leading `www.` removed, so one site is one row. */
  host: string;
  ms: number;
  kind: ScreenKind;
  /** Share of the day's total screen time, 0..1. */
  share: number;
}

export interface DayPoint {
  key: string;
  /** 1 = today, 2 = yesterday, … so the UI can label without re-deriving dates. */
  daysAgo: number;
  screenMs: number;
  estimatedScreenMs: number;
  prodMs: number;
  unprodMs: number;
  halfMs: number;
  earnedMs: number;
  usedMs: number;
  /** Balance at the end of that day is not stored, so the trend shows the day's net movement. */
  netMs: number;
  /** True when EarnTime has no bucket for that day at all. */
  empty: boolean;
}

export interface Analytics {
  dayKey: string;
  today: DayStats;
  screenMs: number;
  estimatedScreenMs: number;
  exactScreenMs: number;
  billedMs: number;
  unbilledMs: number;
  sites: SiteScreenTime[];
  otherSitesMs: number;
  otherSitesCount: number;
  trend: DayPoint[];
  totals: {
    screenMs: number;
    earnedMs: number;
    usedMs: number;
    prodMs: number;
  };
  /** Average screen time per day over the trend window, counting only days with data. */
  averageScreenMs: number;
  /** Today's screen time minus yesterday's; positive means more screen time than yesterday. */
  deltaVsYesterdayMs: number | null;
  /** Today's screen time minus the window average; positive means a heavier day than usual. */
  deltaVsAverageMs: number | null;
  /** Study share of screen time today (productive + half-productive study time / screen time). */
  studyShare: number;
  historyGranted: boolean;
  /** True when part of today's screen time came from history rather than from observation. */
  partlyEstimated: boolean;
}

/** `www.youtube.com` and `youtube.com` are the same site to a human, so they are one row. */
export function displayHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

function kindOf(host: string, state: EarnState): ScreenKind {
  const cls = classifyHost(host, state.rules);
  return cls.kind === 'neutral' ? 'neutral' : cls.kind;
}

/** Per-site screen time for one day, biggest first, grouped by bare hostname. */
export function sitesForDay(state: EarnState, day: DayStats, totalMs: number): SiteScreenTime[] {
  const grouped = new Map<string, number>();
  for (const [host, ms] of Object.entries(day.hosts ?? {})) {
    if (!(ms > 0)) continue;
    const key = displayHost(host);
    grouped.set(key, (grouped.get(key) ?? 0) + ms);
  }
  return [...grouped.entries()]
    .map(([host, ms]) => ({ host, ms, kind: kindOf(host, state), share: totalMs > 0 ? ms / totalMs : 0 }))
    .sort((a, b) => b.ms - a.ms || a.host.localeCompare(b.host));
}

function dayPoint(state: EarnState, key: string, daysAgo: number): DayPoint {
  const day = state.days[key] ?? emptyDayStats();
  const halfMs = day.halfProdMs + day.halfUnprodMs;
  return {
    key,
    daysAgo,
    screenMs: day.screenMs,
    estimatedScreenMs: day.estimatedScreenMs,
    prodMs: day.prodMs,
    unprodMs: day.unprodMs,
    halfMs,
    earnedMs: day.earnedMs,
    usedMs: day.usedMs,
    netMs: day.earnedMs - day.usedMs,
    empty: !state.days[key],
  };
}

/** Local day key `daysAgo` days before `now`. */
export function dayKeyAgo(now: number, daysAgo: number): string {
  const d = new Date(now);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysAgo).getTime());
}

/**
 * Builds the analytics view. `days` defaults to the trend window; the per-site list is today's.
 */
export function analyticsView(state: EarnState, now: number, days = ANALYTICS_TREND_DAYS): Analytics {
  const key = dayKey(now);
  const today = state.days[key] ?? emptyDayStats();
  const screenMs = Math.max(0, today.screenMs);
  const estimatedScreenMs = Math.min(screenMs, Math.max(0, today.estimatedScreenMs));
  const billedMs = today.prodMs + today.halfProdMs + today.halfUnprodMs + today.unprodMs;

  const all = sitesForDay(state, today, screenMs);
  const sites = all.slice(0, ANALYTICS_TOP_SITES);
  const rest = all.slice(ANALYTICS_TOP_SITES);

  const trend: DayPoint[] = [];
  for (let ago = Math.min(days, DAY_RETENTION) - 1; ago >= 0; ago -= 1) {
    trend.push(dayPoint(state, dayKeyAgo(now, ago), ago));
  }

  const withData = trend.filter((point) => !point.empty && point.screenMs > 0);
  const totals = withData.reduce(
    (acc, point) => ({
      screenMs: acc.screenMs + point.screenMs,
      earnedMs: acc.earnedMs + point.earnedMs,
      usedMs: acc.usedMs + point.usedMs,
      prodMs: acc.prodMs + point.prodMs + point.halfMs,
    }),
    { screenMs: 0, earnedMs: 0, usedMs: 0, prodMs: 0 },
  );
  const averageScreenMs = withData.length > 0 ? Math.round(totals.screenMs / withData.length) : 0;

  const yesterday = trend.length >= 2 ? trend[trend.length - 2] : null;
  const studyMs = today.prodMs + today.halfProdMs;

  return {
    dayKey: key,
    today,
    screenMs,
    estimatedScreenMs,
    exactScreenMs: screenMs - estimatedScreenMs,
    billedMs,
    unbilledMs: Math.max(0, screenMs - billedMs),
    sites,
    otherSitesMs: rest.reduce((sum, site) => sum + site.ms, 0),
    otherSitesCount: rest.length,
    trend,
    totals,
    averageScreenMs,
    deltaVsYesterdayMs: yesterday && !yesterday.empty ? screenMs - yesterday.screenMs : null,
    deltaVsAverageMs: averageScreenMs > 0 ? screenMs - averageScreenMs : null,
    studyShare: screenMs > 0 ? Math.min(1, studyMs / screenMs) : 0,
    historyGranted: state.historyGranted,
    partlyEstimated: estimatedScreenMs > 0,
  };
}

/** Minutes, to one decimal, for charts and tooltips. */
export function minutesLabel(ms: number): string {
  return (Math.max(0, ms) / MINUTE_MS).toFixed(ms < MINUTE_MS ? 2 : 1);
}
