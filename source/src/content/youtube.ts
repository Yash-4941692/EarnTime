/**
 * YouTube Productive Mode. Everything that is only being LOOKED AT stays visible: search results,
 * channel pages and playlist pages are all browsable whatever their owner is. The channel rule is
 * applied where it can be trusted — when something actually starts PLAYING. A watch page is judged
 * by the channel shown in its own metadata; on a channel or playlist page the owner is read at the
 * moment media plays, so a channel name EarnTime cannot parse no longer blocks the whole page.
 * Shorts, feeds and subscriptions remain unavailable, and the homepage shows no videos (but no
 * banner).
 */

import { channelAllowed, youtubePageKind } from '../core/matchers';
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

const WATCH_CHANNEL_SELECTORS = [
  'ytd-video-owner-renderer ytd-channel-name a',
  'ytd-video-owner-renderer #channel-name a',
  '#owner ytd-channel-name a',
  '#owner #channel-name a',
  '#owner #channel-name',
  'ytd-watch-metadata ytd-channel-name a',
  '#upload-info a[href^="/@"]',
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
   */
  const checkBrowsingPage = (kind: 'channel' | 'playlist', page: string) => {
    showBrowsables();

    if (!hasPlayingMedia() && playbackRefused !== page) {
      setHealthy(true);
      clearCover();
      return;
    }

    // The page's own owner first: a playlist title must never qualify an unrelated channel. The
    // watch-page selectors are a fallback for a video owner rendered while the page is changing.
    const selectors = kind === 'playlist' ? PLAYLIST_CHANNEL_SELECTORS : CHANNEL_PAGE_SELECTORS;
    const name = readChannelName(document, selectors) ?? readChannelName(document, WATCH_CHANNEL_SELECTORS);
    if (channelAllowed(name, opts.keywords)) {
      playbackRefused = null;
      setHealthy(true);
      clearCover();
      return;
    }

    const label = kind === 'playlist' ? 'playlist' : 'channel';
    const owner = kind === 'playlist' ? "the playlist's channel" : 'the channel';
    playbackRefused = page;
    setHealthy(true, 'covered');
    setCover(`${page}:${name ?? '?'}`, () =>
      notStudyCover(
        name ? 'Not on your study list' : 'Channel not verified',
        name
          ? `The channel "${name}" does not match your YouTube keywords, so nothing plays from this ${label} in Productive Mode. You can still browse it. This time is not charged or credited.`
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
      setHealthy(true, 'covered');
      setCover('shorts', () => notStudyCover('Shorts are off', 'Short-form video is not part of Productive Mode. This time is not charged or credited.'));
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
    // channel = closed (fail closed).
    hideAlwaysHidden();
    const name = readChannelName(document, WATCH_CHANNEL_SELECTORS);
    if (channelAllowed(name, opts.keywords)) {
      setHealthy(true);
      clearCover();
    } else {
      setHealthy(true, 'covered');
      setCover(`watch:${name ?? '?'}`, () =>
        notStudyCover(
          'Not on your study list',
          name
            ? `The channel "${name}" does not match your YouTube keywords, so this video is closed in Productive Mode. This time is not charged or credited.`
            : "EarnTime could not read this video's channel name, so it is closed in Productive Mode (fail closed). This time is not charged or credited.",
        ),
      );
      pauseMedia();
    }
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
