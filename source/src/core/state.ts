/**
 * State construction, validation and migration. `sanitizeState` runs on every load so that a
 * corrupted or hand-edited storage value can never produce negative balances or invalid lists.
 */

import {
  DEFAULT_EARN_FROM_MIN,
  DEFAULT_EARN_TO_MIN,
  DEFAULT_HALF_SITES,
  DEFAULT_UNLOCK_COST_MIN,
  DEFAULT_YOUTUBE_KEYWORDS,
  MAX_EARN_FROM_MIN,
  MAX_LIST_ITEMS,
  MAX_UNLOCK_COST_MIN,
  MINUTE_MS,
  SCHEMA_VERSION,
} from './constants';
import { normalizeHostInput } from './domains';
import type { DayStats, EarnState, HalfSession, LedgerEntry, Rules, Settings, Snapshot, Task } from './types';
import { addLedger, emptyDayStats } from './wallet';

export function createInitialState(now: number): EarnState {
  return {
    schema: SCHEMA_VERSION,
    setupDone: false,
    createdAt: now,
    settings: {
      earnFromMin: DEFAULT_EARN_FROM_MIN,
      earnToMin: DEFAULT_EARN_TO_MIN,
      unlockCostMin: DEFAULT_UNLOCK_COST_MIN,
      youtubeKeywords: [...DEFAULT_YOUTUBE_KEYWORDS],
      whatsappChats: [],
    },
    rules: { productive: [], half: [...DEFAULT_HALF_SITES], unproductive: [] },
    balanceMs: 0,
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
    revision: 0,
  };
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(finiteNumber(value, fallback));
  return Math.min(max, Math.max(min, n));
}

function stringList(value: unknown, limit = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed.slice(0, 80));
    if (out.length >= limit) break;
  }
  return out;
}

/** Normalises a list of host inputs, dropping invalid and duplicate entries. */
export function cleanHostList(values: unknown, limit = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const host = normalizeHostInput(value);
    if (host && !out.includes(host)) out.push(host);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Enforces that a host sits on at most one list. When a host appears on several lists the
 * strictest one is kept (unproductive > half > productive), so migration never loosens rules.
 */
export function dedupeRules(input: Rules): Rules {
  const unproductive = cleanHostList(input.unproductive);
  const half = cleanHostList(input.half).filter((h) => !unproductive.includes(h));
  const productive = cleanHostList(input.productive).filter((h) => !unproductive.includes(h) && !half.includes(h));
  return { productive, half, unproductive };
}

function sanitizeSettings(raw: unknown): Settings {
  const base = createInitialState(0).settings;
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const earnFromMin = clampInt(r.earnFromMin, 1, MAX_EARN_FROM_MIN, base.earnFromMin);
  const earnToMin = clampInt(r.earnToMin, 1, earnFromMin, Math.min(base.earnToMin, earnFromMin));
  return {
    earnFromMin,
    earnToMin,
    unlockCostMin: clampInt(r.unlockCostMin, 0, MAX_UNLOCK_COST_MIN, base.unlockCostMin),
    youtubeKeywords: stringList(r.youtubeKeywords, 60),
    whatsappChats: stringList(r.whatsappChats, MAX_LIST_ITEMS),
  };
}

function sanitizeDays(raw: unknown): Record<string, DayStats> {
  const out: Record<string, DayStats> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const stats = emptyDayStats();
    for (const field of Object.keys(stats) as Array<keyof DayStats>) {
      stats[field] = Math.max(0, finiteNumber(v[field], 0));
    }
    out[key] = stats;
  }
  return out;
}

function sanitizeTasks(raw: unknown, now: number): Task[] {
  if (!Array.isArray(raw)) return [];
  const out: Task[] = [];
  for (const item of raw.slice(0, 100)) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    const title = typeof t.title === 'string' ? t.title.trim().slice(0, 80) : '';
    if (!title || typeof t.id !== 'string') continue;
    out.push({
      id: t.id,
      title,
      rewardMin: clampInt(t.rewardMin, 1, 60, 5),
      recurring: t.recurring === true,
      createdAt: finiteNumber(t.createdAt, now),
      completedOn: typeof t.completedOn === 'string' ? t.completedOn : null,
      rewardedOn: typeof t.rewardedOn === 'string' ? t.rewardedOn : null,
    });
  }
  return out;
}

function sanitizeLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LedgerEntry[] = [];
  for (const item of raw.slice(-400)) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    if (typeof e.kind !== 'string' || typeof e.note !== 'string') continue;
    const entry: LedgerEntry = {
      id: finiteNumber(e.id, 0),
      at: finiteNumber(e.at, 0),
      kind: e.kind as LedgerEntry['kind'],
      ms: finiteNumber(e.ms, 0),
      note: e.note.slice(0, 200),
    };
    if (typeof e.host === 'string') entry.host = e.host.slice(0, 253);
    out.push(entry);
  }
  return out;
}

function isSnapshotLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const role = v.role as Record<string, unknown> | undefined;
  return typeof v.at === 'number' && !!role && typeof role === 'object' && typeof role.k === 'string';
}

function sanitizeSessions(raw: unknown): Record<string, HalfSession> {
  const out: Record<string, HalfSession> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(key) || !value || typeof value !== 'object') continue;
    const s = value as Record<string, unknown>;
    if (typeof s.entry !== 'string' || (s.mode !== 'productive' && s.mode !== 'unproductive')) continue;
    out[key] = { entry: s.entry, mode: s.mode, since: finiteNumber(s.since, 0) };
  }
  return out;
}

