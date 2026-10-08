/**
 * Pure matching rules for the half-productive content filters.
 * DOM-independent so they can be unit tested without a browser.
 */

import { WHATSAPP_HOST, YOUTUBE_HOST_SUFFIX } from './constants';
import { hostMatches } from './domains';

/** Lower-cased, NFKC-normalised, whitespace-collapsed form used for comparisons. */
export function normalizeName(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * YouTube channel rule: the channel name must CONTAIN one of the keywords
 * (case-insensitive substring). Unknown or empty channel names never match (fail closed).
 */
export function channelAllowed(channelName: string | null | undefined, keywords: readonly string[]): boolean {
  if (!channelName) return false;
  const name = normalizeName(channelName);
  if (!name) return false;
  return keywords.some((keyword) => {
    const k = normalizeName(keyword);
    return k.length > 0 && name.includes(k);
  });
}

/** Which keyword (if any) explains an allowed channel. Used by the settings "test" field. */
export function matchingKeyword(channelName: string, keywords: readonly string[]): string | null {
  const name = normalizeName(channelName);
  for (const keyword of keywords) {
    const k = normalizeName(keyword);
    if (k && name.includes(k)) return keyword;
  }
  return null;
}

/**
 * WhatsApp chat rule: exact match of the normalised chat title against the allowed list.
 * Unknown titles never match.
 */
export function chatAllowed(chatTitle: string | null | undefined, chats: readonly string[]): boolean {
  if (!chatTitle) return false;
  const title = normalizeName(chatTitle);
  if (!title) return false;
  return chats.some((chat) => normalizeName(chat) === title);
}

export type YouTubePage = 'home' | 'search' | 'watch' | 'shorts' | 'other';

/** Classifies a YouTube path. Only home (blank), search and watch pages are usable in Productive Mode. */
export function youtubePageKind(pathname: string): YouTubePage {
  const path = pathname.toLowerCase();
  if (path === '/' || path === '') return 'home';
  if (path === '/results' || path.startsWith('/results/')) return 'search';
  if (path === '/watch' || path.startsWith('/watch/')) return 'watch';
  if (path === '/shorts' || path.startsWith('/shorts/')) return 'shorts';
  return 'other';
}

export type FilterKind = 'youtube' | 'whatsapp';

/** Which content filter (if any) applies to a hostname. */
export function filterKindForHost(host: string | null): FilterKind | null {
  if (!host) return null;
  if (hostMatches(host, YOUTUBE_HOST_SUFFIX)) return 'youtube';
  if (host === WHATSAPP_HOST) return 'whatsapp';
  return null;
}
