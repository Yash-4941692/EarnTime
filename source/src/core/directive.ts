/**
 * What a half-productive page should show. The content script asks for a directive on every page
 * load; the service worker answers from state, so the page never decides its own rules.
 */

import { classifyHost } from './domains';
import { filterKindForHost, type FilterKind } from './matchers';
import { canUseUnproductive, isDebtMode, sessionFor, type MoneyView, type SessionView } from './roles';
import type { HalfMode, Rules } from './types';

export type PageDirective =
  | { kind: 'none' }
  | {
      kind: 'choose';
      host: string;
      entry: string;
      canUnproductive: boolean;
      reason: 'debt' | 'exhausted' | null;
      balanceMs: number;
      debtMs: number;
    }
  | {
      kind: 'active';
      host: string;
      entry: string;
      mode: HalfMode;
      filter: FilterKind | null;
      youtubeKeywords: string[];
    };

export interface DirectiveResult {
  directive: PageDirective;
  /** True when a stored session became invalid (for example, Unproductive Mode after the balance ran out). */
  clearSession: boolean;
}

/**
 * Everything a directive depends on, and nothing more. The service worker passes its whole state;
 * a content script that is judging a page *while it loads* passes the same fields read straight
 * from storage. One implementation, so the pre-verdict and the authoritative answer can never
 * disagree about the rules.
 */
export interface DirectiveInput extends MoneyView, SessionView {
  rules: Rules;
  settings: { youtubeKeywords: string[] };
}

export function pageDirective(state: DirectiveInput, tabId: number | null, host: string | null): DirectiveResult {
  if (!host) return { directive: { kind: 'none' }, clearSession: false };
  const cls = classifyHost(host, state.rules);
  if (cls.kind !== 'half' || !cls.entry) return { directive: { kind: 'none' }, clearSession: false };

  const entry = cls.entry;
  let session = sessionFor(state, tabId, entry);
  let clearSession = false;
  if (session && session.mode === 'unproductive' && !canUseUnproductive(state)) {
    session = null;
    clearSession = true;
  }

  if (!session) {
    return {
      directive: {
        kind: 'choose',
        host,
        entry,
        canUnproductive: canUseUnproductive(state),
        reason: isDebtMode(state) ? 'debt' : state.balanceMs <= 0 ? 'exhausted' : null,
        balanceMs: state.balanceMs,
        debtMs: state.debtMs,
      },
      clearSession,
    };
  }

  const filter = session.mode === 'productive' ? filterKindForHost(host) : null;
  return {
    directive: {
      kind: 'active',
      host,
      entry,
      mode: session.mode,
      filter,
      youtubeKeywords: session.mode === 'productive' ? [...state.settings.youtubeKeywords] : [],
    },
    clearSession,
  };
}