function sanitizeModeLog(raw: unknown): Record<string, { mode: 'productive' | 'unproductive'; at: number }> {
  const out: Record<string, { mode: 'productive' | 'unproductive'; at: number }> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    if (v.mode !== 'productive' && v.mode !== 'unproductive') continue;
    out[key] = { mode: v.mode, at: finiteNumber(v.at, 0) };
  }
  return out;
}

/**
 * Returns a valid EarnState built from arbitrary stored data. Unknown or invalid fields fall back
 * to defaults; money fields are clamped to non-negative integers.
 */
export function sanitizeState(raw: unknown, now: number): EarnState {
  const fresh = createInitialState(now);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;
  const rulesRaw = (r.rules && typeof r.rules === 'object' ? r.rules : {}) as Record<string, unknown>;
  const rules = dedupeRules({
    productive: cleanHostList(rulesRaw.productive),
    half: Array.isArray(rulesRaw.half) ? cleanHostList(rulesRaw.half) : fresh.rules.half,
    unproductive: cleanHostList(rulesRaw.unproductive),
  });
  const state: EarnState = {
    schema: SCHEMA_VERSION,
    setupDone: r.setupDone === true,
    createdAt: finiteNumber(r.createdAt, now),
    settings: sanitizeSettings(r.settings),
    rules,
    balanceMs: Math.max(0, Math.round(finiteNumber(r.balanceMs, 0))),
    debtMs: Math.max(0, Math.round(finiteNumber(r.debtMs, 0))),
    debtOriginMs: Math.max(0, Math.round(finiteNumber(r.debtOriginMs, 0))),
    debtSince: typeof r.debtSince === 'number' ? r.debtSince : null,
    tasks: sanitizeTasks(r.tasks, now),
    days: sanitizeDays(r.days),
    ledger: sanitizeLedger(r.ledger),
    nextLedgerId: Math.max(1, finiteNumber(r.nextLedgerId, 1)),
    sessions: sanitizeSessions(r.sessions),
    modeLog: sanitizeModeLog(r.modeLog),
    last: isSnapshotLike(r.last) ? (r.last as Snapshot) : null,
    lastAt: typeof r.lastAt === 'number' ? r.lastAt : null,
    live: r.live && typeof r.live === 'object' ? (r.live as EarnState['live']) : null,
    lastReconcile: r.lastReconcile && typeof r.lastReconcile === 'object' ? (r.lastReconcile as EarnState['lastReconcile']) : null,
    browserStartAt: typeof r.browserStartAt === 'number' ? r.browserStartAt : null,
    revision: Math.max(0, Math.floor(finiteNumber(r.revision, 0))),
  };
  if (state.debtMs === 0) {
    state.debtSince = null;
    state.debtOriginMs = 0;
  }
  if (state.debtMs > 0 && state.debtOriginMs < state.debtMs) state.debtOriginMs = state.debtMs;
  return state;
}

/** Detects legacy storage written by the pre-2.0 root extension or the React prototype. */
export function isLegacyStorage(raw: Record<string, unknown>): boolean {
  if (raw.state !== undefined) return false;
  return raw.wallet !== undefined || raw.settings !== undefined || raw.categories !== undefined;
}

/**
 * Migrates legacy storage into a v2 state. Keeps the balance, the study/reward ratio and every
 * site the user had. Nuclear-mode data (which stored a plaintext password) is intentionally dropped.
 */
export function migrateLegacy(raw: Record<string, unknown>, now: number): EarnState {
  const state = createInitialState(now);
  const settings = (raw.settings && typeof raw.settings === 'object' ? raw.settings : {}) as Record<string, unknown>;
  const wallet = (raw.wallet && typeof raw.wallet === 'object' ? raw.wallet : {}) as Record<string, unknown>;
  const categories = (raw.categories && typeof raw.categories === 'object' ? raw.categories : {}) as Record<string, unknown>;

  const earnFromMin = clampInt(settings.studyMinutes, 1, MAX_EARN_FROM_MIN, DEFAULT_EARN_FROM_MIN);
  const earnToMin = clampInt(settings.rewardMinutes, 1, earnFromMin, Math.min(DEFAULT_EARN_TO_MIN, earnFromMin));
  state.settings.earnFromMin = earnFromMin;
  state.settings.earnToMin = earnToMin;

  let balanceMs = 0;
  if (typeof wallet.balance === 'number' && Number.isFinite(wallet.balance)) {
    balanceMs = Math.round(wallet.balance * MINUTE_MS);
  } else if (typeof wallet.balanceSeconds === 'number' && Number.isFinite(wallet.balanceSeconds)) {
    balanceMs = Math.round(wallet.balanceSeconds * 1000);
  }
  state.balanceMs = Math.max(0, balanceMs);

  const productive = [
    ...cleanHostList(categories.productive),
    ...cleanHostList(settings.productiveSites),
  ];
  const half = [
    ...cleanHostList(categories.halfUnproductive),
    ...cleanHostList(settings.halfUnproductiveSites),
  ];
  const unproductive = [...cleanHostList(categories.unproductive), ...cleanHostList(settings.blockedSites)];
  const rules = dedupeRules({ productive, half, unproductive });
  state.rules = {
    productive: rules.productive,
    half: rules.half.length > 0 ? rules.half : [...DEFAULT_HALF_SITES],
    unproductive: rules.unproductive,
  };

  const listCount = rules.productive.length + rules.half.length + rules.unproductive.length;
  state.setupDone = listCount > 0 || state.balanceMs > 0;
  addLedger(
    state,
    'migrate',
    now,
    state.balanceMs,
    `Imported earlier EarnTime data: ${Math.round(state.balanceMs / MINUTE_MS)} min balance, ${earnFromMin}:${earnToMin} rule, ${listCount} sites`,
  );
  return state;
}
