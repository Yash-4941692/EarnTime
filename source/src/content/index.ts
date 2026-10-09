/**
 * Content script (top frame only, document_start). It asks the service worker what this page
 * should show. It never decides its own rules: the answer comes from state, and any mode choice is
 * sent back for the worker to validate.
 *
 * The first question of a page load can race the service worker's cold start: the worker is woken
 * on demand, and until it has registered its listener the message may error — or, worse, never
 * call back at all. So every attempt is bounded by a timeout, the question is retried well past the
 * worker's start-up window, and until an answer arrives the page is covered (fail closed). That is
 * what makes the chooser and the filters apply on the FIRST visit, without a reload.
 */

import type { PageDirective } from '../core/directive';
import type { HalfMode } from '../core/types';
import { askWorker } from './askWorker';
import { chooserCard, coverCard, createOverlay, type Overlay } from './overlay';
import { startYouTubeFilter, type YouTubeFilter } from './youtube';

const HEALTH_INTERVAL_MS = 10_000;
/** A single message must come back within this long, or it counts as no answer and is retried. */
const SEND_TIMEOUT_MS = 3_000;
/** How long the page waits (fail closed) before covering itself until the worker answers. */
const WAITING_COVER_MS = 2_000;

interface Reply {
  ok: boolean;
  directive?: PageDirective;
  error?: { message: string };
}

/** False once the extension has been disabled or reloaded: this page is no longer managed. */
function extensionAlive(): boolean {
  try {
    return Boolean(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

function send(message: unknown): Promise<Reply | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: Reply | undefined) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    // Chrome can drop a message sent while the worker is starting without ever invoking the
    // callback. Without this timeout the page would wait forever, see no directive, and stay open.
    const timer = window.setTimeout(() => finish(undefined), SEND_TIMEOUT_MS);
    try {
      chrome.runtime.sendMessage(message, (reply: Reply | undefined) => {
        if (chrome.runtime.lastError) finish(undefined);
        else finish(reply);
      });
    } catch {
      // The extension was reloaded or disabled: this page is no longer managed.
      finish(undefined);
    }
  });
}

function whenReady(fn: () => void): void {
  if (document.documentElement) fn();
  else document.addEventListener('readystatechange', () => document.documentElement && fn(), { once: true });
}

function start(): void {
  if (window.top !== window) return;
  const url = location.href;
  let overlay: Overlay | null = null;
  let youtube: YouTubeFilter | null = null;
  let healthTimer: number | null = null;
  let lastKey = '';
  let answered = false;

  const ensureOverlay = (): Overlay => {
    if (!overlay) overlay = createOverlay();
    return overlay;
  };

  const teardownFilters = () => {
    youtube?.stop();
    youtube = null;
    if (healthTimer !== null) {
      window.clearInterval(healthTimer);
      healthTimer = null;
    }
  };

  const reportHealth = (ok: boolean, detail?: string) => {
    void send({ type: 'page.health', ok, detail });
  };

  const applyDirective = (directive: PageDirective | undefined) => {
    if (!directive || directive.kind === 'none') {
      teardownFilters();
      overlay?.remove();
      overlay = null;
      lastKey = 'none';
      return;
    }
    const key = JSON.stringify(directive);
    if (key === lastKey) return;
    lastKey = key;

    if (directive.kind === 'choose') {
      teardownFilters();
      whenReady(() => {
        const ov = ensureOverlay();
        ov.banner(null);
        ov.set(
          chooserCard({
            host: directive.entry,
            canUnproductive: directive.canUnproductive,
            reason: directive.reason,
            onChoose: async (mode: HalfMode) => {
              const reply = await send({ type: 'page.choose', url, mode });
              if (!reply) return 'EarnTime is not responding. Reload the page to try again.';
              if (!reply.ok) return reply.error?.message ?? 'That mode is not available right now.';
              applyDirective(reply.directive);
              return null;
            },
            onLeave: () => {
              if (history.length > 1) history.back();
              else location.assign('chrome://newtab/');
            },
          }),
        );
      });
      return;
    }

    whenReady(() => {
      const ov = ensureOverlay();
      ov.set(null);
      teardownFilters();
      if (directive.mode === 'productive') {
        ov.banner('EarnTime · Productive Mode', 'ok');
        const leave = () => {
          if (history.length > 1) history.back();
          else location.assign('chrome://newtab/');
        };
        if (directive.filter === 'youtube') {
          youtube = startYouTubeFilter({
            keywords: directive.youtubeKeywords,
            overlay: ov,
            leave,
            onHealth: reportHealth,
          });
          const sendCurrentHealth = () => {
            const health = youtube?.health() ?? { ok: true };
            reportHealth(health.ok, health.detail);
          };
          // This can be an intentional cover, which reports `detail: 'covered'`, or a broken filter.
          sendCurrentHealth();
          healthTimer = window.setInterval(sendCurrentHealth, HEALTH_INTERVAL_MS);
        }
      } else {
        ov.banner('EarnTime · Unproductive Mode', 'warn');
      }
    });
  };

  // Fail closed while the worker is waking up: after a short wait the page is covered so nothing
  // can be watched or chosen before EarnTime has answered. The cover is replaced by the directive
  // (usually within a fraction of a second) as soon as the reply arrives.
  const waitingCover = () =>
    coverCard({
      eyebrow: 'EarnTime',
      title: 'Checking this site…',
      text: 'EarnTime is confirming how this page should be counted. Nothing opens until it answers.',
      actions: [{ label: 'Reload', onClick: () => location.reload(), secondary: true }],
    });

  const waitTimer = window.setTimeout(() => {
    if (answered || lastKey !== '') return;
    whenReady(() => {
      if (answered || lastKey !== '') return;
      const ov = ensureOverlay();
      ov.banner(null);
      ov.set(waitingCover());
    });
  }, WAITING_COVER_MS);

  // If the extension is disabled mid-load, drop the waiting cover: an unmanaged page must not
  // stay covered by an extension that is no longer there to explain itself.
  const watchdog = window.setInterval(() => {
    if (answered || extensionAlive()) return;
    window.clearInterval(watchdog);
    window.clearTimeout(waitTimer);
    teardownFilters();
    overlay?.remove();
    overlay = null;
    answered = true;
  }, 1000);

  // The service worker may still be starting when this page sends its first message, so the question
  // is retried until it answers. Without the retry, a page that loaded while the worker was asleep
  // was left with no chooser, no filter and no session — open, and uncharged.
  void askWorker<Reply>({ type: 'page.init', url }, send).then((reply) => {
    answered = true;
    window.clearTimeout(waitTimer);
    window.clearInterval(watchdog);
    if (!reply || !reply.ok) return;
    applyDirective(reply.directive);
  });
}

start();
