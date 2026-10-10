/**
 * Pure matching rules for the half-productive content filters.
 * DOM-independent so they can be unit tested without a browser.
 */

import { YOUTUBE_HOST_SUFFIX } from './constants';
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

export type YouTubePage = 'home' | 'search' | 'watch' | 'shorts' | 'playlist' | 'channel' | 'other';

/**
 * Classifies a YouTube path. Productive Mode supports search/video pages, plus channel and playlist
 * browsing when their owning channel matches the user's study keywords. Shorts stay blocked,
 * including the Shorts tab on an otherwise allowed channel.
 */
export function youtubePageKind(pathname: string): YouTubePage {
  const path = pathname.toLowerCase();
  if (path === '/' || path === '') return 'home';
  if (path === '/results' || path.startsWith('/results/')) return 'search';
  if (path === '/watch' || path.startsWith('/watch/')) return 'watch';
  if (path === '/shorts' || path.startsWith('/shorts/')) return 'shorts';
  if (path === '/playlist' || path.startsWith('/playlist/')) return 'playlist';

  const segments = path.split('/').filter(Boolean);
  const first = segments[0] ?? '';
  const isHandleChannel = first.startsWith('@') && first.length > 1;
  const isLegacyChannel = ['channel', 'c', 'user'].includes(first) && Boolean(segments[1]);
  if (isHandleChannel || isLegacyChannel) {
    const channelTab = segments[isHandleChannel ? 1 : 2];
    if (channelTab === 'shorts') return 'shorts';
    return 'channel';
  }

  return 'other';
}

export type FilterKind = 'youtube';

/** Which content filter (if any) applies to a hostname. */
export function filterKindForHost(host: string | null): FilterKind | null {
  if (!host) return null;
  if (hostMatches(host, YOUTUBE_HOST_SUFFIX)) return 'youtube';
  return null;
}
