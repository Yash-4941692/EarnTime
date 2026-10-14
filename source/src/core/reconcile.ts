/**
 * Reconciliation after an interruption (extension disabled, service worker unable to run, browser
 * closed, machine asleep). Time that was not observed is estimated from browser history visits.
 *
 * Estimation rules (documented in the user guide and the limitations report):
 *  - A history visit is assumed to last until the next visit, capped at VISIT_CAP_MS.
 *  - The page that was active at the last checkpoint is assumed to last until the first visit,
 *    capped at VISIT_CAP_MS.
 *  - The final page in the gap is assumed to last until now, capped at VISIT_CAP_MS when the user
 *    is still on that host, otherwise at CONTINUATION_CAP_MS.
 *  - Half-productive sites are split down the middle: half credited as study, half charged as
 *    unproductive, and the stretch is recorded as a question (`HalfReview`) the user can answer.
 *    The split applies only to visits read from history; the page that was active at the last
 *    checkpoint keeps the mode that was verified for it before the gap.
 *  - When the browser was closed (startup inside the gap), only the last checkpoint is charged.
 *  - Charges that exceed the balance become debt, which productive time must repay.
 */

import {
  CONTINUATION_CAP_MS,
  MAX_RECONCILE_WINDOW_MS,
  MIN_HALF_REVIEW_MS,
  TICK_MS,
  VISIT_CAP_MS,
} from './constants';
import { countsForAccounting, gapRoleForHost } from './roles';
import { splitByLocalDay } from './time';
import { addLedger, pruneHalfReviews } from './wallet';
import { chargeInterval, type SliceResult } from './engine';
import type { EarnState, HalfReview, ReconcileSummary, Role } from './types';

export interface Visit {
  at: number;
  /** Host of the visited page, or null for non-http pages (new tab, chrome://, ...). */
  host: string | null;
}

export interface ReconcileInput {
  from: number;
  to: number;
  visits: Visit[];
  /** Checkpoint that was active at `from` (its role and host). */
  prevRole: Role | null;
  prevHost: string | null;
  /** Whether the user is currently on a counted page, and on which host. */
  current: { counts: boolean; host: string | null };
  /** Browser start time if it happened after `from`, otherwise null. */
  startupAt: number | null;
}

export interface Segment {
  from: number;
  to: number;
  role: Role;
  reason: 'startup-close' | 'page' | 'last-page';
  host: string | null;
  /**
   * True when the role was derived from a history visit, so the half-productive mode behind it is
   * unknown. Segments that continue the page active at the last checkpoint keep a verified role.
   */
  estimated: boolean;
}

export interface Plan {
  segments: Segment[];
  visitCount: number;
  cappedCount: number;
  startupCut: boolean;
  windowFrom: number;
}

export function planReconcile(state: EarnState, input: ReconcileInput): Plan {
  const windowFrom = Math.max(input.from, input.to - MAX_RECONCILE_WINDOW_MS);
  const segments: Segment[] = [];
  let cappedCount = 0;
  let startupCut = false;

  let visits = input.visits
    .filter((v) => v.at >= windowFrom && v.at <= input.to)
    .sort((a, b) => a.at - b.at);

  const prevCounts = input.prevRole !== null && countsForAccounting(input.prevRole);
  const prevRole = input.prevRole;

  if (input.startupAt !== null && input.startupAt > windowFrom && input.startupAt <= input.to) {
    startupCut = true;
    // The browser was closed; time after the last checkpoint is not known.
    if (prevCounts && prevRole) {
      segments.push({
        from: windowFrom,
        to: Math.min(windowFrom + TICK_MS, input.startupAt),
        role: prevRole,
        reason: 'startup-close',
        host: input.prevHost,
        estimated: false,
      });
    }
    visits = visits.filter((v) => v.at >= (input.startupAt as number));
  }

  // Timeline: the previous page (if it was counting) followed by every visit in the window.
  const timeline: Array<{ at: number; host: string | null; role: Role | null; estimated: boolean }> = [];
  if (!startupCut && prevCounts && prevRole) {
    timeline.push({ at: windowFrom, host: input.prevHost, role: prevRole, estimated: false });
  }
  for (const visit of visits) {
    timeline.push({
      at: visit.at,
      host: visit.host,
      role: visit.host ? gapRoleForHost(state, visit.host) : null,
      estimated: true,
    });
  }

  for (let i = 0; i < timeline.length; i++) {
    const item = timeline[i];
    if (!item.role || !item.host) continue;
    const nextAt = i + 1 < timeline.length ? timeline[i + 1].at : input.to;
    const isLast = i === timeline.length - 1;
    const stillHere = input.current.counts && input.current.host !== null && input.current.host === item.host;
    let span = nextAt - item.at;
    if (isLast && !stillHere) span = Math.min(span, CONTINUATION_CAP_MS);
    if (span > VISIT_CAP_MS) {
      span = VISIT_CAP_MS;
      cappedCount += 1;
    }
    if (span <= 0) continue;
    segments.push({
      from: item.at,
      to: item.at + span,
      role: item.role,
      reason: isLast ? 'last-page' : 'page',
      host: item.host,
      estimated: item.estimated,
    });
  }

  return {
    segments,
    visitCount: visits.length,
    cappedCount,
    startupCut,
    windowFrom,
  };
}

/** A per-host accumulator for the question an unverifiable half-productive stretch produces. */
interface HalfReviewDraft {
  host: string;
  entry: string;
  from: number;
  to: number;
  totalMs: number;
  productiveMs: number;
  creditedMs: number;
  chargedMs: number;
  /** Milliseconds of the estimate per local day, so a later answer lands on the days it came from. */
  parts: Map<string, number>;
}

