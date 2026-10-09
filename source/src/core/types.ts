/** Shared domain types. Pure data only; no Chrome APIs are referenced here. */

export type ListName = 'productive' | 'half' | 'unproductive';
export type HalfMode = 'productive' | 'unproductive';
export type IdleState = 'active' | 'idle' | 'locked';
/** Health of the half-productive content filter, evaluated per active tab. */
export type FilterState = 'ok' | 'covered' | 'pending' | 'bad' | 'n/a';

export interface Settings {
  /** Productive minutes required ... */
  earnFromMin: number;
  /** ... to earn this many screen-time minutes. */
  earnToMin: number;
  /** Minutes charged for each loosening change after setup. */
  unlockCostMin: number;
  youtubeKeywords: string[];
}

export interface Rules {
  productive: string[];
  half: string[];
  unproductive: string[];
}

export interface Task {
  id: string;
  title: string;
  rewardMin: number;
  recurring: boolean;
  createdAt: number;
  /** Local day key (YYYY-MM-DD) on which the task was last marked done (recurring) or first done (one-off). */
  completedOn: string | null;
  /** Local day key of the last reward (recurring) or the first and only reward (one-off). */
  rewardedOn: string | null;
}

export interface DayStats {
  /** Time on productive sites (counted). */
  prodMs: number;
  /** Time on half-productive sites in Productive Mode (counted and credited). */
  halfProdMs: number;
  /** Time on half-productive sites in Unproductive Mode (charged). */
  halfUnprodMs: number;
  /** Time on unproductive sites (charged). */
  unprodMs: number;
  /** Screen time credited (study credit + task rewards), gross of debt repayment. */
  earnedMs: number;
  /** Portion of credited time that went to repaying debt. */
  repaidMs: number;
  /** Task reward portion of earnedMs. */
  taskMs: number;
  /** Time charged against the balance or debt (equals unprodMs + halfUnprodMs). */
  usedMs: number;
  /**
   * Screen time per hostname, in milliseconds, for every site that was in the foreground — including
   * neutral sites that EarnTime neither credits nor charges. Hostnames only, never page addresses.
   */
  hosts: Record<string, number>;
  /** Foreground screen time observed while the worker was running (exact). */
  screenMs: number;
  /**
   * Foreground screen time reconstructed from browser history after an interruption (estimated, with
   * the same per-visit cap as reconciliation). `screenMs` already includes it.
   */
  estimatedScreenMs: number;
}

export type LedgerKind =
  | 'earn'
  | 'spend'
  | 'debt'
  | 'repay'
  | 'task'
  | 'reconcile'
  | 'unlock'
  | 'rule'
  | 'setup'
  | 'clock'
  | 'mode'
  | 'filter'
  | 'guard'
  | 'migrate'
  | 'startup';

export interface LedgerEntry {
  id: number;
  at: number;
  kind: LedgerKind;
  /** Milliseconds involved (0 when not applicable). */
  ms: number;
  host?: string;
  note: string;
}

export interface HalfSession {
  /** Matched half-productive list entry (e.g. "youtube.com"). */
  entry: string;
  mode: HalfMode;
  since: number;
}

export type NoneReason =
  | 'background'
  | 'idle'
  | 'locked'
  | 'internal'
  | 'untracked'
  | 'choose-mode'
  | 'filter-pending'
  | 'filter-covered';

export type Role =
  | { k: 'none'; why: NoneReason; host?: string }
  | { k: 'neutral'; host: string }
  | { k: 'productive'; host: string }
  | { k: 'unproductive'; host: string }
  | { k: 'half'; host: string; entry: string; mode: HalfMode; degraded: boolean };

/** What the controller observed about the browser at one instant. */
export interface Observation {
  at: number;
  tabId: number | null;
  windowId: number | null;
  /** Hostname of the active tab for http(s) pages, otherwise null. */
  host: string | null;
  /** True when the active tab URL is an internal page (chrome://, chrome-extension://, ...). */
  internalPage: boolean;
  /** The active tab's window is focused and not minimized. */
  focused: boolean;
  /** The tab is the active tab of its window. */
  tabActive: boolean;
  idle: IdleState;
  audible: boolean;
  incognito: boolean;
  filterState: FilterState;
}

/** An observation plus the role it was assigned. Stored as `last` between checkpoints. */
export interface Snapshot extends Observation {
  role: Role;
}

export interface LiveStatus {
  /** Role kind in effect at the last checkpoint. */
  k: Role['k'];
  host: string | null;
  mode: HalfMode | null;
  degraded: boolean;
  why: NoneReason | null;
  tabId: number | null;
  at: number;
}

export interface ReconcileSummary {
  from: number;
  to: number;
  at: number;
  visits: number;
  cappedVisits: number;
  productiveCreditMs: number;
  chargedMs: number;
  debtAddedMs: number;
  repaidMs: number;
  startupCut: boolean;
  /** Per-host charged time, sorted descending, for the audit view (hosts only, no URLs). */
  breakdown: Array<{ host: string; ms: number; kind: 'productive' | 'unproductive' }>;
}

export interface EarnState {
  schema: number;
  setupDone: boolean;
  /**
   * Whether the user granted the optional `history` permission ("screen time access"). History fills
   * the gaps EarnTime cannot observe itself — a suspended worker, a closed browser, a disabled
   * extension — and nothing else uses it.
   */
  historyGranted: boolean;
  createdAt: number;
  settings: Settings;
  rules: Rules;
  balanceMs: number;
  debtMs: number;
  /** Total debt accumulated since the current debt period began (for progress display). */
  debtOriginMs: number;
  debtSince: number | null;
  tasks: Task[];
  days: Record<string, DayStats>;
  ledger: LedgerEntry[];
  nextLedgerId: number;
  /** Keyed by tab id (as a string). */
  sessions: Record<string, HalfSession>;
  /** Most recent Productive/Unproductive choice per half entry (used by reconciliation). */
  modeLog: Record<string, { mode: HalfMode; at: number }>;
  last: Snapshot | null;
  lastAt: number | null;
  live: LiveStatus | null;
  lastReconcile: ReconcileSummary | null;
  browserStartAt: number | null;
  /** Monotonic counter bumped on every state write (diagnostics). */
  revision: number;
}

export interface RuleFailure {
  ok: false;
  code: RuleErrorCode;
  message: string;
  /** Milliseconds the user would need to afford the change (insufficient-balance failures). */
  needMs?: number;
  /** Price of a change that must be confirmed before it is charged (`code: 'confirm'` only). */
  quote?: UnlockQuote;
}

/**
 * What a loosening change would cost, quoted before anything is charged. A change that costs screen
 * time is refused once with one of these attached; re-issuing the same command with `confirm: true`
 * is what actually pays.
 */
export interface UnlockQuote {
  /** Minutes the change costs. */
  minutes: number;
  /** Whole minutes in the balance at the time of the quote. */
  balanceMin: number;
  /** Short description of what is being loosened, e.g. `remove instagram.com`. */
  reason: string;
  /** One-line description of the change, for the confirmation prompt. */
  label: string;
}

/** Result of a command. `data` is present only for successful commands that return a value. */
export type RuleResult<T = unknown> = { ok: true; data?: T } | RuleFailure;

/** Result of a pure validator. On success `data` is always present. */
export type Checked<T> = { ok: true; data: T } | RuleFailure;

export type RuleErrorCode =
  | 'invalid'
  | 'duplicate'
  | 'not-found'
  | 'debt'
  | 'insufficient'
  | 'unavailable'
  | 'limit'
  /** The change is allowed but costs screen time, so it must be confirmed first. Nothing was charged. */
  | 'confirm';
