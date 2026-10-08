/**
 * Service-worker controller. Every state change runs as a job on one serial queue, so accounting,
 * commands and enforcement never interleave. Each job:
 *   1. loads state from storage (single key, validated);
 *   2. takes a checkpoint so time up to "now" is charged under the previous rules;
 *   3. applies the change;
 *   4. takes a second checkpoint (zero-length) so the stored role matches the new state;
 *   5. enforces blocking (declarativeNetRequest rules and open tabs), updates the badge,
 *      sends notifications, and saves only if the state actually changed.
 */

import { applyCommand, auditExport, type Command } from '../core/commands';
import {
  HEALTH_FRESH_MS,
  HEALTH_GRACE_MS,
  IDLE_DETECTION_S,
  MAX_HISTORY_URLS,
  STATE_KEY,
} from '../core/constants';
import { pageDirective } from '../core/directive';
import { buildBlockingRules, type DnrRule } from '../core/dnr';
import { classifyHost, hostFromUrl } from '../core/domains';
import { advance, liveFrom, makeSnapshot, setLast } from '../core/engine';
import { isPageMessage, isUiMessage, type Reply } from '../core/messages';
import { applyReconcile, planReconcile, type ReconcileInput, type Visit } from '../core/reconcile';
import {
  blockReasonForHost,
  canUseUnproductive,
  countsForAccounting,
  filterStateNeeded,
  isDebtMode,
  isExhausted,
  isGuardedUrl,
} from '../core/roles';
import { createInitialState, isLegacyStorage, migrateLegacy, sanitizeState } from '../core/state';
import { badgeText, formatMinutes } from '../core/time';
import type { EarnState, FilterState, IdleState, Observation } from '../core/types';
import { addLedger } from '../core/wallet';
import type { ExtApi, TabInfo } from './api';

export interface ControllerOptions {
  api: ExtApi;
  /** Wall clock (epoch ms). */
  clock: () => number;
  /** Monotonic clock (ms). Used only to measure intervals when the wall clock jumps backwards. */
  mono: () => number;
}

export interface TabChange {
  url?: string;
  audible?: boolean;
  status?: string;
}

export interface Controller {
  tick(): Promise<void>;
  onStartup(): Promise<void>;
  onInstalled(reason?: string): Promise<void>;
  onFocusChanged(): Promise<void>;
  onActivated(): Promise<void>;
  onIdleChanged(): Promise<void>;
  onTabUpdated(tabId: number, change: TabChange, tab: TabInfo): Promise<void>;
  onTabCreated(tab: TabInfo): Promise<void>;
  onTabRemoved(tabId: number): Promise<void>;
  onTabReplaced(addedId: number, removedId: number): Promise<void>;
  onMessage(message: unknown, sender: { tabId?: number; url?: string }): Promise<Reply>;
}

interface Flags {
  debt: boolean;
  exhausted: boolean;
  rulesKey: string;
}

