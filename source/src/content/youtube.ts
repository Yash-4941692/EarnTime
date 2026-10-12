/**
 * YouTube Productive Mode. Everything that is only being LOOKED AT stays visible: search results,
 * channel pages and playlist pages are all browsable whatever their owner is. The channel rule is
 * applied where it can be trusted — when something actually starts PLAYING. A watch page is judged
 * by the channel shown in its own metadata; on a channel or playlist page the owner is read at the
 * moment media plays, so a channel name EarnTime cannot parse no longer blocks the whole page.
 * The homepage shows no videos (but no banner).
 *
 * Collaboration (Collab) support: YouTube's native Collaboration feature (late 2025) lets one
 * video credit up to 10 channels. All collaborators appear below the player with a Subscribe
 * button and the video is pushed to each channel's audience. EarnTime reads *every* visible
 * channel name on the watch page (primary + collaborators via the Collaboration channels
 * container, avatarStack, and modern yt-content-metadata view models) and allows the video
 * if ANY collaborator matches the study keywords. If the layout exposes a Collaboration
 * indicator but no name can be parsed (e.g. truncated "and 2 more" without DOM for hidden
 * collaborators), EarnTime falls back to trust-based: the video is allowed and the user is
 * told it could not be fully verified, instead of failing closed and blocking study content.
 *
 * Shorts support: Shorts are mode-aware. In Productive Mode a Short is allowed only when its
 * channel (or any collaborator) matches the study keywords; otherwise it is covered and paused.
 * The channel's Shorts tab (/@handle/shorts) remains browsable — the cover only appears when
 * a non-study Short actually starts playing. In Unproductive Mode (no YouTube filter) Shorts
 * play unrestricted. This satisfies the user request to "watch shorts too, considering modes".
 */

import { anyChannelAllowed, youtubePageKind } from '../core/matchers';
import { coverCard, type Overlay } from './overlay';

const ITEM_SELECTOR = [
  'ytd-video-renderer',
  'ytd-channel-renderer',
  'ytd-playlist-renderer',
  'ytd-radio-renderer',
  'ytd-movie-renderer',
  'ytd-compact-video-renderer',
  'ytd-compact-playlist-renderer',
  'ytd-compact-radio-renderer',
  'ytd-rich-item-renderer',
  'ytd-grid-video-renderer',
  'yt-lockup-view-model',
].join(',');

const ALWAYS_HIDDEN = [
  'ytd-reel-shelf-renderer',
  'ytd-rich-shelf-renderer',
  'ytd-shorts',
  'ytd-merch-shelf-renderer',
  'ytd-reel-video-renderer',
  'a[href^="/shorts"]',
  '#related',
  'ytd-watch-next-secondary-results-renderer',
].join(',');

/** Homepage modules (grid sections that wrap shelves and their titles) hidden so home shows no videos. */
const HOME_HIDDEN = ['ytd-rich-grid-renderer', 'ytd-rich-section-renderer'].join(',');

/** Watch-page owner selectors — expanded for modern layout + Collaboration feature. */
const WATCH_CHANNEL_SELECTORS = [
  // Classic ytd-video-owner-renderer
  'ytd-video-owner-renderer ytd-channel-name a',
  'ytd-video-owner-renderer #channel-name a',
  'ytd-video-owner-renderer #channel-name',
  // Modern watch metadata
  'ytd-watch-metadata ytd-channel-name a',
  'ytd-watch-metadata #channel-name a',
  'ytd-watch-metadata #channel-name',
  'yt-content-metadata-view-model ytd-channel-name a',
  'yt-content-metadata-view-model #channel-name a',
  'yt-content-metadata-view-model a[href^="/@"]',
  'yt-content-metadata-view-model a[href^="/channel/"]',
  // Owner container generically
  '#owner ytd-channel-name a',
  '#owner #channel-name a',
  '#owner #channel-name',
  '#owner a[href^="/@"]',
  '#owner a[href^="/channel/"]',
  '#owner a[href^="/c/"]',
  '#owner a[href^="/user/"]',
  '#top-row ytd-channel-name a',
  '#top-row #channel-name a',
  '#top-row a[href^="/@"]',
  '#upload-info a[href^="/@"]',
  '#upload-info a[href^="/channel/"]',
  'ytd-watch-flexy #channel-name a',
  // Newer page-header view model sometimes carries owner on watch transitions
  'yt-page-header-view-model #channel-name',
  'yt-page-header-view-model a[href^="/@"]',
];

