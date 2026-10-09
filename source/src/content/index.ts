/**
 * Content script (top frame only, document_start). It asks the service worker what this page
 * should show. It never decides its own rules: the answer comes from state, and any mode choice is
 * sent back for the worker to validate.
 */

import { WHATSAPP_HOST } from '../core/constants';
import type { PageDirective } from '../core/directive';
import type { AutoReplyJob, HalfMode } from '../core/types';
import { applyGrayscale } from './grayscale';
import { chooserCard, createOverlay, type Overlay } from './overlay';
import { startWhatsAppAutoReply } from './whatsappSend';
import { startWhatsAppFilter, type WhatsAppFilter } from './whatsapp';
import { startYouTubeFilter, type YouTubeFilter } from './youtube';

const HEALTH_INTERVAL_MS = 10_000;

interface Reply {
  ok: boolean;
  directive?: PageDirective;
  jobs?: AutoReplyJob[];
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

/**
 * Auto-replies run on WhatsApp Web whatever mode the page is in: the point is that a message is
 * answered without the user opening the site. The service worker decides what to send; this tab only
 * delivers it.
 */
function startAutoReply(getFilter: () => WhatsAppFilter | null): void {
  if (location.hostname !== WHATSAPP_HOST) return;
  startWhatsAppAutoReply({
    async requestJobs(unread, groups) {
      const reply = await send({ type: 'wa.poll', unread, groups });
      return reply?.jobs ?? [];
    },
    async report(job, ok, error, text) {
      await send({ type: 'wa.result', jobId: job.id, chat: job.chat, ruleId: job.ruleId, ok, text, error: error ?? undefined });
    },
    onSending: (active) => getFilter()?.setPaused(active),
    async onGiveUp(reason) {
      // Surfaced in the activity log rather than as an overlay, so it never covers the page.
      await send({ type: 'wa.result', jobId: 'give-up', chat: 'Auto-reply', ruleId: '', ok: false, error: reason });
    },
  });
}

function start(): void {
  if (window.top !== window) return;
  const url = location.href;
  let overlay: Overlay | null = null;
  let youtube: YouTubeFilter | null = null;
  let whatsapp: WhatsAppFilter | null = null;
  let healthTimer: number | null = null;
  let lastKey = '';

  const ensureOverlay = (): Overlay => {
    if (!overlay) overlay = createOverlay();
    return overlay;
  };

  const teardownFilters = () => {
    youtube?.stop();
    whatsapp?.stop();
    youtube = null;
    whatsapp = null;
    if (healthTimer !== null) {
      window.clearInterval(healthTimer);
      healthTimer = null;
    }
  };

  const reportHealth = (ok: boolean) => {
    void send({ type: 'page.health', ok });
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

    // Active
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
        } else if (directive.filter === 'whatsapp') {
          whatsapp = startWhatsAppFilter({
            chats: directive.whatsappChats,
            overlay: ov,
            leave,
            onHealth: reportHealth,
          });
        }
        if (directive.filter) {
          // Report what the filter knows right now (it may already be covering the page), then periodically.
          const currentHealth = () => (youtube ? youtube.healthy() : whatsapp ? whatsapp.healthy() : true);
          reportHealth(currentHealth());
          healthTimer = window.setInterval(() => reportHealth(currentHealth()), HEALTH_INTERVAL_MS);
        }
      } else {
        ov.banner('EarnTime · Unproductive Mode', 'warn');
      }
    });
  };

  startAutoReply(() => whatsapp);

  void send({ type: 'page.init', url }).then((reply) => {
    if (!reply || !reply.ok) return;
    applyDirective(reply.directive);
  });
}

start();