export function createController(opts: ControllerOptions): Controller {
  const { api, clock, mono } = opts;

  let chain: Promise<unknown> = Promise.resolve();
  const health = new Map<number, { ok: boolean; at: number }>();
  let lastMono: number | null = null;
  let appliedRulesKey: string | null = null;
  let lastBadge = '';

  function serial<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task, task);
    chain = run.catch(() => undefined);
    return run;
  }

  async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[EarnTime] ${label} failed`, err);
      return fallback;
    }
  }

  async function loadState(now: number): Promise<{ state: EarnState; created: boolean }> {
    const raw = await api.storage.get(STATE_KEY);
    if (raw && typeof raw === 'object') return { state: sanitizeState(raw, now), created: false };

    const all = await api.storage.getAll();
    if (isLegacyStorage(all)) {
      const state = migrateLegacy(all, now);
      await api.storage.set({ [STATE_KEY]: state });
      // The extension owns its storage. Dropping legacy keys also removes the plaintext nuclear password.
      const legacyKeys = Object.keys(all).filter((key) => key !== STATE_KEY);
      if (legacyKeys.length > 0) await api.storage.remove(legacyKeys);
      return { state, created: true };
    }
    return { state: createInitialState(now), created: true };
  }

  async function save(state: EarnState): Promise<void> {
    await api.storage.set({ [STATE_KEY]: state });
  }

  function flagsOf(state: EarnState): Flags {
    return {
      debt: isDebtMode(state),
      exhausted: isExhausted(state),
      rulesKey: JSON.stringify(buildBlockingRules(state)),
    };
  }

  function filterStateFor(state: EarnState, tabId: number | null, host: string | null, now: number): FilterState {
    if (tabId === null || !filterStateNeeded(host)) return 'n/a';
    const session = state.sessions[String(tabId)];
    if (!session || session.mode !== 'productive') return 'n/a';
    const report = health.get(tabId);
    if (report && now - report.at <= HEALTH_FRESH_MS) return report.ok ? 'ok' : 'bad';
    if (now - session.since < HEALTH_GRACE_MS) return 'pending';
    return 'bad';
  }

  async function observe(state: EarnState, now: number): Promise<Observation> {
    const win = await safe('windows.getLastFocused', undefined, () => api.windows.getLastFocused());
    const tab = win?.tabs?.find((t) => t.active);
    const url = tab?.url ?? tab?.pendingUrl ?? '';
    const host = hostFromUrl(url);
    const idle: IdleState = await safe<IdleState>('idle.queryState', 'active', () =>
      api.idle.queryState(IDLE_DETECTION_S),
    );
    const tabId = tab?.id ?? null;
    return {
      at: now,
      tabId,
      windowId: win?.id ?? null,
      host,
      internalPage: url.length > 0 && host === null,
      focused: Boolean(win && win.focused && win.state !== 'minimized' && tab),
      tabActive: Boolean(tab),
      idle,
      audible: Boolean(tab?.audible),
      incognito: Boolean(tab?.incognito),
      filterState: filterStateFor(state, tabId, host, now),
    };
  }

  async function fetchVisits(from: number, to: number): Promise<Visit[]> {
    return safe<Visit[]>('history', [], async () => {
      const items = await api.history.search(from, to, MAX_HISTORY_URLS);
      const visits: Visit[] = [];
      for (const item of items.slice(0, MAX_HISTORY_URLS)) {
        if (!item.url) continue;
        const host = hostFromUrl(item.url);
        const list = await api.history.getVisits(item.url);
        for (const visit of list) {
          if (typeof visit.visitTime === 'number' && visit.visitTime >= from && visit.visitTime <= to) {
            visits.push({ at: visit.visitTime, host });
          }
        }
      }
      return visits;
    });
  }

  /** Brings accounting up to `now`. Runs history reconciliation first if the gap is too long to trust. */
  async function checkpoint(state: EarnState, now: number): Promise<void> {
    const obs = await observe(state, now);
    const current = mono();
    const monoDelta = lastMono === null ? null : current - lastMono;
    lastMono = current;

    const result = advance(state, obs, monoDelta);
    if (result.kind === 'reconcile') {
      const prev = state.last;
      const snapshot = makeSnapshot(state, obs);
      const visits = await fetchVisits(result.from, result.to);
      const input: ReconcileInput = {
        from: result.from,
        to: result.to,
        visits,
        prevRole: prev ? prev.role : null,
        prevHost: prev ? prev.host : null,
        current: { counts: countsForAccounting(snapshot.role), host: snapshot.host },
        startupAt: state.browserStartAt !== null && state.browserStartAt > result.from ? state.browserStartAt : null,
      };
      const plan = planReconcile(state, input);
      applyReconcile(state, plan, input, now);
      setLast(state, snapshot);
    }
    if (state.last) state.live = liveFrom(state.last);
  }

  async function syncRules(state: EarnState): Promise<void> {
    const desired: DnrRule[] = buildBlockingRules(state);
    const key = JSON.stringify(desired);
    if (key === appliedRulesKey) return;
    await safe('dnr.replace', undefined, async () => {
      const existing = await api.dnr.getDynamicRuleIds();
      await api.dnr.replaceDynamicRules(existing, desired);
      appliedRulesKey = key;
    });
  }

  async function enforceOpenTabs(state: EarnState): Promise<void> {
    const tabs = await safe<TabInfo[]>('tabs.query', [], () => api.tabs.query());
    for (const tab of tabs) {
      if (tab.id === undefined) continue;
      const url = tab.url ?? '';
      const host = hostFromUrl(url);
      if (!host) continue;
      const reason = blockReasonForHost(state, host, tab.id);
      if (reason) {
        await safe('tabs.update', undefined, () => api.tabs.update(tab.id as number, api.pageUrl(`block.html?reason=${reason}`)));
      }
    }
  }

  async function updateBadge(state: EarnState): Promise<void> {
    if (!state.setupDone) {
      if (lastBadge !== '') {
        lastBadge = '';
        await safe('badge', undefined, () => api.badge('', '#000000'));
      }
      return;
    }
    const debt = isDebtMode(state);
    const text = debt ? 'DEBT' : badgeText(state.balanceMs);
    const color = debt ? '#e11d48' : state.balanceMs <= 0 ? '#64748b' : '#059669';
    const key = `${text}|${color}`;
    if (key === lastBadge) return;
    lastBadge = key;
    await safe('badge', undefined, () => api.badge(text, color));
  }

  async function notify(title: string, message: string): Promise<void> {
    await safe('notify', undefined, () => api.notify(title, message));
  }

  /** Sends a block notification when a limit is reached, and keeps the badge in sync. */
  async function finalize(state: EarnState, before: Flags, beforeJson: string): Promise<void> {
    const after = flagsOf(state);
    if (state.setupDone) {
      if (!before.debt && after.debt) {
        await notify('Debt started', `You owe ${formatMinutes(state.debtMs)}. Only productive sites are open until you study it off.`);
      } else if (before.debt && !after.debt) {
        await notify('Debt cleared', 'Thanks for studying. Your debt is repaid and the normal limits apply again.');
      } else if (!before.exhausted && after.exhausted) {
        await notify('Screen time used up', 'Unproductive sites are blocked until you earn more time by studying.');
      }
    }
    await syncRules(state);
    if (after.debt || after.exhausted || after.rulesKey !== before.rulesKey) {
      await enforceOpenTabs(state);
    }
    await updateBadge(state);
    const json = JSON.stringify(state);
    if (json !== beforeJson) {
      state.revision += 1;
      await save(state);
    }
  }

  /**
   * Runs a serialised job. `checkpoint` controls whether time is charged before and after the work.
   */
  function job<T>(
    name: string,
    checkpointed: boolean,
    work: (state: EarnState, now: number) => Promise<T> | T,
  ): Promise<T> {
    return serial(async () => {
      const now = clock();
      const loaded = await loadState(now);
      const state = loaded.state;
      if (loaded.created) await save(state);
      const beforeJson = JSON.stringify(state);
      const before = flagsOf(state);
      try {
        if (checkpointed) await checkpoint(state, now);
        const result = await work(state, now);
        if (checkpointed) await checkpoint(state, now);
        await finalize(state, before, beforeJson);
        return result;
      } catch (err) {
        console.error(`[EarnTime] job ${name} failed`, err);
        throw err;
      }
    });
  }

  function sessionCleanupForUrl(state: EarnState, tabId: number, url: string): void {
    const session = state.sessions[String(tabId)];
    if (!session) return;
    const host = hostFromUrl(url);
    const entry = host ? classifyHost(host, state.rules).entry : null;
    if (entry !== session.entry) delete state.sessions[String(tabId)];
  }

  async function guardTab(tabId: number | undefined, url: string | undefined): Promise<boolean> {
    if (tabId === undefined || !isGuardedUrl(url)) return false;
    await safe('guard.redirect', undefined, () => api.tabs.update(tabId, api.pageUrl('block.html?reason=extensions')));
    await job('guard', false, (state, now) => {
      addLedger(state, 'guard', now, 0, 'Redirected an extensions management page', undefined, true);
    });
    return true;
  }

  const controller: Controller = {
    async tick() {
      await job('tick', true, () => undefined);
    },

    async onStartup() {
      await job('startup', false, (state, now) => {
        // Browser restarts reuse tab ids, so half-productive sessions and health reports are discarded.
        health.clear();
        lastMono = null;
        state.browserStartAt = now;
        state.sessions = {};
        state.last = null;
        state.lastAt = null;
        addLedger(state, 'startup', now, 0, 'Browser started');
        return checkpoint(state, now);
      });
    },

    async onInstalled(reason) {
      await job('installed', true, async (state) => {
        // A fresh install starts the guided setup. Updates and reloads never reopen it.
        if (reason === 'install' && !state.setupDone) {
          await safe('openPage', undefined, () => api.openPage('setup.html'));
        }
      });
    },

    async onFocusChanged() {
      await job('focus', true, () => undefined);
    },

    async onActivated() {
      await job('activated', true, () => undefined);
    },

    async onIdleChanged() {
      await job('idle', true, () => undefined);
    },

    async onTabUpdated(tabId, change, tab) {
      const url = change.url ?? tab.url ?? '';
      if (change.url !== undefined && (await guardTab(tabId, change.url))) return;
      const relevant = change.url !== undefined || change.audible !== undefined || change.status === 'complete';
      if (!relevant) return;
      await job('tab-updated', tab.active, (state) => {
        if (change.url !== undefined && url) sessionCleanupForUrl(state, tabId, url);
      });
    },

    async onTabCreated(tab) {
      await guardTab(tab.id, tab.url ?? tab.pendingUrl);
    },

    async onTabRemoved(tabId) {
      health.delete(tabId);
      await job('tab-removed', true, (state) => {
        delete state.sessions[String(tabId)];
      });
    },

    async onTabReplaced(addedId, removedId) {
      const report = health.get(removedId);
      if (report) {
        health.set(addedId, report);
        health.delete(removedId);
      }
      await job('tab-replaced', true, (state) => {
        const session = state.sessions[String(removedId)];
        if (session) {
          state.sessions[String(addedId)] = session;
          delete state.sessions[String(removedId)];
        }
      });
    },

    async onMessage(message, sender) {
      try {
        return await route(message, sender);
      } catch (err) {
        console.error('[EarnTime] message failed', err);
        return fail('unknown', 'EarnTime could not complete that action. Try again.');
      }
    },
  };

  async function route(message: unknown, sender: { tabId?: number; url?: string }): Promise<Reply> {
    if (isPageMessage(message)) {
      if (message.type === 'page.health') {
        if (sender.tabId !== undefined) {
          const previous = health.get(sender.tabId);
          const ok = message.ok === true;
          health.set(sender.tabId, { ok, at: clock() });
          // A change of filter status changes the role, so account for the interval before it takes effect.
          if (!previous || previous.ok !== ok) await job('filter-health', true, () => undefined);
        }
        return { ok: true };
      }
      const tabId = sender.tabId ?? null;
      if (message.type === 'page.init') {
        return job('page.init', false, (state): Reply => {
          const host = hostFromUrl(sender.url ?? message.url);
          const result = pageDirective(state, tabId, host);
          if (result.clearSession && tabId !== null) delete state.sessions[String(tabId)];
          if (tabId !== null) health.delete(tabId);
          return { ok: true, directive: result.directive };
        });
      }
      if (message.type === 'page.choose') {
        return job('page.choose', true, (state, now): Reply => {
          const host = hostFromUrl(sender.url ?? message.url);
          if (tabId === null || !host) return fail('invalid', 'Open a website to choose a mode.');
          if (message.mode !== 'productive' && message.mode !== 'unproductive') {
            return fail('invalid', 'Unknown mode.');
          }
          const cls = classifyHost(host, state.rules);
          if (cls.kind !== 'half' || !cls.entry) {
            return fail('unavailable', 'This site is not on the half-productive list.');
          }
          if (message.mode === 'unproductive' && !canUseUnproductive(state)) {
            return fail(
              'unavailable',
              isDebtMode(state)
                ? 'Unproductive Mode is locked while EarnTime is in debt mode.'
                : 'Unproductive Mode is unavailable because your balance is empty.',
            );
          }
          state.sessions[String(tabId)] = { entry: cls.entry, mode: message.mode, since: now };
          state.modeLog[cls.entry] = { mode: message.mode, at: now };
          health.delete(tabId);
          addLedger(
            state,
            'mode',
            now,
            0,
            `${message.mode === 'productive' ? 'Productive' : 'Unproductive'} Mode chosen for ${cls.entry}`,
            cls.entry,
          );
          return { ok: true, directive: pageDirective(state, tabId, host).directive };
        });
      }
    }

    if (isUiMessage(message)) {
      if (message.type === 'ui.command') {
        return job('command', true, (state, now): Reply => {
          const result = applyCommand(state, message.command as Command, now);
          if (result.ok) return { ok: true, data: result.data };
          return { ok: false, error: { code: result.code, message: result.message, needMs: result.needMs } };
        });
      }
      if (message.type === 'ui.export') {
        return job('export', false, (state, now): Reply => ({ ok: true, data: auditExport(state, now) }));
      }
    }
    return fail('unknown', 'Unrecognised message.');
  }

  return controller;
}

function fail(code: 'invalid' | 'unavailable' | 'unknown', message: string): Reply {
  return { ok: false, error: { code, message } };
}
