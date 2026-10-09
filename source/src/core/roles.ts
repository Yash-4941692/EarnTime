/**
 * Decides what a browser observation means for accounting and for blocking.
 * Pure: no Chrome APIs. The controller feeds it observations and applies the results.
 */

import { GUARDED_PAGE_PREFIXES, YOUTUBE_HOST_SUFFIX } from './constants';
import { classifyHost } from './domains';
import type { EarnState, FilterState, HalfSession, Observation, Role } from './types';

export type BlockReason = 'debt' | 'exhausted';

/**
 * The money fields alone. Several rules only need the balance and the debt, and taking the narrow
 * view lets a content script reuse the very same logic on the persisted numbers it can read while a
 * page loads — one implementation, two callers, no second set of rules to drift.
 */
export interface MoneyView {
  balanceMs: number;
  debtMs: number;
}

/** The half-productive session table. */
export interface SessionView {
  sessions: Record<string, HalfSession>;
}

export function sessionFor(state: SessionView, tabId: number | null, entry: string): HalfSession | null {
  if (tabId === null) return null;
  const session = state.sessions[String(tabId)];
  return session && session.entry === entry ? session : null;
}

export function canUseUnproductive(state: MoneyView): boolean {
  return state.balanceMs > 0 && state.debtMs === 0;
}

export function isDebtMode(state: MoneyView): boolean {
  return state.debtMs > 0;
}

export function isExhausted(state: MoneyView): boolean {
  return state.debtMs === 0 && state.balanceMs <= 0;
}

/**
 * Which filter a half-productive page needs in Productive Mode. Pages without a filter are
 * trusted (the user chose Productive Mode); see the README limitations.
 */
export function filterStateNeeded(host: string | null): boolean {
  if (!host) return false;
  return host === YOUTUBE_HOST_SUFFIX || host.endsWith(`.${YOUTUBE_HOST_SUFFIX}`);
}

/** Role of the active tab at the moment of observation. */
export function roleOf(state: EarnState, obs: Observation): Role {
  if (!obs.focused || !obs.tabActive) return { k: 'none', why: 'background' };
  if (obs.idle === 'locked') return { k: 'none', why: 'locked' };
  if (obs.idle === 'idle' && !obs.audible) return { k: 'none', why: 'idle' };
  if (obs.internalPage || obs.host === null) return { k: 'none', why: 'internal' };

  const host = obs.host;
  const cls = classifyHost(host, state.rules);
  switch (cls.kind) {
    case 'productive':
      return { k: 'productive', host: cls.entry ?? host };
    case 'unproductive':
      return { k: 'unproductive', host: cls.entry ?? host };
    case 'neutral':
      return { k: 'neutral', host };
    case 'half': {
      const entry = cls.entry ?? host;
      const session = sessionFor(state, obs.tabId, entry);
      if (!session) return { k: 'none', why: 'choose-mode', host };
      if (session.mode === 'unproductive') {
        return { k: 'half', host, entry, mode: 'unproductive', degraded: false };
      }
      const filter: FilterState = obs.filterState;
      if (!filterStateNeeded(host)) {
        return { k: 'half', host, entry, mode: 'productive', degraded: false };
      }
      if (filter === 'ok') return { k: 'half', host, entry, mode: 'productive', degraded: false };
      if (filter === 'covered') return { k: 'none', why: 'filter-covered', host };
      if (filter === 'pending') return { k: 'none', why: 'filter-pending', host };
      // Filter failing, unreported or unknown: fail closed. Time is charged as unproductive.
      return { k: 'half', host, entry, mode: 'productive', degraded: true };
    }
  }
}

/** Roles that move screen time (earn or charge). */
export function countsForAccounting(role: Role): boolean {
  return role.k === 'productive' || role.k === 'unproductive' || role.k === 'half';
}

/**
 * Role used for reconciliation of a history visit to `host`. Interruptions cannot be verified,
 * so half-productive visits are charged as unproductive (fail closed).
 */
export function gapRoleForHost(state: EarnState, host: string): Role {
  const cls = classifyHost(host, state.rules);
  if (cls.kind === 'productive') return { k: 'productive', host: cls.entry ?? host };
  if (cls.kind === 'unproductive') return { k: 'unproductive', host: cls.entry ?? host };
  if (cls.kind === 'half') {
    return { k: 'half', host, entry: cls.entry ?? host, mode: 'unproductive', degraded: true };
  }
  return { k: 'neutral', host };
}

/**
 * Whether a tab on `host` must be sent to the block page right now.
 * Debt restricts browsing to productive sites (and half sites in Productive Mode or not yet chosen).
 * Zero balance blocks unproductive sites and half sites in Unproductive Mode.
 */
export function blockReasonForHost(state: EarnState, host: string | null, tabId: number | null): BlockReason | null {
  if (host === null) return null;
  const cls = classifyHost(host, state.rules);
  if (isDebtMode(state)) {
    if (cls.kind === 'productive') return null;
    if (cls.kind === 'half') {
      const session = sessionFor(state, tabId, cls.entry ?? host);
      return session && session.mode === 'unproductive' ? 'debt' : null;
    }
    return 'debt';
  }
  if (isExhausted(state)) {
    if (cls.kind === 'unproductive') return 'exhausted';
    if (cls.kind === 'half') {
      const session = sessionFor(state, tabId, cls.entry ?? host);
      return session && session.mode === 'unproductive' ? 'exhausted' : null;
    }
  }
  return null;
}

/** Chrome-internal pages that EarnTime sends to the block page (see guard.ts for the reasoning). */
export function isGuardedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return GUARDED_PAGE_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}?`) || lower.startsWith(`${prefix}#`),
  );
}

/** Human-readable label for the current role, used by the popup and settings. */
export function roleLabel(role: { k: Role['k']; mode?: string | null; degraded?: boolean; why?: string | null }): string {
  switch (role.k) {
    case 'productive':
      return 'Productive';
    case 'unproductive':
      return 'Unproductive';
    case 'neutral':
      return 'Not tracked';
    case 'half':
      if (role.mode === 'unproductive') return 'Half-productive · Unproductive Mode';
      return role.degraded ? 'Half-productive · filter unavailable' : 'Half-productive · Productive Mode';
    case 'none':
      switch (role.why) {
        case 'background':
          return 'Paused · Chrome not focused';
        case 'idle':
          return 'Paused · idle';
        case 'locked':
          return 'Paused · screen locked';
        case 'choose-mode':
          return 'Choose a mode to continue';
        case 'filter-pending':
          return 'Checking site filter';
        case 'filter-covered':
          return 'Content closed · not counted';
        case 'untracked':
          return 'Not tracked';
        default:
          return 'Not tracked';
      }
  }
}
