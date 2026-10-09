/**
 * Screen-time analytics widgets. Plain Tailwind and divs — no chart library, because the whole point
 * of these numbers is that they are yours and nothing leaves the browser.
 */

import type { Analytics, DayPoint, SiteScreenTime } from '../core/analytics';
import { minutesLabel } from '../core/analytics';
import { formatDuration } from '../core/time';
import type { Tone } from './components';
import { Empty, ProgressBar } from './components';

export const KIND_TONE: Record<SiteScreenTime['kind'], Tone> = {
  productive: 'productive',
  half: 'half',
  unproductive: 'unproductive',
  neutral: 'neutral',
};

const KIND_LABEL: Record<SiteScreenTime['kind'], string> = {
  productive: 'Productive',
  half: 'Half-productive',
  unproductive: 'Unproductive',
  neutral: 'Not on a list',
};

const BAR: Record<Tone, string> = {
  productive: 'bg-emerald-400',
  unproductive: 'bg-amber-400',
  half: 'bg-sky-400',
  debt: 'bg-rose-400',
  neutral: 'bg-slate-500',
  paused: 'bg-slate-600',
  info: 'bg-slate-300',
};

/** One row of the per-site breakdown: name, share bar, and the time. */
export function SiteBar({ site, totalMs }: { site: SiteScreenTime; totalMs: number }) {
  const pct = totalMs > 0 ? Math.round((site.ms / totalMs) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
        <span className="min-w-0 truncate text-slate-200" title={`${site.host} · ${KIND_LABEL[site.kind]}`}>
          {site.host}
        </span>
        <span className="shrink-0 tabular-nums text-slate-400">
          {formatDuration(site.ms)} <span className="text-slate-600">· {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div className={`h-full rounded-full ${BAR[KIND_TONE[site.kind]]}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </li>
  );
}

export function SiteList({ sites, totalMs, otherMs, otherCount }: { sites: SiteScreenTime[]; totalMs: number; otherMs: number; otherCount: number }) {
  if (sites.length === 0) return <Empty>No screen time recorded yet today. It fills in as you browse.</Empty>;
  return (
    <ul className="space-y-2.5">
      {sites.map((site) => (
        <SiteBar key={site.host} site={site} totalMs={totalMs} />
      ))}
      {otherCount > 0 ? (
        <li className="flex items-baseline justify-between gap-3 border-t border-slate-800 pt-2 text-[12px] text-slate-500">
          <span>
            {otherCount} more site{otherCount === 1 ? '' : 's'}
          </span>
          <span className="tabular-nums">{formatDuration(otherMs)}</span>
        </li>
      ) : null}
    </ul>
  );
}

function dayLabel(point: DayPoint): string {
  if (point.daysAgo === 0) return 'Today';
  if (point.daysAgo === 1) return 'Yest.';
  const [y, m, d] = point.key.split('-');
  void y;
  return `${Number(d)}/${Number(m)}`;
}

/**
 * Stacked columns, one per day: study time at the bottom, half-productive in the middle,
 * unproductive on top. Height is normalised against the heaviest day in the window, so the shape of
 * the trend is readable even when the totals are small.
 */
export function TrendChart({ points, ariaLabel }: { points: DayPoint[]; ariaLabel: string }) {
  const max = Math.max(1, ...points.map((p) => p.screenMs));
  return (
    <div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={ariaLabel}>
        {points.map((point) => {
          const study = point.prodMs;
          const half = point.halfMs;
          const unprod = point.unprodMs;
          const other = Math.max(0, point.screenMs - study - half - unprod);
          const segment = (ms: number, tone: Tone, key: string) =>
            ms > 0 ? (
              <div
                key={key}
                className={`w-full ${BAR[tone]}`}
                style={{ height: `${(ms / max) * 100}%` }}
                title={`${formatDuration(ms)}`}
              />
            ) : null;
          return (
            <div key={point.key} className="group flex min-w-0 flex-1 flex-col justify-end gap-px" title={`${point.key} · ${formatDuration(point.screenMs)} screen time`}>
              <div className="flex h-32 w-full flex-col justify-end overflow-hidden rounded-t-[3px] bg-slate-900/60">
                {segment(other, 'paused', 'other')}
                {segment(unprod, 'unproductive', 'unprod')}
                {segment(half, 'half', 'half')}
                {segment(study, 'productive', 'study')}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {points.map((point) => (
          <span
            key={point.key}
            className={`min-w-0 flex-1 truncate text-center text-[9.5px] tabular-nums ${point.daysAgo === 0 ? 'font-semibold text-slate-200' : 'text-slate-600'}`}
          >
            {dayLabel(point)}
          </span>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <li className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${BAR.productive}`} /> Study
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${BAR.half}`} /> Half-productive
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${BAR.unproductive}`} /> Unproductive
        </li>
        <li className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-sm ${BAR.paused}`} /> Other screen time
        </li>
      </ul>
    </div>
  );
}

/** Signed duration for "vs yesterday" style comparisons. */
export function deltaLabel(ms: number): string {
  const sign = ms > 0 ? '+' : ms < 0 ? '−' : '±';
  return `${sign}${formatDuration(Math.abs(ms))}`;
}

/** One-line summary of whether the trend is improving, for screen readers and small layouts. */
export function trendSentence(a: Analytics): string {
  if (a.screenMs === 0) return 'No screen time recorded yet today.';
  const parts: string[] = [];
  if (a.deltaVsYesterdayMs !== null) {
    parts.push(
      a.deltaVsYesterdayMs > 0
        ? `${deltaLabel(a.deltaVsYesterdayMs)} more screen time than yesterday`
        : a.deltaVsYesterdayMs < 0
          ? `${deltaLabel(a.deltaVsYesterdayMs)} less screen time than yesterday`
          : 'the same screen time as yesterday',
    );
  }
  parts.push(`${Math.round(a.studyShare * 100)}% of it was study time`);
  return `${parts.join('; ')}.`;
}

/** The exact/estimated split, shown whenever part of a day came from history. */
export function EstimateNote({ analytics }: { analytics: Analytics }) {
  if (!analytics.partlyEstimated) return null;
  return (
    <p className="text-[11.5px] leading-snug text-slate-500">
      {formatDuration(analytics.estimatedScreenMs)} of today's screen time is <strong className="text-slate-400">estimated</strong> from
      browsing history, because EarnTime was not running (worker suspended, browser closed, or extension disabled). Exact:{' '}
      {minutesLabel(analytics.exactScreenMs)} min.
    </p>
  );
}

/** Study share of the day, as a labelled progress bar. */
export function StudyShare({ analytics }: { analytics: Analytics }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-slate-400">Study share of screen time</span>
        <span className="tabular-nums text-emerald-300">{Math.round(analytics.studyShare * 100)}%</span>
      </div>
      <ProgressBar value={analytics.studyShare} tone="productive" label="Study share of today's screen time" />
    </div>
  );
}
