/** View model for the popup and settings pages. Pure; the UI supplies `now`. */

import { creditFor } from './engine';
import { dayKey } from './time';
import { roleLabel } from './roles';
import { debtProgress, emptyDayStats } from './wallet';
import type { DayStats, EarnState, LiveStatus } from './types';

/** Interpolation is capped so a stalled worker never shows a balance that is too low for long. */
const MAX_INTERPOLATION_MS = 35_000;

export type ModeTone = 'productive' | 'unproductive' | 'half' | 'paused' | 'debt' | 'neutral';

export interface DashboardView {
  setupDone: boolean;
  balanceMs: number;
  debtMs: number;
  debtRepaidRatio: number;
  debtRepaidMs: number;
  debtOriginMs: number;
  /** Productive time still required to clear the debt, using the current ratio. */
  requiredProductiveMs: number;
  ratioLabel: string;
  today: DayStats;
  earnedToday: number;
  usedToday: number;
  productiveToday: number;
  unproductiveToday: number;
  halfToday: number;
  modeLabel: string;
  modeTone: ModeTone;
  currentHost: string | null;
  lastReconcileAt: number | null;
  /** True while the balance is being consumed right now (drives a 1-second refresh in the UI). */
  spendingNow: boolean;
  /** True while productive time is earning right now, so the popup can interpolate upward. */
  earningNow: boolean;
  /** Milliseconds the active tab's half-productive session has been running, or null. */
  sessionMs: number | null;
}

/** Productive minutes needed to clear `debtMs`, rounded up, at the current ratio. */
export function requiredProductiveFor(debtMs: number, earnFromMin: number, earnToMin: number): number {
  if (debtMs <= 0) return 0;
  return Math.ceil((debtMs * earnFromMin) / earnToMin / 60_000) * 60_000;
}

export function modeFromLive(live: LiveStatus | null, debt: boolean): { label: string; tone: ModeTone } {
  if (debt) return { label: 'DEBT MODE · study to repay', tone: 'debt' };
  if (!live) return { label: 'Starting…', tone: 'paused' };
  const label = roleLabel({ k: live.k, mode: live.mode, degraded: live.degraded, why: live.why });
  switch (live.k) {
    case 'productive':
      return { label, tone: 'productive' };
    case 'unproductive':
      return { label, tone: 'unproductive' };
    case 'half':
      return { label, tone: 'half' };
    case 'neutral':
      return { label, tone: 'neutral' };
    default:
      return { label, tone: 'paused' };
  }
}

function spendingNow(live: LiveStatus | null): boolean {
  if (!live) return false;
  if (live.k === 'unproductive') return true;
  return live.k === 'half' && (live.mode === 'unproductive' || live.degraded);
}

function earningNow(live: LiveStatus | null): boolean {
  if (!live) return false;
  if (live.k === 'productive') return true;
  return live.k === 'half' && live.mode === 'productive' && !live.degraded;
}

export function dashboardView(state: EarnState, now: number): DashboardView {
  const today = state.days[dayKey(now)] ?? emptyDayStats();
  const progress = debtProgress(state);
  const moving = spendingNow(state.live) && state.debtMs === 0;
  const earning = earningNow(state.live) && state.debtMs === 0;

  // Between checkpoints the display is interpolated from the last stored checkpoint, so the
  // numbers move every second: spending subtracts exactly the elapsed time (never double — the
  // next checkpoint charges the same interval only once) and earning credits it at the ratio.
  let balanceMs = state.balanceMs;
  let earnedToday = today.earnedMs;
  let usedToday = today.usedMs;
  if ((moving || earning) && state.lastAt !== null) {
    const elapsed = Math.min(MAX_INTERPOLATION_MS, Math.max(0, now - state.lastAt));
    if (moving) {
      balanceMs = Math.max(0, balanceMs - elapsed);
      usedToday += elapsed;
    } else if (earning) {
      const credit = creditFor(state, elapsed);
      balanceMs += credit;
      earnedToday += credit;
    }
  }

  const tabId = state.live?.tabId ?? null;
  const session = tabId === null ? undefined : state.sessions[String(tabId)];
  const sessionMs = session ? Math.max(0, now - session.since) : null;

  const mode = modeFromLive(state.live, state.debtMs > 0);
  return {
    setupDone: state.setupDone,
    balanceMs,
    debtMs: state.debtMs,
    debtRepaidRatio: progress.ratio,
    debtRepaidMs: progress.repaidMs,
    debtOriginMs: state.debtOriginMs,
    requiredProductiveMs: requiredProductiveFor(state.debtMs, state.settings.earnFromMin, state.settings.earnToMin),
    ratioLabel: `${state.settings.earnFromMin} productive min → ${state.settings.earnToMin} min`,
    today,
    earnedToday,
    usedToday,
    productiveToday: today.prodMs,
    unproductiveToday: today.unprodMs,
    halfToday: today.halfProdMs + today.halfUnprodMs,
    modeLabel: mode.label,
    modeTone: mode.tone,
    currentHost: state.live?.host ?? null,
    lastReconcileAt: state.lastReconcile?.at ?? null,
    spendingNow: moving,
    earningNow: earning,
    sessionMs,
  };
}
