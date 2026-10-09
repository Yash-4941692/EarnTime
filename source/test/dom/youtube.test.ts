/**
 * DOM tests for the only half-productive content filter. These run the real YouTube filter against
 * small fixture layouts in jsdom, including the distinction between a deliberate cover and a broken
 * page layout.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { startYouTubeFilter, type YouTubeFilter } from '../../src/content/youtube';

interface Health {
  ok: boolean;
  detail?: string;
}

interface Harness {
  dom: JSDOM;
  health: Health[];
  overlay: HTMLElement | null;
  overlayText(): string;
  currentOverlay(): HTMLElement | null;
  pauseCount(): number;
}

const GLOBALS = ['window', 'document', 'location', 'Element', 'HTMLElement', 'HTMLMediaElement', 'Node', 'MutationObserver'] as const;

function makeYouTube(path: string, body: string): Harness {
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, { url: `https://www.youtube.com${path}` });
  let pauses = 0;
  const health: Health[] = [];

  Object.defineProperty(dom.window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value() {
      pauses += 1;
      Object.defineProperty(this, 'paused', { configurable: true, value: true });
    },
  });

  const h: Harness = {
    dom,
    health,
    overlay: null,
    overlayText: () => h.overlay?.textContent ?? '',
    currentOverlay: () => h.overlay,
    pauseCount: () => pauses,
  };

  return h;
}

function start(h: Harness): { filter: YouTubeFilter; cleanup(): void } {
  const globals = globalThis as Record<string, unknown>;
  const previous = new Map<string, unknown>();
  for (const name of GLOBALS) {
    previous.set(name, globals[name]);
    globals[name] = (h.dom.window as unknown as Record<string, unknown>)[name];
  }

  const filter = startYouTubeFilter({
    keywords: ['JEE', 'Study'],
    overlay: {
      root: h.dom.window.document.createElement('div'),
      set(node) {
        h.overlay = node;
      },
      banner() {},
      remove() {},
    },
    leave() {},
    onHealth(ok, detail) {
      h.health.push(detail === undefined ? { ok } : { ok, detail });
    },
  });

  return {
    filter,
    cleanup() {
      filter.stop();
      for (const [name, value] of previous) {
        if (value === undefined) delete globals[name];
        else globals[name] = value;
      }
      h.dom.window.close();
    },
  };
}

const wait = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

function searchPage(items = ''): string {
  return `<ytd-app><div id="contents">${items}</div></ytd-app>`;
}

function video(id: string, channel: string | null): string {
  return `<ytd-video-renderer id="${id}">${channel === null ? '' : `<ytd-channel-name><a>${channel}</a></ytd-channel-name>`}<a id="title">video</a></ytd-video-renderer>`;
}

test('search keeps every result visible — even unproductive channels — and only hides Shorts', () => {
  const h = makeYouTube('/results', searchPage(`${video('study', 'JEE Physics Academy')}${video('random', 'Random Vlogs')}${video('nameless', null)}<ytd-reel-shelf-renderer id="shorts">Shorts</ytd-reel-shelf-renderer>`));
  const run = start(h);
  try {
    const doc = h.dom.window.document;
    assert.notEqual((doc.querySelector('#study') as HTMLElement).style.display, 'none');
    assert.notEqual((doc.querySelector('#random') as HTMLElement).style.display, 'none', 'unproductive-channel results stay in search');
    assert.notEqual((doc.querySelector('#nameless') as HTMLElement).style.display, 'none', 'unreadable-channel results stay in search; they are judged at play time');
    assert.equal((doc.querySelector('#shorts') as HTMLElement).style.display, 'none');
    assert.deepEqual(run.filter.health(), { ok: true });
  } finally {
    run.cleanup();
  }
});

test('dynamically added search results appear without any channel filtering', async () => {
  const h = makeYouTube('/results', searchPage(video('changing', 'Random Vlogs')));
  const run = start(h);
  try {
    const doc = h.dom.window.document;
    const item = doc.querySelector('#changing') as HTMLElement;
    assert.notEqual(item.style.display, 'none', 'an unproductive channel result is not hidden');
    const added = doc.createElement('ytd-video-renderer');
    added.id = 'later';
    added.innerHTML = '<ytd-channel-name><a>Random Vlogs</a></ytd-channel-name>';
    doc.querySelector('#contents')!.append(added);
    await wait();
    assert.notEqual(added.style.display, 'none', 'new results are shown as they render');
  } finally {
    run.cleanup();
  }
});

test('the homepage shows no cover and no videos — the page itself stays usable', () => {
  const h = makeYouTube(
    '/',
    '<ytd-app><ytd-rich-grid-renderer id="grid"><ytd-rich-section-renderer><ytd-rich-item-renderer id="feed-item"><a>Recommended video</a></ytd-rich-item-renderer></ytd-rich-section-renderer></ytd-rich-grid-renderer><div id="feed">masthead area</div></ytd-app>',
  );
  const run = start(h);
  try {
    const doc = h.dom.window.document;
    assert.equal(h.currentOverlay(), null, 'no blocking banner over the homepage');
    assert.equal((doc.querySelector('#grid') as HTMLElement).style.display, 'none');
    assert.equal((doc.querySelector('#feed-item') as HTMLElement).style.display, 'none', 'no video on the homepage');
    assert.equal(doc.querySelector('#feed')?.textContent, 'masthead area', 'the page chrome stays visible');
    assert.deepEqual(run.filter.health(), { ok: true });
  } finally {
    run.cleanup();
  }
});

test('Shorts are deliberately covered, reported healthy, and paused without being charged', () => {
  const h = makeYouTube('/shorts/abc', '<ytd-app><video></video></ytd-app>');
  const video = h.dom.window.document.querySelector('video')!;
  Object.defineProperty(video, 'paused', { configurable: true, value: false });
  const run = start(h);
  try {
    assert.match(h.overlayText(), /Shorts are off/);
    assert.match(h.overlayText(), /not charged or credited/);
    assert.deepEqual(run.filter.health(), { ok: true, detail: 'covered' });
    assert.deepEqual(h.health, [{ ok: true, detail: 'covered' }]);
    assert.ok(h.pauseCount() > 0);
  } finally {
    run.cleanup();
  }
});

test('unsupported YouTube sections use the same deliberate-cover status', () => {
  const h = makeYouTube('/feed/subscriptions', searchPage());
  const run = start(h);
  try {
    assert.match(h.overlayText(), /Not available in Productive Mode/);
    assert.deepEqual(run.filter.health(), { ok: true, detail: 'covered' });
  } finally {
    run.cleanup();
  }
});

test('a non-study watch page is covered as intentional; becoming study content clears the cover', async () => {
  const h = makeYouTube('/watch?v=1', '<ytd-app><video></video><div id="owner"><ytd-video-owner-renderer><ytd-channel-name><a>Random Vlogs</a></ytd-channel-name></ytd-video-owner-renderer></div><div id="related">related</div></ytd-app>');
  const run = start(h);
  try {
    assert.deepEqual(run.filter.health(), { ok: true, detail: 'covered' });
    assert.match(h.overlayText(), /Not on your study list/);
    assert.match(h.overlayText(), /not charged or credited/);
    assert.equal((h.dom.window.document.querySelector('#related') as HTMLElement).style.display, 'none');
    const channel = h.dom.window.document.querySelector('#owner a') as HTMLElement;
    channel.textContent = 'JEE Physics';
    await wait();
    assert.deepEqual(run.filter.health(), { ok: true });
    assert.equal(h.currentOverlay(), null);
    assert.ok(h.health.some((report) => report.ok && report.detail === 'covered'));
    assert.ok(h.health.some((report) => report.ok && report.detail === undefined));
  } finally {
    run.cleanup();
  }
});

test('an unreadable watch-channel name is a deliberate fail-closed cover, not a broken layout', () => {
  const h = makeYouTube('/watch?v=2', '<ytd-app><video></video><div id="owner"></div></ytd-app>');
  const run = start(h);
  try {
    assert.match(h.overlayText(), /could not read this video/);
    assert.deepEqual(run.filter.health(), { ok: true, detail: 'covered' });
  } finally {
    run.cleanup();
  }
});

test('a matching watch-channel name stays open and hides the up-next shelf', () => {
  const h = makeYouTube('/watch?v=3', '<ytd-app><div id="owner"><ytd-video-owner-renderer><ytd-channel-name><a>Study Chemistry</a></ytd-channel-name></ytd-video-owner-renderer></div><div id="related">related</div></ytd-app>');
  const run = start(h);
  try {
    assert.deepEqual(run.filter.health(), { ok: true });
    assert.equal(h.currentOverlay(), null);
    assert.equal((h.dom.window.document.querySelector('#related') as HTMLElement).style.display, 'none');
  } finally {
    run.cleanup();
  }
});

test('navigating from the homepage to an unproductive video covers it on the first visit, no reload', async () => {
  const h = makeYouTube('/', '<ytd-app><ytd-rich-grid-renderer id="grid">videos</ytd-rich-grid-renderer></ytd-app>');
  const run = start(h);
  try {
    const doc = h.dom.window.document;
    assert.equal((doc.querySelector('#grid') as HTMLElement).style.display, 'none', 'homepage starts with no videos');
    assert.equal(h.currentOverlay(), null);
    // What YouTube does on an in-page navigation: swap the DOM and fire yt-navigate-finish.
    doc.querySelector('#grid')!.remove();
    doc.body.insertAdjacentHTML(
      'beforeend',
      '<div id="owner"><ytd-video-owner-renderer><ytd-channel-name><a>Random Vlogs</a></ytd-channel-name></ytd-video-owner-renderer></div><video></video>',
    );
    Object.defineProperty(doc.querySelector('video')!, 'paused', { configurable: true, value: false });
    h.dom.window.history.pushState({}, '', '/watch?v=1');
    doc.dispatchEvent(new h.dom.window.Event('yt-navigate-finish'));
    await wait();
    assert.match(h.overlayText(), /Not on your study list/, 'the watch page is judged as a watch page immediately');
    assert.match(h.overlayText(), /Random Vlogs/, 'the channel name was read on the first visit');
    assert.ok(h.pauseCount() > 0, 'the video does not keep playing behind the cover');
  } finally {
    run.cleanup();
  }
});

test('a video starting to play triggers the channel check immediately', () => {
  const h = makeYouTube('/watch?v=9', '<ytd-app><video></video><div id="owner"><ytd-video-owner-renderer><ytd-channel-name><a>Study Chemistry</a></ytd-channel-name></ytd-video-owner-renderer></div></ytd-app>');
  const run = start(h);
  try {
    const doc = h.dom.window.document;
    assert.equal(h.currentOverlay(), null, 'the study channel starts open');
    // The channel turns out to be unproductive; the user hits play before any debounce.
    doc.querySelector('#owner a')!.textContent = 'Random Vlogs';
    const video = doc.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'paused', { configurable: true, value: false });
    video.dispatchEvent(new h.dom.window.Event('play'));
    assert.match(h.overlayText(), /Not on your study list/, 'the check ran synchronously with the play event');
    assert.ok(h.pauseCount() > 0, 'the video was paused the moment it started');
  } finally {
    run.cleanup();
  }
});

test('a missing YouTube app layout waits through the grace period before failing closed', async () => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  const h = makeYouTube('/results', '<div id="loading">loading</div>');
  const run = start(h);
  try {
    assert.deepEqual(run.filter.health(), { ok: true });
    assert.equal(h.currentOverlay(), null);
    now += 9000;
    h.dom.window.document.body.append(h.dom.window.document.createElement('div'));
    await wait();
    assert.deepEqual(run.filter.health(), { ok: false });
    assert.match(h.overlayText(), /YouTube layout not recognised/);
    assert.match(h.overlayText(), /counted as unproductive/);
    assert.deepEqual(h.health, [{ ok: false }]);
  } finally {
    run.cleanup();
    Date.now = originalNow;
  }
});

test('a missing layout that appears inside the grace period is not reported as a failure', async () => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  const h = makeYouTube('/results', '<div id="loading">loading</div>');
  const run = start(h);
  try {
    now += 5000;
    h.dom.window.document.body.append(h.dom.window.document.createElement('div'));
    await wait();
    assert.deepEqual(run.filter.health(), { ok: true });
    assert.equal(h.currentOverlay(), null);
  } finally {
    run.cleanup();
    Date.now = originalNow;
  }
});

test('stopping the filter disconnects the observer and leaves future nodes untouched', async () => {
  const h = makeYouTube('/results', searchPage());
  const run = start(h);
  const doc = h.dom.window.document;
  run.filter.stop();
  const item = doc.createElement('ytd-video-renderer');
  item.id = 'after-stop';
  item.innerHTML = '<ytd-channel-name><a>Random Vlogs</a></ytd-channel-name>';
  doc.querySelector('#contents')!.append(item);
  await wait();
  assert.notEqual(item.style.display, 'none');
  run.cleanup();
});
