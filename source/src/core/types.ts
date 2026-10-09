/** Shared domain types. Pure data only; no Chrome APIs are referenced here. */

export type ListName = 'productive' | 'half' | 'unproductive';
export type HalfMode = 'productive' | 'unproductive';
export type IdleState = 'active' | 'idle' | 'locked';
/** Health of the half-productive content filter, evaluated per active tab. */
export type FilterState = 'ok' | 'pending' | 'bad' | 'n/a';

export interface Settings {
  /** Productive minutes required ... */
  earnFromMin: number;
  /** ... to earn this many screen-time minutes. */
  earnToMin: number;
  /** Minutes charged for each loosening change after setup. */
  unlockCostMin: number;
  youtubeKeywords: string[];
  whatsappChats: string[];
  /**
   * Group chats, by exact name. Auto-reply fallback rules never message a group, and this list is
   * how EarnTime knows which chats are groups; the page's own detection is only a second signal.
   */
  whatsappGroups: string[];
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

/**
 * What makes a WhatsApp auto-reply fire.
 *  - `incoming`: a new message arrived in a matching chat.
 *  - `task`: a daily task was ticked off.
 *  - `window`: WhatsApp Web is open inside the rule's time-of-day window.
 */
export type AutoReplyTrigger = 'incoming' | 'task' | 'window';

/** How often one rule may message one chat: every trigger, once a local day, or once ever. */
export type AutoReplyRepeat = 'every' | 'daily' | 'once';

export interface AutoReplyRule {
  id: string;
  /** Label shown in settings. */
  name: string;
  enabled: boolean;
  trigger: AutoReplyTrigger;
  /**
   * Exact chat/group names (matched like the Productive Mode chat list). A rule that names chats
   * sends to exactly those, group or personal.
   *
   * Empty makes the rule a *fallback*: it answers personal chats that no named rule claimed, never
   * a group and never a chat on the Productive Mode list. Only `incoming` rules may be fallbacks,
   * so a task or scheduled rule can never message the whole contact list.
   */
  targets: string[];
  /** Message body. `{task}` becomes the task just completed and `{time}` the local clock time. */
  message: string;
  /** For `task`: only these task names fire the rule. Empty means any completed task. */
  taskTitles: string[];
  /** Start of the daily time-of-day window, "HH:MM" local. Empty means always on. */
  from: string;
  /** End of the window, "HH:MM" local. A window may cross midnight (for example 22:00–06:00). */
  to: string;
  /** Minimum minutes between two sends to the same chat under this rule (0 disables the cooldown). */
  cooldownMin: number;
  /** How often this rule may message one chat. */
  repeat: AutoReplyRepeat;
}

/** A message waiting to be handed to a WhatsApp Web tab. */
export interface AutoReplyJob {
  id: string;
  ruleId: string;
  chat: string;
  message: string;
  trigger: AutoReplyTrigger;
  createdAt: number;
  /** The job is dropped after this instant, so a closed browser cannot queue sends forever. */
  expiresAt: number;
}

export interface AutoReplyLogEntry {
  id: number;
  at: number;
  chat: string;
  ruleId: string;
  ok: boolean;
  /** Message sent, or the reason the send failed. */
  detail: string;
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
  | 'filter-pending';

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
  createdAt: number;
  settings: Settings;
  rules: Rules;
  balanceMs: number;
  debtMs: number;
  /** Total debt accumulated since the current debt period began (for progress display). */
  debtOriginMs: number;
  debtSince: number | null;
  tasks: Task[];
  /** WhatsApp auto-reply rules (see core/autoreply.ts). */
  autoReplies: AutoReplyRule[];
  /** Messages waiting for a WhatsApp Web tab to collect and send them. */
  autoReplyQueue: AutoReplyJob[];
  /** Most recent send attempts, newest last. */
  autoReplyLog: AutoReplyLogEntry[];
  nextAutoReplyLogId: number;
  /** Per rule+chat delivery bookkeeping, keyed `ruleId|normalised chat name`. */
  autoReplySent: Record<string, { at: number; day: string }>;
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
