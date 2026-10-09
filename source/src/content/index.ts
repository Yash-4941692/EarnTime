/**
 * Content script (top frame only, document_start). It asks the service worker what this page
 * should show. It never decides its own rules: the answer comes from state, and any mode choice is
 * sent back for the worker to validate.
 */

import type { PageDirective } from '../core/directive';
import type { HalfMode } from '../core/types';
import { askWorker } from './askWorker';
import { applyGrayscale } from './grayscale';
import { chooserCard, createOverlay, type Overlay } from './overlay';
import { startYouTubeFilter, type YouTubeFilter } from './youtube';

const HEALTH_INTERVAL_MS = 10_000;

interface Reply {
  ok: boolean;
  directive?: PageDirective;
  error?: { message: string };
}

function send(message: unknown): Promise<Reply | undefined> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (reply: Reply | undefined) => {
        if (chrome.runtime.lastError) {
          resolve(undefined);
          return;
        }
        resolve(reply);
      });
    } catch {
      // The extension was reloaded or disabled: this page is no longer managed.
      resolve(undefined);
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
      if (directive.grayscale) applyGrayscale();
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

  // The service worker may still be starting when this page sends its first message, so the question
  // is retried until it answers. Without the retry, a page that loaded while the worker was asleep
  // was left with no chooser, no filter and no session — open, and uncharged.
  void askWorker<Reply>({ type: 'page.init', url }, send).then((reply) => {
    if (!reply || !reply.ok) return;
    applyDirective(reply.directive);
  });
}

start();