/** Selectors that specifically target the Collaboration channels container. */
const COLLAB_CHANNEL_SELECTORS = [
  '[aria-label="Collaboration channels"] a',
  '[aria-label="Collaboration channels"] #channel-name',
  '[aria-label="Collaboration channels"] ytd-channel-name a',
  '[aria-label*="Collaboration"] a[href^="/@"]',
  '[aria-label*="Collaboration"] a[href^="/channel/"]',
  // avatarStack shown for collab videos
  'ytd-video-owner-renderer #avatar-stack a[href^="/@"]',
  'ytd-video-owner-renderer #avatar-stack #channel-name',
  'yt-avatar-stack-view-model a[href^="/@"]',
  'yt-avatar-stack-view-model #channel-name',
  'ytd-watch-metadata #avatar-stack a[href^="/@"]',
];

/** Channel title in both the older c4 header and YouTube's newer page-header layout. */
const CHANNEL_PAGE_SELECTORS = [
  'yt-page-header-renderer #page-header-title',
  'yt-page-header-view-model #page-header-title',
  'yt-page-header-renderer #channel-name',
  'yt-page-header-view-model #channel-name',
  'ytd-c4-tabbed-header-renderer #channel-name #text',
  'ytd-c4-tabbed-header-renderer #channel-name',
  '#channel-header-container #channel-name #text',
  '#channel-header-container #channel-name',
];

/** Playlist byline/owner only: the playlist title itself must not make an unrelated channel pass. */
const PLAYLIST_CHANNEL_SELECTORS = [
  'ytd-playlist-header-renderer #owner-text a',
  'ytd-playlist-header-renderer #byline-container a',
  'ytd-playlist-header-renderer ytd-playlist-byline-renderer a',
  'ytd-playlist-byline-renderer #byline-container a',
  'ytd-playlist-byline-renderer a',
  'ytd-playlist-header-renderer #owner-text',
  'ytd-playlist-header-renderer #byline-container',
  'ytd-playlist-byline-renderer #text',
  '#playlist #owner-text a',
  '#playlist #byline-container a',
];

/** Shorts channel selectors — Shorts uses reel renderers and a channel bar, not the watch owner. */
const SHORTS_CHANNEL_SELECTORS = [
  // Classic Shorts overlay
  'ytd-reel-player-overlay-renderer ytd-channel-name a',
  'ytd-reel-player-overlay-renderer #channel-name a',
  'ytd-reel-player-overlay-renderer a[href^="/@"]',
  // Active reel (YouTube keeps 3 stacked, only one is-active)
  'ytd-reel-video-renderer[is-active] ytd-channel-name a',
  'ytd-reel-video-renderer[is-active] #channel-name a',
  'ytd-reel-video-renderer[is-active] a[href^="/@"]',
  'ytd-reel-video-renderer[is-active] a[href^="/channel/"]',
  // New channel bar view model for Shorts
  'yt-reel-channel-bar-view-model a[href^="/@"]',
  'yt-reel-channel-bar-view-model #channel-name a',
  'yt-reel-channel-bar-view-model ytd-channel-name a',
  // Fallback shorts containers
  '#shorts-player ytd-channel-name a',
  '#shorts-player #channel-name a',
  '#shorts-player a[href^="/@"]',
  'ytd-shorts ytd-channel-name a',
  'ytd-shorts #channel-name a',
  'ytd-shorts a[href^="/@"]',
  // Shorts header / owner area sometimes reuses watch selectors
  '#shorts-inner-container a[href^="/@"]',
  '#shorts-inner-container #channel-name a',
];

export function readChannelName(scope: ParentNode, selectors: string[]): string | null {
  for (const selector of selectors) {
    const nodes = scope.querySelectorAll<HTMLElement>(selector);
    for (const node of nodes) {
      const text = (node.textContent ?? '').trim();
      if (text) return text;
    }
  }
  return null;
}

