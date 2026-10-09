/**
 * Deciding what a page is *while it loads*, from data the content script can read without waking
 * anybody up.
 *
 * The service worker is the authority, and it is still asked on every load — but Chrome unloads it
 * when idle and starting it again is not instant, so an answer can take seconds. A page that waits
 * for that answer is a page that is open, painted and usable while EarnTime thinks. On a first
 * visit to a half-productive site that was the bypass: no chooser, no filter, no session, and
 * therefore nothing charged either.
 *
 * `chrome.storage` is served by the browser process, not by the worker, so reading it does not have
 * to wait for a cold start. This module reads the persisted rules and half-productive sessions and
 * produces a **provisional verdict** — the same `pageDirective` shape the worker returns — within a
 * few milliseconds of `document_start`. The gate stays closed until a verdict exists, so the site is
 * hidden while that read happens; the chooser is then already on screen before the first byte of the
 * site is painted.
 *
 * Nothing here is trusted as final. The worker's reply replaces the provisional verdict, and any
 * mode choice is validated by the worker, so a hand-edited storage value cannot grant a mode.
 */

import { pageDirective } from '../core/directive';
import { classifyHost } from '../core/domains';
import type { PageDirective } from '../core/directive';
import type { HalfSession, Rules } from '../core/types';

/** Key the worker publishes its per-tab verdicts under, in `chrome.storage.session`. */
export const GATE_CACHE_KEY = 'gateCache';

/** How long a published verdict may be reused (ms). Navigation is normally far quicker than this. */
export const GATE_CACHE_TTL_MS = 30_000;

/** How many tab verdicts are kept before the oldest are dropped. */
export const GATE_CACHE_LIMIT = 100;

/** One worker verdict, published so the next load of that tab does not have to wait for it. */
export interface GateCacheEntry {
  /** Exact URL the verdict was computed for (hash ignored when comparing). */
  url: string;
  /** Epoch ms. */
  at: number;
  directive: PageDirective;
}

export type GateCache = Record<string, GateCacheEntry>;

/** The subset of persisted state a content script needs to judge the page it is loading. */
export interface LocalVerdictInput {
  rules: Rules;
  sessions: Record<string, HalfSession>;
  /** Mirrors of the worker's money fields, used only to word the chooser correctly. */
  balanceMs: number;
  debtMs: number;
  youtubeKeywords: string[];
  setupDone: boolean;
  /** The worker's own verdict for this tab and URL, if it published one. */
  cached?: GateCacheEntry | null;
}

/**
 * Reads the persisted state and the worker's verdict cache. Both reads are optional: storage can be
 * unavailable (a disabled or reloaded extension), and the cache only exists after the worker has
 * answered at least once.
 */
export async function readLocalVerdictInput(
  tabId: number | null,
  url: string,
  sessionGet?: (keys: string[]) => Promise<Record<string, unknown>>,
  localGet?: (keys: string[]) => Promise<Record<string, unknown>>,
): Promise<LocalVerdictInput | null> {
  let rules: Rules | null = null;
  let sessions: Record<string, HalfSession> = {};
  let balanceMs = 0;
  let debtMs = 0;
  let youtubeKeywords: string[] = [];
  let setupDone = false;
  let cached: GateCacheEntry | null = null;

  if (sessionGet && tabId !== null) {
    try {
      const got = await sessionGet([GATE_CACHE_KEY]);
      cached = pickCacheEntry(got?.[GATE_CACHE_KEY], tabId, url);
    } catch {
      cached = null;
    }
  }

  if (localGet) {
    try {
      const got = await localGet(['state']);
      const state = got?.state;
      if (state && typeof state === 'object') {
        const s = state as Record<string, unknown>;
        const raw = (s.rules && typeof s.rules === 'object' ? s.rules : {}) as Record<string, unknown>;
        rules = {
          productive: stringList(raw.productive),
          half: stringList(raw.half),
          unproductive: stringList(raw.unproductive),
        };
        sessions = sessionMap(s.sessions);
        balanceMs = finite(s.balanceMs);
        debtMs = finite(s.debtMs);
        setupDone = s.setupDone === true;
        const settings = (s.settings && typeof s.settings === 'object' ? s.settings : {}) as Record<string, unknown>;
        youtubeKeywords = stringList(settings.youtubeKeywords, 60);
      }
    } catch {
      rules = null;
    }
  }

  if (!rules && !cached) return null;
  return {
    rules: rules ?? { productive: [], half: [], unproductive: [] },
    sessions,
    balanceMs,
    debtMs,
    youtubeKeywords,
    setupDone,
    cached,
  };
}

