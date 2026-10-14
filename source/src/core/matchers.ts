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

/**
 * Collab-aware helper: true if ANY channel name in the list matches a keyword.
 * Used for YouTube Collaboration videos that credit up to 10 channels on one watch page.
 * Unknown / empty names never match (fail closed) — they are simply ignored, so a
 * single matching collaborator is enough to allow the video.
 */
export function anyChannelAllowed(
  channelNames: readonly (string | null | undefined)[],
  keywords: readonly string[],
): boolean {
  for (const raw of channelNames) {
    if (channelAllowed(raw, keywords)) return true;
  }
  return false;
}

/** All names that actually matched, for messaging / tests. */
export function matchingChannels(
  channelNames: readonly string[],
  keywords: readonly string[],
): string[] {
  return channelNames.filter((name) => channelAllowed(name, keywords));
}

export type YouTubePage = 'home' | 'search' | 'watch' | 'shorts' | 'playlist' | 'channel' | 'other';

/**
 * Classifies a YouTube path. Search, channel and playlist pages are browsable; video/Shorts
 * playback is checked against the user's study keywords. A channel's Shorts tab is also browsable,
 * but uses the Shorts playback check if media starts.
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
