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
 *  - Half-productive sites are charged as unproductive (their mode cannot be verified).
 *  - When the browser was closed (startup inside the gap), only the last checkpoint is charged.
 *  - Charges that exceed the balance become debt, which productive time must repay.
 */

import {
  CONTINUATION_CAP_MS,
  MAX_RECONCILE_WINDOW_MS,
  TICK_MS,
  VISIT_CAP_MS,
} from './constants';
import { countsForAccounting, gapRoleForHost } from './roles';
import { addLedger } from './wallet';
import { chargeInterval } from './engine';
import type { EarnState, ReconcileSummary, Role } from './types';

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
      });
    }
    visits = visits.filter((v) => v.at >= (input.startupAt as number));
  }

  // Timeline: the previous page (if it was counting) followed by every visit in the window.
  const timeline: Array<{ at: number; host: string | null; role: Role | null }> = [];
  if (!startupCut && prevCounts && prevRole) {
    timeline.push({ at: windowFrom, host: input.prevHost, role: prevRole });
  }
  for (const visit of visits) {
    timeline.push({
      at: visit.at,
      host: visit.host,
      role: visit.host ? gapRoleForHost(state, visit.host) : null,
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

/**
 * Applies a plan to state in chronological order and records an auditable summary.
 * Productive time repays debt before growing the balance; charges beyond the balance create debt.
 */
export function applyReconcile(state: EarnState, plan: Plan, input: ReconcileInput, now: number): ReconcileSummary {
  const ordered = [...plan.segments].sort((a, b) => a.from - b.from);
  let productiveCreditMs = 0;
  let chargedMs = 0;
  let debtAddedMs = 0;
  let repaidMs = 0;
  const perHost = new Map<string, { ms: number; kind: 'productive' | 'unproductive' }>();

  for (const seg of ordered) {
    const part = chargeInterval(state, seg.role, seg.from, seg.to, 'gap', seg.host);
    productiveCreditMs += part.creditMs;
    chargedMs += part.chargedMs;
    debtAddedMs += part.debtAddedMs;
    repaidMs += part.repaidMs;
    if (seg.host) {
      const kind: 'productive' | 'unproductive' = seg.role.k === 'productive' ? 'productive' : 'unproductive';
      const amount = kind === 'productive' ? part.creditMs : part.chargedMs;
      if (amount > 0) {
        const current = perHost.get(seg.host) ?? { ms: 0, kind };
        current.ms += amount;
        perHost.set(seg.host, current);
      }
    }
  }

  const breakdown = [...perHost.entries()]
    .map(([host, value]) => ({ host, ms: value.ms, kind: value.kind }))
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
