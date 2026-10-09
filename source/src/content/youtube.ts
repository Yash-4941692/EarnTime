/**
 * YouTube Productive Mode. Channel-based filtering: a video is allowed only when its channel NAME
 * contains one of the keywords, and that check runs when the content plays — on the first visit,
 * with no reload. Search results themselves are NOT filtered: unproductive channels stay visible in
 * search and are judged only at play time. Shorts, feeds, subscriptions and channel pages are not
 * available, and the homepage shows no videos (but no blocking banner either).
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

/** Starts the YouTube filter for the current page. */
export function startYouTubeFilter(opts: YouTubeOptions): YouTubeFilter {
  const started = Date.now();
  let healthy = true;
  let scheduled: number | null = null;
  /** Key of the cover currently shown; covers are rebuilt only when this key changes. */
  let coverKey = '';

  const studySearch = (query?: string) => {
    location.assign(query ? `/results?search_query=${encodeURIComponent(query)}` : '/results');
  };

  const setCover = (key: string, build: () => HTMLElement | null): void => {
    if (coverKey === key) return;
    coverKey = key;
    opts.overlay.set(build());
  };

  const clearCover = () => setCover('', () => null);

  const notStudyCover = (title: string, text: string) =>
    coverCard({
      eyebrow: 'EarnTime · Productive Mode',
      title,
      text,
      actions: [
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

  /** Search: every result stays visible (even unproductive channels); judgement happens at play. */
  const showSearchResults = () => {
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

  const scan = () => {
    scheduled = null;
    // The page kind is read on EVERY scan: a single-page navigation (channel page → video,
    // homepage → video, search → video) must be judged as what the page is right now, on the
    // first visit, without a reload.
    const kind = youtubePageKind(location.pathname);
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
    if (kind === 'other') {
      setHealthy(true, 'covered');
      setCover('other', () =>
        notStudyCover('Not available in Productive Mode', 'Only study searches and study videos are open in Productive Mode. This time is not charged or credited.'),
      );
      pauseMedia();
      return;
    }
    if (kind === 'search') {
      setHealthy(true);
      clearCover();
      showSearchResults();
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