export type Provisional =
  | { kind: 'open'; why: 'unmanaged' | 'not-tracked' }
  | { kind: 'hold'; why: 'unknown' }
  | { kind: 'directive'; directive: PageDirective };

/**
 * The verdict for the page being loaded, decided locally.
 *
 *  - `directive`  — apply it now (chooser, active session, or an explicit "nothing to do").
 *  - `hold`       — not enough information yet; keep the gate closed and wait for the worker.
 *  - `open`       — EarnTime does not manage this page at all, so it must not be hidden.
 */
export function provisionalVerdict(
  host: string | null,
  tabId: number | null,
  local: LocalVerdictInput | null,
): Provisional {
  if (!host) return { kind: 'open', why: 'unmanaged' };
  if (!local) return { kind: 'hold', why: 'unknown' };

  // The worker already judged this exact URL for this tab. Reuse it: it is the authority, and it is
  // here without a round trip.
  if (local.cached?.directive) return { kind: 'directive', directive: local.cached.directive };

  const cls = classifyHost(host, local.rules);
  // Only half-productive pages need a verdict before they may be used. Unproductive pages are
  // stopped by declarativeNetRequest while the navigation is still in flight, and productive or
  // unlisted pages are simply open.
  if (cls.kind !== 'half' || !cls.entry) return { kind: 'open', why: 'not-tracked' };

  const result = pageDirective(
    {
      rules: local.rules,
      sessions: local.sessions,
      balanceMs: local.balanceMs,
      debtMs: local.debtMs,
      settings: { youtubeKeywords: local.youtubeKeywords },
    },
    tabId,
    host,
  );
  return { kind: 'directive', directive: result.directive };
}

/** True when a worker verdict is still usable for this tab and URL. */
export function pickCacheEntry(raw: unknown, tabId: number | null, url: string, now?: number): GateCacheEntry | null {
  if (tabId === null || !raw || typeof raw !== 'object') return null;
  const entry = (raw as GateCache)[String(tabId)];
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.directive || typeof entry.url !== 'string' || typeof entry.at !== 'number') return null;
  if (stripHash(entry.url) !== stripHash(url)) return null;
  if (now !== undefined && now - entry.at > GATE_CACHE_TTL_MS) return null;
  return entry;
}

/** Adds or refreshes one tab's verdict, dropping the oldest entries beyond the limit. */
export function withCacheEntry(cache: unknown, tabId: number, url: string, directive: PageDirective, at: number): GateCache {
  const source: GateCache = cache && typeof cache === 'object' ? { ...(cache as GateCache) } : {};
  const next: GateCache = {};
  let count = 0;
  for (const [key, value] of Object.entries(source)) {
    if (!value || typeof value !== 'object' || typeof value.at !== 'number') continue;
    if (count >= GATE_CACHE_LIMIT && key !== String(tabId)) continue;
    next[key] = value;
    count += 1;
  }
  next[String(tabId)] = { url, at, directive };
  return next;
}

export function stripHash(url: string): string {
  const index = url.indexOf('#');
  return index < 0 ? url : url.slice(0, index);
}

function stringList(value: unknown, limit = 200): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

function sessionMap(raw: unknown): Record<string, HalfSession> {
  const out: Record<string, HalfSession> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(key) || !value || typeof value !== 'object') continue;
    const s = value as Record<string, unknown>;
    if (typeof s.entry !== 'string') continue;
    if (s.mode !== 'productive' && s.mode !== 'unproductive') continue;
    out[key] = { entry: s.entry, mode: s.mode, since: finite(s.since) };
  }
  return out;
}

function finite(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