/** Collect *every* non-empty channel name matched by selectors (deduped case-insensitive). */
export function readAllChannelNames(scope: ParentNode, selectors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const selector of selectors) {
    let nodes: NodeListOf<HTMLElement>;
    try {
      nodes = scope.querySelectorAll<HTMLElement>(selector);
    } catch {
      continue;
    }
    for (const node of nodes) {
      const raw = (node.textContent ?? '').trim();
      if (!raw) continue;
      // Some YouTube nodes concatenate hidden collaborators as "Channel A and 2 more".
      // Keep the raw text for substring matching, but avoid duplicates.
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // Filter out obvious non-names: pure "and 2 more" or empty after trim
      if (/^and \d+ more$/i.test(raw)) continue;
      // YouTube sometimes renders "·" separators or view counts inside channel-name; keep only plausible names (< 80 chars)
      if (raw.length > 80) continue;
      out.push(raw);
    }
  }
  return out;
}

/** True if the page appears to be a YouTube Collaboration (multiple credited channels). */
export function isCollaborationDetected(scope: ParentNode = document): boolean {
  try {
    if (scope.querySelector('[aria-label="Collaboration channels"]')) return true;
    if (scope.querySelector('[aria-label*="Collaboration"]')) return true;
    if (scope.querySelector('yt-avatar-stack-view-model')) return true;
    if (scope.querySelector('ytd-video-owner-renderer #avatar-stack')) return true;
    if (scope.querySelector('#avatar-stack')) {
      // avatar-stack may exist for non-collab single channel too; treat multiple avatars as collab
      const stack = scope.querySelector('#avatar-stack') as HTMLElement | null;
      if (stack && stack.querySelectorAll('a, [href^="/@"], img').length > 1) return true;
    }
    // Text heuristic: "and 2 more" inside owner area
    const owner = scope.querySelector('#owner') ?? scope.querySelector('ytd-video-owner-renderer') ?? scope.querySelector('ytd-watch-metadata');
    const text = (owner?.textContent ?? scope instanceof Document ? (scope as Document).documentElement.textContent : '') ?? '';
    if (/and \d+ more/i.test(text)) return true;
  } catch {
    return false;
  }
  return false;
}

/** Fallback: try to extract channel names from ytInitialData / page JSON when DOM is truncated. */
function extractChannelNamesFromJson(): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  try {
    const html = document.documentElement.innerHTML;
    // videoOwnerRenderer title runs
    const ownerRe = /"videoOwnerRenderer"\s*:\s*\{[^}]*"title"\s*:\s*\{[^}]*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = ownerRe.exec(html)) !== null) {
      const raw = m[1]?.trim();
      if (raw && !seen.has(raw.toLowerCase()) && raw.length <= 80) {
        seen.add(raw.toLowerCase());
        names.push(raw);
      }
    }
    // generic channelName field
    const chanRe = /"channelName"\s*:\s*"([^"]+)"/g;
    while ((m = chanRe.exec(html)) !== null) {
      const raw = m[1]?.trim();
      if (raw && !seen.has(raw.toLowerCase()) && raw.length <= 80 && raw !== 'YouTube') {
        seen.add(raw.toLowerCase());
        names.push(raw);
      }
    }
    // look for collaborator handles in canonicalBaseUrl
    // Not names, but we can attempt to derive display names from nearby title runs
    // Search for dialog list items that carry collaborator names: "listItemViewModel" title content
    const collabTitleRe = /"title"\s*:\s*\{\s*"content"\s*:\s*"([^"]+)"\s*,\s*"commandRuns"/g;
    while ((m = collabTitleRe.exec(html)) !== null) {
      const raw = m[1]?.trim();
      if (raw && !seen.has(raw.toLowerCase()) && raw.length <= 80) {
        seen.add(raw.toLowerCase());
        names.push(raw);
      }
    }
  } catch {
    // ignore parse errors, DOM names already cover most cases
  }
  return names;
}

