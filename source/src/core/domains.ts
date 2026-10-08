/** Host normalisation and list matching. */

import type { ListName, Rules } from './types';

const HOST_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PUNYCODE_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+xn--[a-z0-9-]{1,59}$/;

/**
 * Turns user input ("https://www.YouTube.com/watch?v=1", "youtube.com/feed") into a bare
 * hostname such as "youtube.com". Returns null when the input is not a usable domain.
 */
export function normalizeHostInput(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
  let host: string;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    host = url.hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, '').replace(/^www\./, '');
  if (HOST_RE.test(host) || PUNYCODE_RE.test(host)) return host;
  return null;
}

/** Hostname of an http(s) URL, or null for any other scheme or an unparsable value. */
export function hostFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** True when `host` equals `entry` or is a subdomain of it. */
export function hostMatches(host: string, entry: string): boolean {
  return host === entry || host.endsWith(`.${entry}`);
}

export interface HostClass {
  kind: ListName | 'neutral';
  /** The list entry that matched (most specific wins); null when neutral. */
  entry: string | null;
}

const STRICTNESS: Record<ListName, number> = { unproductive: 3, half: 2, productive: 1 };

/**
 * Classifies a hostname. The most specific (longest) matching entry wins. For equal
 * specificity the stricter list wins (unproductive > half > productive).
 */
export function classifyHost(host: string, rules: Rules): HostClass {
  let best: { kind: ListName; entry: string } | null = null;
  for (const list of ['productive', 'half', 'unproductive'] as const) {
    for (const entry of rules[list]) {
      if (!hostMatches(host, entry)) continue;
      if (
        !best ||
        entry.length > best.entry.length ||
        (entry.length === best.entry.length && STRICTNESS[list] > STRICTNESS[best.kind])
      ) {
        best = { kind: list, entry };
      }
    }
  }
  return best ? { kind: best.kind, entry: best.entry } : { kind: 'neutral', entry: null };
}

/** Which list (if any) currently holds exactly this entry. */
export function listOfEntry(entry: string, rules: Rules): ListName | null {
  for (const list of ['productive', 'half', 'unproductive'] as const) {
    if (rules[list].includes(entry)) return list;
  }
  return null;
}
