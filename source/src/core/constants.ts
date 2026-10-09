/**
 * Tunable constants. Every time-based rule in the engine is expressed with these values
 * so the unit and simulation tests can reason about them directly.
 */

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Storage schema version written into the single `state` key. */
export const SCHEMA_VERSION = 4;

/** Storage key holding the entire persisted state (one key = atomic writes). */
export const STATE_KEY = 'state';

/** Name of the periodic alarm that checkpoints time accounting. Chrome enforces >= 30 s. */
export const TICK_ALARM = 'earntime-tick';
export const TICK_PERIOD_MIN = 0.5;
export const TICK_MS = 30_000;

/** chrome.idle detection interval (seconds). Chrome's minimum is 15. */
export const IDLE_DETECTION_S = 15;
export const IDLE_DETECTION_MS = IDLE_DETECTION_S * 1000;

/** A checkpoint gap longer than this is not trusted; history reconciliation runs instead. */
export const RECONCILE_GAP_MS = 120_000;
/** Time attributed to the previous page / an unobserved stretch without evidence (cap). */
export const CONTINUATION_CAP_MS = 120_000;
/** A single history visit is assumed to last at most this long. */
export const VISIT_CAP_MS = 15 * MINUTE_MS;
/** Reconciliation never looks further back than this. */
export const MAX_RECONCILE_WINDOW_MS = 7 * DAY_MS;
/** Upper bound on URLs whose visits are inspected during one reconciliation. */
export const MAX_HISTORY_URLS = 1000;

/** Half-productive filter health: reports older than this are treated as failing. */
export const HEALTH_FRESH_MS = 45_000;
/** Grace period after choosing Productive Mode before a missing health report counts as failing. */
export const HEALTH_GRACE_MS = 20_000;

export const LEDGER_LIMIT = 400;
export const LEDGER_MERGE_MS = 10 * MINUTE_MS;
export const DAY_RETENTION = 120;

/** Default earn rule: 60 productive minutes earn 5 minutes of screen time. */
export const DEFAULT_EARN_FROM_MIN = 60;
export const DEFAULT_EARN_TO_MIN = 5;
/** Minutes charged for loosening a rule after setup (see protection.ts). */
export const DEFAULT_UNLOCK_COST_MIN = 10;
export const MAX_UNLOCK_COST_MIN = 240;
/**
 * Setup can grant a starting balance, but only this much. Uninstalling deletes EarnTime's data, and a
 * reinstall starts setup again, so a large allowance would be an easy way to reset the balance.
 */
export const MAX_SETUP_BALANCE_MIN = 30;

export const MAX_EARN_FROM_MIN = 1440;
export const MAX_TASK_REWARD_MIN = 60;
export const MAX_TITLE_LEN = 80;
export const MAX_LIST_ITEMS = 200;

export const DEFAULT_YOUTUBE_KEYWORDS = ['JEE', 'NDA', 'Study', 'Learn', 'Education', 'PW'] as const;
export const DEFAULT_HALF_SITES = ['youtube.com', 'web.whatsapp.com'] as const;
/** Half-productive site that gets the mode chooser but never a content filter (trust based). */
export const WHATSAPP_HOST = 'web.whatsapp.com';
export const SUGGESTED_PRODUCTIVE_SITES = ['khanacademy.org', 'nptel.ac.in', 'pw.live'] as const;
export const SUGGESTED_UNPRODUCTIVE_SITES = [
  'instagram.com',
  'facebook.com',
  'x.com',
  'reddit.com',
  'netflix.com',
] as const;

/** Host suffix that receives the YouTube channel filter in Productive Mode. */
export const YOUTUBE_HOST_SUFFIX = 'youtube.com';

/** Chrome-internal pages that EarnTime redirects (see guard.ts). */
export const GUARDED_PAGE_PREFIXES = ['chrome://extensions', 'chrome://settings/extensions'] as const;

/** Exact wording required by the protection specification. Do not edit. */
export const CHROME_LIMITATION_SENTENCE =
  'Chrome prevents extensions from completely controlling privileged `chrome://` pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.';