/**
 * An unverifiable half-productive stretch is split down the middle: the first half is credited as
 * study (at the earn ratio), the rest is charged as unproductive and can create debt — the same
 * worst case as before, half as big. The stretch is then recorded as a question the user can answer.
 */
function chargeEstimatedHalf(state: EarnState, seg: Segment, drafts: Map<string, HalfReviewDraft>): SliceResult {
  const role = seg.role as Extract<Role, { k: 'half' }>;
  const ms = seg.to - seg.from;
  const productiveMs = Math.floor(ms / 2);
  const unproductiveMs = ms - productiveMs;
  const total: SliceResult = { creditMs: 0, chargedMs: 0, debtAddedMs: 0, repaidMs: 0 };

  if (productiveMs > 0) {
    const credited = chargeInterval(
      state,
      { ...role, mode: 'productive', degraded: false },
      seg.from,
      seg.from + productiveMs,
      'gap',
      seg.host,
    );
    total.creditMs += credited.creditMs;
    total.repaidMs += credited.repaidMs;
  }
  if (unproductiveMs > 0) {
    const charged = chargeInterval(
      state,
      { ...role, mode: 'unproductive', degraded: true },
      seg.from + productiveMs,
      seg.to,
      'gap',
      seg.host,
    );
    total.chargedMs += charged.chargedMs;
    total.debtAddedMs += charged.debtAddedMs;
  }

  if (seg.host && ms >= MIN_HALF_REVIEW_MS) {
    const draft = drafts.get(seg.host) ?? {
      host: seg.host,
      entry: role.entry,
      from: seg.from,
      to: seg.to,
      totalMs: 0,
      productiveMs: 0,
      creditedMs: 0,
      chargedMs: 0,
      parts: new Map<string, number>(),
    };
    draft.from = Math.min(draft.from, seg.from);
    draft.to = Math.max(draft.to, seg.to);
    draft.totalMs += ms;
    draft.productiveMs += productiveMs;
    draft.creditedMs += total.creditMs;
    draft.chargedMs += total.chargedMs;
    for (const slice of splitByLocalDay(seg.from, seg.to)) {
      draft.parts.set(slice.key, (draft.parts.get(slice.key) ?? 0) + (slice.to - slice.from));
    }
    drafts.set(seg.host, draft);
  }
  return total;
}

/**
 * Applies a plan to state in chronological order and records an auditable summary.
 * Productive time repays debt before growing the balance; charges beyond the balance create debt.
 * Half-productive visits whose mode cannot be verified are split in half and asked about.
 */
export function applyReconcile(state: EarnState, plan: Plan, input: ReconcileInput, now: number): ReconcileSummary {
  const ordered = [...plan.segments].sort((a, b) => a.from - b.from);
  let productiveCreditMs = 0;
  let chargedMs = 0;
  let debtAddedMs = 0;
  let repaidMs = 0;
  const perHost = new Map<string, { productiveMs: number; unproductiveMs: number }>();
  const halfDrafts = new Map<string, HalfReviewDraft>();

  for (const seg of ordered) {
    const part =
      seg.estimated && seg.role.k === 'half'
        ? chargeEstimatedHalf(state, seg, halfDrafts)
        : chargeInterval(state, seg.role, seg.from, seg.to, 'gap', seg.host);
    productiveCreditMs += part.creditMs;
    chargedMs += part.chargedMs;
    debtAddedMs += part.debtAddedMs;
    repaidMs += part.repaidMs;
    if (seg.host) {
      const current = perHost.get(seg.host) ?? { productiveMs: 0, unproductiveMs: 0 };
      current.productiveMs += part.creditMs;
      current.unproductiveMs += part.chargedMs;
      perHost.set(seg.host, current);
    }
  }

  for (const draft of halfDrafts.values()) {
    const review: HalfReview = {
      id: state.nextReviewId,
      at: now,
      host: draft.host,
      entry: draft.entry,
      from: draft.from,
      to: draft.to,
      totalMs: draft.totalMs,
      productiveMs: draft.productiveMs,
      creditedMs: draft.creditedMs,
      chargedMs: draft.chargedMs,
      parts: [...draft.parts.entries()].map(([day, ms]) => ({ day, ms })).sort((a, b) => a.day.localeCompare(b.day)),
      lastMode: state.modeLog[draft.entry]?.mode ?? null,
      resolvedAt: null,
    };
    state.nextReviewId += 1;
    state.halfReviews.push(review);
  }
  if (halfDrafts.size > 0) pruneHalfReviews(state, now);

  const breakdown = [...perHost.entries()]
    .flatMap(([host, value]) => {
      const rows: ReconcileSummary['breakdown'] = [];
      if (value.productiveMs > 0) rows.push({ host, ms: value.productiveMs, kind: 'productive' });
      if (value.unproductiveMs > 0) rows.push({ host, ms: value.unproductiveMs, kind: 'unproductive' });
      return rows;
    })
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 12);

  const summary: ReconcileSummary = {
    from: input.from,
    to: input.to,
    at: now,
    visits: plan.visitCount,
    cappedVisits: plan.cappedCount,
    productiveCreditMs,
    chargedMs,
    debtAddedMs,
    repaidMs,
    startupCut: plan.startupCut,
    breakdown,
  };
  state.lastReconcile = summary;

  const note =
    `Interruption ${Math.round((input.to - input.from) / 60000)} min: ` +
    `charged ${Math.round(chargedMs / 60000)} min, credited ${Math.round(productiveCreditMs / 60000)} min, ` +
    `debt added ${Math.round(debtAddedMs / 60000)} min`;
  addLedger(state, 'reconcile', now, chargedMs, note);
  return summary;
}
