/** Local-time helpers. Day buckets follow the browser's current timezone. */

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day key (YYYY-MM-DD) for an epoch-ms instant. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Epoch ms of the next local midnight after `ms`. */
export function nextLocalMidnight(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

export interface DaySlice {
  key: string;
  from: number;
  to: number;
}

/** Splits [from, to) at local midnights. Returns [] when to <= from. */
export function splitByLocalDay(from: number, to: number): DaySlice[] {
  const out: DaySlice[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor < to && guard < 10_000) {
    const next = Math.min(nextLocalMidnight(cursor), to);
    out.push({ key: dayKey(cursor), from: cursor, to: next });
    cursor = next;
    guard += 1;
  }
  return out;
}

/** Compact duration: "35s", "42m 05s", "1h 05m". Negative values render as 0s. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${pad2(m)}m`;
  if (m > 0) return `${m}m ${pad2(s)}s`;
  return `${s}s`;
}

/** Whole minutes, rounded down, for display in lists and badges: "42 min". */
export function formatMinutes(ms: number): string {
  return `${Math.max(0, Math.floor(ms / 60_000))} min`;
}

/** Short badge text: "45m", "2h", "<1m", "0m". */
export function badgeText(ms: number): string {
  if (ms <= 0) return '0m';
  if (ms < 60_000) return '<1m';
  const mins = Math.floor(ms / 60_000);
  if (mins >= 120) return `${Math.floor(mins / 60)}h`;
  return `${mins}m`;
}