/** Aggregate all watch-page channel names: primary + collaborators + JSON fallback. */
function getWatchChannelNames(): string[] {
  const primary = readAllChannelNames(document, WATCH_CHANNEL_SELECTORS);
  const collab = readAllChannelNames(document, COLLAB_CHANNEL_SELECTORS);
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const list of [primary, collab]) {
    for (const n of list) {
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
  }
  // If DOM shows truncated "and X more" or no names but collab indicator present, try JSON
  const truncated = merged.length === 1 && /and \d+ more/i.test(merged[0]);
  if ((merged.length === 0 && isCollaborationDetected()) || truncated) {
    const jsonNames = extractChannelNamesFromJson();
    for (const n of jsonNames) {
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
    // If still truncated single entry, keep it but JSON likely added more
    if (truncated && merged.length === 1) {
      // keep as is; will be handled by trust fallback
    }
  }
  // Also split concatenated names like "Channel A and Channel B" or "A • B" into parts for better matching
  // Keep original combined entry for display, but add splits for matching
  const splits: string[] = [];
  for (const name of [...merged]) {
    // Common collab separators in title or owner display
    const parts = name.split(/\s+(?:and|&|\+|·|•)\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        const k = p.toLowerCase();
        if (!seen.has(k) && p.length > 1 && p.length <= 80) {
          seen.add(k);
          splits.push(p);
        }
      }
    }
  }
  // Append splits so anyChannelAllowed can see them; original combined stays for UI
  return [...merged, ...splits];
}

/** All names visible on a channel/playlist page plus watch fallback (for SPA transitions). */
function getBrowsingChannelNames(kind: 'channel' | 'playlist'): string[] {
  const selectors = kind === 'playlist' ? PLAYLIST_CHANNEL_SELECTORS : CHANNEL_PAGE_SELECTORS;
  const primary = readAllChannelNames(document, selectors);
  const fallback = readAllChannelNames(document, WATCH_CHANNEL_SELECTORS);
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const list of [primary, fallback]) {
    for (const n of list) {
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(n);
    }
  }
  // split concatenated as above
  const extra: string[] = [];
  for (const name of [...merged]) {
    const parts = name.split(/\s+(?:and|&|\+|·|•)\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        const k = p.toLowerCase();
        if (!seen.has(k) && p.length > 1 && p.length <= 80) {
          seen.add(k);
          extra.push(p);
        }
      }
    }
  }
  return [...merged, ...extra];
}

/** Shorts-specific: reads channel names from the active reel and shorts containers, plus Collaboration. */
function getShortsChannelNames(): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  const allSelectors = [...SHORTS_CHANNEL_SELECTORS, ...COLLAB_CHANNEL_SELECTORS];
  // Active reel has highest priority — YouTube stacks 3 reels, only one is-active
  const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]') as ParentNode | null;
  if (activeReel) {
    const activeNames = readAllChannelNames(activeReel, allSelectors);
    for (const n of activeNames) {
      const k = n.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(n);
      }
    }
    // Also check global collab container even if not inside active reel
    const collabNames = readAllChannelNames(document, COLLAB_CHANNEL_SELECTORS);
    for (const n of collabNames) {
      const k = n.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(n);
      }
    }
  }
  // Shorts player container fallback
  const shortsContainers: ParentNode[] = [
    document.querySelector('#shorts-player'),
    document.querySelector('ytd-shorts'),
    document.querySelector('#shorts-inner-container'),
    document,
  ].filter(Boolean) as ParentNode[];
  for (const container of shortsContainers) {
    const names = readAllChannelNames(container, allSelectors);
    for (const n of names) {
      const k = n.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        merged.push(n);
      }
    }
  }
  // Channel header for browsing the Shorts tab of a channel (e.g. /@jee/shorts)
  const headerNames = readAllChannelNames(document, CHANNEL_PAGE_SELECTORS);
  for (const n of headerNames) {
    const k = n.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(n);
    }
  }
  // Final fallback to watch selectors (layout sometimes reuses owner)
  const watchNames = readAllChannelNames(document, WATCH_CHANNEL_SELECTORS);
  for (const n of watchNames) {
    const k = n.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(n);
    }
  }
  // Also split concatenated like "A and B"
  const splits: string[] = [];
  for (const name of [...merged]) {
    const parts = name.split(/\s+(?:and|&|\+|·|•)\s+/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const p of parts) {
        const k = p.toLowerCase();
        if (!seen.has(k) && p.length > 1 && p.length <= 80) {
          seen.add(k);
          splits.push(p);
        }
      }
    }
  }
  return [...merged, ...splits];
}

export interface YouTubeOptions {
  keywords: string[];
  overlay: Overlay;
  leave: () => void;
  /** Called whenever filter health or the current cover state changes. */
  onHealth: (ok: boolean, detail?: string) => void;
}

export interface YouTubeFilter {
  stop(): void;
  /** Current technical health and, when intentionally covering content, its non-failure detail. */
  health(): { ok: boolean; detail?: string };
}

const LAYOUT_GRACE_MS = 8000;

/** Stops any media that is playing behind a cover, so closed content cannot keep earning or distracting. */
function pauseMedia(): void {
  for (const media of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
    if (!media.paused) media.pause();
  }
}

/** True when something on the page is actually playing — the moment a channel has to be checked. */
function hasPlayingMedia(): boolean {
  for (const media of document.querySelectorAll<HTMLMediaElement>('video, audio')) {
    if (!media.paused) return true;
  }
  return false;
}

/** Starts the YouTube filter for the current page. */
export function startYouTubeFilter(opts: YouTubeOptions): YouTubeFilter {
  const started = Date.now();
  let healthy = true;
  let scheduled: number | null = null;
  /** Key of the cover currently shown; covers are rebuilt only when this key changes. */
  let coverKey = '';
  /**
   * Page on which playback was refused. Browsing that page is still allowed, but the explanation
   * stays up (rather than vanishing the instant the media is paused) until the page changes, the
   * channel turns out to match, or the user chooses to keep browsing.
   */
  let playbackRefused: string | null = null;
  /** Page where a Collaboration was accepted on trust — do not re-block after Continue. */
  let collabTrustPage: string | null = null;
  /** Page key of the last scan, so a navigation can drop the previous page's playback refusal. */
  let lastPage = '';

  const studySearch = (query?: string) => {
    location.assign(query ? `/results?search_query=${encodeURIComponent(query)}` : '/results');
  };

  const setCover = (key: string, build: () => HTMLElement | null): void => {
    if (coverKey === key) return;
    coverKey = key;
    opts.overlay.set(build());
  };

  const clearCover = () => setCover('', () => null);

  const notStudyCover = (title: string, text: string, onBrowse?: () => void) =>
    coverCard({
      eyebrow: 'EarnTime · Productive Mode',
      title,
      text,
      actions: [
        { label: 'Study search', onClick: () => studySearch(opts.keywords[0]) },
        // Only offered where the page itself stays usable: the refusal is about the playback.
        ...(onBrowse ? [{ label: 'Keep browsing', onClick: onBrowse }] : []),
        { label: 'Back', onClick: opts.leave, secondary: true },
      ],
    });

  const trustCollabCover = (names: string[], page: string) =>
    coverCard({
      eyebrow: 'EarnTime · Productive Mode — trust-based',
      title: 'Collaboration — not fully verified',
      text:
        names.length > 0
          ? `EarnTime detected a Collaboration video but could only read: ${names.map((n) => `"${n}"`).join(', ')}. It could not verify all collaborators against your keywords (${opts.keywords.join(', ')}), so this video is allowed on trust. Please use it only if it matches your study purpose. This time is counted as productive.`
          : `EarnTime detected a Collaboration video but could not read its channel names against your keywords (${opts.keywords.join(', ')}). This video is allowed on trust (fallback) — please use it only if it matches your study purpose.`,
      actions: [
        { label: 'Continue (trust)', onClick: () => { collabTrustPage = page; playbackRefused = null; clearCover(); setHealthy(true); } },
        { label: 'Study search', onClick: () => studySearch(opts.keywords[0]) },
        { label: 'Back', onClick: opts.leave, secondary: true },
      ],
    });

  const failClosedCover = () =>
    coverCard({
      eyebrow: 'EarnTime · filter unavailable',
      title: 'YouTube layout not recognised',
      text: 'EarnTime cannot verify the channels on this page, so nothing is shown. This time is counted as unproductive until the page loads correctly.',
      actions: [{ label: 'Back', onClick: opts.leave, secondary: true }],
    });

  const hideNode = (node: HTMLElement) => {
    node.dataset.etHidden = '1';
    node.style.setProperty('display', 'none', 'important');
  };

  const showNode = (node: HTMLElement) => {
    if (node.dataset.etHidden === '1') {
      node.dataset.etHidden = '';
      node.style.removeProperty('display');
    }
  };

  const hideAlwaysHidden = () => {
    for (const node of document.querySelectorAll<HTMLElement>(ALWAYS_HIDDEN)) hideNode(node);
  };

  /** Homepage: no cover, no banner over the page — simply no videos at all. */
  const hideHomeFeed = () => {
    hideAlwaysHidden();
    for (const node of document.querySelectorAll<HTMLElement>(`${ITEM_SELECTOR}, ${HOME_HIDDEN}`)) hideNode(node);
  };

  /**
   * Search results, channel pages and playlist pages are all browsable in full — even content from
   * an unmatched or unreadable channel. Anything an earlier page (the homepage) hid is shown again.
   */
  const showBrowsables = () => {
    for (const node of document.querySelectorAll<HTMLElement>(HOME_HIDDEN)) showNode(node);
    for (const node of document.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) showNode(node);
    hideAlwaysHidden();
  };

  let healthDetail: string | undefined;

  const setHealthy = (next: boolean, detail?: string) => {
    const nextDetail = next ? detail : undefined;
    if (next !== healthy || nextDetail !== healthDetail) {
      healthy = next;
      healthDetail = nextDetail;
      opts.onHealth(healthy, healthDetail);
    }
  };

  /**
   * Channel and playlist pages: browsing is never refused, so no owner is read to decide whether the
   * page may be seen. The rule is applied to playback instead. The moment media plays, the owner is
   * read from the page and unmatched content is covered and stopped — which is also all that happens
   * when the owner cannot be read, instead of the whole page being blocked for it.
   * Collab-aware: any visible channel name on the page may satisfy the keywords.
   */
  const checkBrowsingPage = (kind: 'channel' | 'playlist', page: string) => {
    showBrowsables();

    if (!hasPlayingMedia() && playbackRefused !== page) {
      setHealthy(true);
      clearCover();
      return;
    }

    const names = getBrowsingChannelNames(kind);
    // Also consider watch fallback names already included
    if (anyChannelAllowed(names, opts.keywords)) {
      playbackRefused = null;
      setHealthy(true);
      clearCover();
      return;
    }

    // No matching collaborator found.
    // If collaboration detected but names empty/truncated and nothing matched, fall back to trust — browsing pages are low risk.
    const collab = isCollaborationDetected();
    if (names.length === 0 && collab) {
      // Trust-based allow for browsing pages: don't block the page, just inform.
      // We treat as allowed but keep a note; no cover.
      playbackRefused = null;
      setHealthy(true, 'collab-trust');
      clearCover();
      return;
    }

    const label = kind === 'playlist' ? 'playlist' : 'channel';
    const owner = kind === 'playlist' ? "the playlist's channel" : 'the channel';
    // Build display string for multiple names
    const display = names.length > 0 ? names.slice(0, 5).map((n) => `"${n}"`).join(', ') : null;
    const more = names.length > 5 ? ` and ${names.length - 5} more` : '';
    playbackRefused = page;
    setHealthy(true, 'covered');
    setCover(`${page}:${display ?? '?'}`, () =>
      notStudyCover(
        names.length > 0 ? 'Not on your study list' : 'Channel not verified',
        names.length > 0
          ? `None of ${names.length === 1 ? `the channel ${display}` : `the channels ${display}${more}`} match your YouTube keywords, so nothing plays from this ${label} in Productive Mode. ${collab ? 'Collaboration detected — checked all visible collaborators. ' : ''}You can still browse it. This time is not charged or credited.`
          : `EarnTime could not read ${owner} name, so nothing plays from this ${label} in Productive Mode (fail closed). You can still browse it. This time is not charged or credited.`,
        () => {
          // The page was never the problem, the playback was: let the user browse on. Starting
          // playback again runs this check again.
          playbackRefused = null;
          clearCover();
          setHealthy(true);
        },
      ),
    );
    pauseMedia();
  };

  const scan = () => {
    scheduled = null;
    // The page kind is read on EVERY scan: a single-page navigation (channel page → video,
    // homepage → video, search → video) must be judged as what the page is right now, on the
    // first visit, without a reload.
    const kind = youtubePageKind(location.pathname);
    const page = `${kind}:${location.pathname}${location.search}`;
    // A different page is a different verdict: playback refused on the previous page says nothing
    // about this one, so the refusal is dropped on every navigation (including going back).
    if (page !== lastPage) {
      lastPage = page;
      playbackRefused = null;
      collabTrustPage = null;
    }
    const elapsed = Date.now() - started;
    const layoutReady = Boolean(document.querySelector('ytd-app'));
    if (!layoutReady) {
      // Layout not recognised: nothing can be verified. Nothing may play while we wait either.
      const failed = elapsed >= LAYOUT_GRACE_MS;
      setHealthy(!failed);
      pauseMedia();
      if (failed) {
        setCover('fail', failClosedCover);
      }
      return;
    }

    if (kind === 'home') {
      // Not a blocking banner: the page itself stays usable, it just contains no videos.
      setHealthy(true);
      clearCover();
      hideHomeFeed();
      return;
    }
    if (kind === 'shorts') {
      // Shorts are now mode-aware: study Shorts (channel matches keywords) are allowed,
      // everything else remains covered. Channel Shorts tabs are browsable; playback is checked.
      hideAlwaysHidden();
      const names = getShortsChannelNames();
      const collab = isCollaborationDetected();
      const isChannelTab = /^\/(@[^/]+\/shorts|channel\/[^/]+\/shorts|c\/[^/]+\/shorts|user\/[^/]+\/shorts)(\/|$)/i.test(
        location.pathname.toLowerCase(),
      );
      // Channel Shorts tab: browsing the grid is allowed, playback is gated
      if (isChannelTab) {
        showBrowsables();
        if (!hasPlayingMedia() && playbackRefused !== page && collabTrustPage !== page) {
          // No playback yet — let the user browse
          if (names.length === 0 && collab) {
            // Trust browsing for collab tab where names unreadable
            setHealthy(true, 'collab-trust');
            clearCover();
            return;
          }
          setHealthy(true);
          clearCover();
          return;
        }
        // If something is playing on the tab, fall through to playback check
      }
      if (anyChannelAllowed(names, opts.keywords)) {
        playbackRefused = null;
        setHealthy(true);
        clearCover();
        return;
      }
      if (collab && collabTrustPage === page) {
        setHealthy(true);
        clearCover();
        return;
      }
      if (collab && (names.length === 0 || (names.length === 1 && /and \d+ more/i.test(names[0])))) {
        setHealthy(true, 'collab-trust');
        setCover(`shorts:collab-trust:${page}`, () => trustCollabCover(names, page));
        pauseMedia();
        return;
      }
      // Channel tab without playback — keep browsable even if channel doesn't match
      if (isChannelTab && !hasPlayingMedia()) {
        // Keep the shelf visible but don't cover the whole tab; playback will be refused when it starts
        setHealthy(true);
        clearCover();
        return;
      }
      const display = names.length > 0 ? names.slice(0, 3).map((n) => `"${n}"`).join(', ') : null;
      const more = names.length > 3 ? ` and ${names.length - 3} more` : '';
      const collabNote = collab ? ' Collaboration detected — checked all visible collaborators.' : '';
      const reason =
        names.length > 0
          ? names.length === 1
            ? `The Shorts channel ${display} does not match your YouTube keywords, so Shorts are closed in Productive Mode.${collabNote} This time is not charged or credited.`
            : `None of the Shorts channels ${display}${more} match your YouTube keywords, so Shorts are closed in Productive Mode.${collabNote} This time is not charged or credited.`
          : "EarnTime could not read this Shorts channel name, so it is closed in Productive Mode (fail closed). This time is not charged or credited.";
      // For channel tabs, Keep browsing lets user stay on tab
      const onBrowse = isChannelTab
        ? () => {
            playbackRefused = null;
            clearCover();
            setHealthy(true);
          }
        : undefined;
      playbackRefused = page;
      setHealthy(true, 'covered');
      // Use watch-style key so cover updates if channel changes
      setCover(`shorts:${display ?? '?'}:${page}`, () => notStudyCover('Shorts are off', reason, onBrowse));
      pauseMedia();
      return;
    }
    if (kind === 'channel' || kind === 'playlist') {
      checkBrowsingPage(kind, page);
      return;
    }
    if (kind === 'other') {
      setHealthy(true, 'covered');
      setCover('other', () =>
        notStudyCover(
          'Not available in Productive Mode',
          'Study searches, videos, and every channel and playlist page are open in Productive Mode. This time is not charged or credited.',
        ),
      );
      pauseMedia();
      return;
    }
    if (kind === 'search') {
      setHealthy(true);
      clearCover();
      showBrowsables();
      return;
    }
    // Watch page: the channel is read from the page itself the moment the video plays. Unknown
    // channel = closed (fail closed), but Collaboration videos are checked for ANY collaborator and
    // fall back to trust if the layout exposes a Collaboration but no name can be parsed.
    hideAlwaysHidden();
    const names = getWatchChannelNames();
    const collab = isCollaborationDetected();
    if (anyChannelAllowed(names, opts.keywords)) {
      setHealthy(true);
      clearCover();
      return;
    }
    // If collaboration was previously accepted on trust for this page, keep it allowed.
    if (collab && collabTrustPage === page) {
      setHealthy(true);
      clearCover();
      return;
    }
    if (names.length === 0 && collab) {
      // Trust-based fallback for Collaboration where layout could not be parsed.
      // As the user requested: if unable to read collab channels, allow with a trust notice
      // rather than blocking study content behind an unverifiable UI.
      setHealthy(true, 'collab-trust');
      setCover(`watch:collab-trust:${page}`, () => trustCollabCover(names, page));
      pauseMedia();
      return;
    }
    // If collaboration truncated (e.g. "and 2 more" and JSON didn't help) and still no match,
    // also treat as trust rather than hard block — the hidden names could include a study channel.
    const truncated = names.length === 1 && /and \d+ more/i.test(names[0]);
    if (truncated && collab && !anyChannelAllowed(names, opts.keywords)) {
      setHealthy(true, 'collab-trust');
      setCover(`watch:collab-trust-trunc:${page}`, () => trustCollabCover(names, page));
      pauseMedia();
      return;
    }
    // Normal fail-closed / not-on-list case
    const display = names.length > 0 ? names.slice(0, 5).map((n) => `"${n}"`).join(', ') : null;
    const more = names.length > 5 ? ` and ${names.length - 5} more` : '';
    const collabNote = collab ? ' Collaboration detected — checked all visible collaborators.' : '';
    const hasNames = names.length > 0;
    // If multiple names, indicate which were checked
    const reasonText = hasNames
      ? names.length === 1
        ? `The channel ${display} does not match your YouTube keywords, so this video is closed in Productive Mode.${collabNote} This time is not charged or credited.`
        : `None of the channels ${display}${more} match your YouTube keywords, so this video is closed in Productive Mode.${collabNote} This time is not charged or credited.`
      : "EarnTime could not read this video's channel name, so it is closed in Productive Mode (fail closed). This time is not charged or credited.";
    setHealthy(true, 'covered');
    setCover(`watch:${display ?? '?'}`, () =>
      notStudyCover('Not on your study list', reasonText),
    );
    pauseMedia();
  };

  const schedule = () => {
    if (scheduled !== null) return;
    scheduled = window.setTimeout(scan, 250);
  };

  /** A video starting to play is the moment the channel must be checked — scan immediately. */
  const onMediaPlay = () => {
    if (scheduled !== null) {
      window.clearTimeout(scheduled);
      scheduled = null;
    }
    scan();
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('yt-navigate-finish', schedule);
  document.addEventListener('play', onMediaPlay, true);
  const interval = window.setInterval(schedule, 2000);
  // Until the first scan decides, the page is treated as productive during the grace period.
  scan();

  return {
    stop() {
      observer.disconnect();
      window.clearInterval(interval);
      if (scheduled !== null) window.clearTimeout(scheduled);
      document.removeEventListener('yt-navigate-finish', schedule);
      document.removeEventListener('play', onMediaPlay, true);
    },
    health: () => (healthDetail === undefined ? { ok: healthy } : { ok: healthy, detail: healthDetail }),
  };
}
