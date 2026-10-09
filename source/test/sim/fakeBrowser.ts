/**
 * A simulated Chromium profile for flow tests. It exposes a `chrome`-shaped object so the real
 * chromeApi.ts adapter, events.ts wiring and controller run unchanged. Time is virtual: `runFor`
 * jumps between scheduled events (30-second alarms, idle transitions, scripted actions).
 *
 * Simulated behaviours (documented, not Chrome itself):
 *  - Only the focused normal window's active tab counts as "active"; background tabs do not.
 *  - chrome.idle reports 'idle' after 15 s without input (from `stopInput`), 'locked' when locked.
 *  - History records one visit per navigation/open of an http(s) page.
 *  - declarativeNetRequest main_frame rules are matched (allow / redirect), with priorities.
 *  - Service-worker suspension and restart: in-memory state is discarded, storage and tabs persist.
 */

import { createChromeApi } from '../../src/background/chromeApi';
import { createController, type Controller } from '../../src/background/controller';
import { attachEvents, type ChromeEvents } from '../../src/background/events';
import { TICK_ALARM, TICK_PERIOD_MIN, IDLE_DETECTION_S } from '../../src/core/constants';
import type { DnrRule } from '../../src/core/dnr';
import type { IdleState } from '../../src/core/types';

export const EXT_ORIGIN = 'chrome-extension://et-sim';

export interface SimTab {
  id: number;
  windowId: number;
  url: string;
  active: boolean;
  audible: boolean;
  incognito: boolean;
}

export interface SimWindow {
  id: number;
  state: 'normal' | 'minimized';
  incognito: boolean;
}

export interface SimVisit {
  url: string;
  at: number;
}

type Listener = (...args: any[]) => unknown;

class SimEvent {
  private listeners: Listener[] = [];
  addListener(cb: Listener): void {
    this.listeners.push(cb);
  }
  removeListener(cb: Listener): void {
    this.listeners = this.listeners.filter((l) => l !== cb);
  }
  hasListeners(): boolean {
    return this.listeners.length > 0;
  }
  emit(...args: unknown[]): void {
    for (const listener of [...this.listeners]) listener(...args);
  }
}

/** Yields to the event loop. Uses setImmediate where available (Node), otherwise a 0 ms timer. */
export function macrotask(): Promise<void> {
  const g = globalThis as { setImmediate?: (fn: () => void) => void };
  return new Promise((resolve) => {
    if (typeof g.setImmediate === 'function') g.setImmediate(() => resolve());
    else setTimeout(resolve, 0);
  });
}

function clone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname;
  } catch {
    return null;
  }
}

export class FakeBrowser {
  /** Virtual wall clock (epoch ms). Tests may move it backwards to simulate clock changes. */
  now: number;
  /** Virtual monotonic clock (ms since start). Always increases with simulated time. */
  mono = 0;

  storage: Record<string, unknown> = {};
  tabs = new Map<number, SimTab>();
  windows = new Map<number, SimWindow>();
  /** Window that has OS focus, or null when Chrome is in the background. */
  focusedWindowId: number | null = null;
  /** Most recently focused window (kept even when Chrome loses focus). */
  lastFocusedId: number | null = null;
  visits: SimVisit[] = [];
  dnr = new Map<number, DnrRule>();
  notifications: Array<{ title: string; message: string; at: number }> = [];
  /** Messages the worker pushed to a content script with chrome.tabs.sendMessage. */
  tabMessages: Array<{ tabId: number; message: unknown; at: number }> = [];
  badge = { text: '', color: '' };
  incognitoAllowed = false;
  /** Called after every storage write (browser tests persist state with it). */
  onStorageWritten: (() => void) | null = null;

  idleState: IdleState = 'active';
  /** When true the simulated user has stopped providing input (idle after the detection interval). */
  userAway = false;
  private lastInputAt: number;
  private locked = false;

  private nextTabId = 1;
  private nextWindowId = 1;
  private alarmNextAt: number | null = null;
  private scheduled: Array<{ at: number; seq: number; fn: () => Promise<void> | void }> = [];
  private seq = 0;

  worker: { controller: Controller; alive: boolean } | null = null;
  /** False while the user has disabled EarnTime: no events, alarms or DNR rules run. History still records. */
  extensionEnabled = true;
  workerRestarts = 0;
  lastErrors: string[] = [];

  /** Who is "sending" messages: a UI page (no tab) or a content script (with a tab). */
  senderFor: (() => { tab?: { id: number; url: string }; url: string }) | null = null;

  readonly events = {
    onStorageChanged: new SimEvent(),
    onAlarm: new SimEvent(),
    onStartup: new SimEvent(),
    onInstalled: new SimEvent(),
    onMessage: new SimEvent(),
    onFocusChanged: new SimEvent(),
    onActivated: new SimEvent(),
    onUpdated: new SimEvent(),
    onCreated: new SimEvent(),
    onRemoved: new SimEvent(),
    onReplaced: new SimEvent(),
    onIdleStateChanged: new SimEvent(),
  };

  constructor(startAt: number) {
    this.now = startAt;
    this.lastInputAt = startAt;
  }

  // ---------------------------------------------------------------- chrome-shaped surface

  readonly chrome: any = this.buildChrome();

  private buildChrome(): any {
    const self = this;
    return {
      runtime: {
        id: 'et-sim',
        onStartup: this.events.onStartup,
        onInstalled: this.events.onInstalled,
        onMessage: this.events.onMessage,
        getURL: (path: string) => `${EXT_ORIGIN}/${path.replace(/^\//, '')}`,
        lastError: undefined,
        sendMessage: (...args: unknown[]) => {
          const callback = typeof args[args.length - 1] === 'function' ? (args.pop() as (r: unknown) => void) : null;
          const message = args[0];
          const sender = self.senderFor ? self.senderFor() : { url: `${EXT_ORIGIN}/popup.html` };
          const promise = self.sendMessage(sender, message);
          if (callback) {
            promise.then(
              (reply) => callback(reply),
              () => callback(undefined),
            );
          }
          return promise;
        },
      },
      storage: {
        local: {
          get: async (key: string | null) => {
            if (key === null) return clone(self.storage);
            if (typeof key !== 'string') throw new Error('sim: only string keys supported');
            return { [key]: clone(self.storage[key]) };
          },
          set: async (values: Record<string, unknown>) => {
            const changes: Record<string, { newValue: unknown; oldValue: unknown }> = {};
            for (const [k, v] of Object.entries(values)) {
              changes[k] = { newValue: clone(v), oldValue: clone(self.storage[k]) };
              self.storage[k] = clone(v);
            }
            self.events.onStorageChanged.emit(changes, 'local');
            self.onStorageWritten?.();
          },
          remove: async (keys: string | string[]) => {
            const list = Array.isArray(keys) ? keys : [keys];
            const changes: Record<string, { oldValue: unknown }> = {};
            for (const k of list) {
              changes[k] = { oldValue: clone(self.storage[k]) };
              delete self.storage[k];
            }
            self.events.onStorageChanged.emit(changes, 'local');
            self.onStorageWritten?.();
          },
        },
        onChanged: this.events.onStorageChanged,
      },
      alarms: {
        get: async (name: string) => (self.alarmNextAt !== null && name === TICK_ALARM ? { name } : undefined),
        create: (name: string, info: { periodInMinutes: number }) => {
          if (name !== TICK_ALARM) throw new Error('sim: unexpected alarm');
          self.alarmNextAt = self.now + info.periodInMinutes * 60_000;
          void info;
        },
        onAlarm: this.events.onAlarm,
      },
      idle: {
        queryState: async (seconds: number) => self.queryIdle(seconds),
        setDetectionInterval: (seconds: number) => {
          if (seconds !== IDLE_DETECTION_S) throw new Error('sim: unexpected idle interval');
        },
        onStateChanged: this.events.onIdleStateChanged,
      },
      windows: {
        WINDOW_ID_NONE: -1,
        getLastFocused: async (q?: { populate?: boolean; windowTypes?: string[] }) => self.lastFocusedWindow(q),
        onFocusChanged: this.events.onFocusChanged,
      },
      tabs: {
        create: async (props: { url?: string }) => {
          const id = await self.openTab(props.url ?? 'about:blank');
          return self.tabInfo(self.tabs.get(id) as SimTab);
        },
        query: async () => [...self.tabs.values()].filter((t) => self.visible(t)).map((t) => self.tabInfo(t)),
        update: async (tabId: number, props: { url?: string }) => {
          const tab = self.tabs.get(tabId);
          if (!tab) throw new Error('sim: no such tab');
          if (props.url !== undefined) {
            self.navigateInternal(tabId, props.url);
            await self.fireTab(self.events.onUpdated, tab, tabId, { url: tab.url }, self.tabInfo(tab));
          }
          return self.tabInfo(tab);
        },
        sendMessage: async (tabId: number, message: unknown) => {
          if (!self.tabs.has(tabId)) throw new Error('sim: no such tab');
          self.tabMessages.push({ tabId, message: clone(message), at: self.now });
          return undefined;
        },
        onActivated: this.events.onActivated,
        onUpdated: this.events.onUpdated,
        onCreated: this.events.onCreated,
        onRemoved: this.events.onRemoved,
        onReplaced: this.events.onReplaced,
      },
      history: {
        search: async (q: { startTime?: number; endTime?: number; maxResults?: number }) => {
          const seen = new Map<string, number>();
          for (const v of self.visits) {
            if (q.startTime !== undefined && v.at < q.startTime) continue;
            if (q.endTime !== undefined && v.at > q.endTime) continue;
            seen.set(v.url, Math.max(seen.get(v.url) ?? 0, v.at));
          }
          return [...seen.entries()]
            .map(([url, lastVisitTime]) => ({ url, lastVisitTime }))
            .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
            .slice(0, q.maxResults ?? 100);
        },
        getVisits: async (q: { url: string }) =>
          self.visits.filter((v) => v.url === q.url).map((v) => ({ visitTime: v.at })),
      },
      declarativeNetRequest: {
        getDynamicRules: async () => [...self.dnr.values()].map((r) => clone(r)),
        updateDynamicRules: async (opts: { removeRuleIds?: number[]; addRules?: DnrRule[] }) => {
          for (const id of opts.removeRuleIds ?? []) self.dnr.delete(id);
          for (const rule of opts.addRules ?? []) {
            if (self.dnr.has(rule.id)) throw new Error(`sim: duplicate rule id ${rule.id}`);
            self.dnr.set(rule.id, clone(rule));
          }
        },
      },
      notifications: {
        create: async (opts: { title: string; message: string; iconUrl?: string }) => {
          if (!opts.iconUrl) throw new Error('sim: iconUrl required');
          self.notifications.push({ title: opts.title, message: opts.message, at: self.now });
          return 'n';
        },
      },
      action: {
        setBadgeText: async (opts: { text: string }) => {
          self.badge.text = opts.text;
        },
        setBadgeBackgroundColor: async (opts: { color: string }) => {
          self.badge.color = opts.color;
        },
      },
      extension: {
        isAllowedIncognitoAccess: async () => self.incognitoAllowed,
      },
    };
  }

  // ---------------------------------------------------------------- worker lifecycle

  /** Starts (or restarts) the service worker: fresh in-memory state, listeners re-attached. */
  startWorker(): void {
    this.workerRestarts += 1;
    this.detachListeners();
    const api = createChromeApi(this.chrome);
    const real = createController({
      api,
      clock: () => this.now,
      mono: () => this.mono,
    });
    const controller = this.track(real);
    attachEvents(this.chromeEventsView(), controller);
    this.worker = { controller, alive: true };
    if (this.alarmNextAt === null) this.alarmNextAt = this.now + TICK_PERIOD_MIN * 60_000;
  }

  /** Records every promise the controller returns so the simulator can wait for queued work. */
  private track(controller: Controller): Controller {
    const wrapped = {} as Record<string, (...args: unknown[]) => Promise<unknown>>;
    for (const name of Object.keys(controller) as Array<keyof Controller>) {
      const fn = controller[name] as unknown as (...args: unknown[]) => Promise<unknown>;
      wrapped[name] = (...args: unknown[]) => {
        const p = fn(...args);
        this.pending.add(p);
        p.then(
          () => this.pending.delete(p),
          () => this.pending.delete(p),
        );
        return p;
      };
    }
    return wrapped as unknown as Controller;
  }

  private pending = new Set<Promise<unknown>>();

  /**
   * Waits until every controller job has finished (including jobs queued by enforcement).
   * Never called from inside a controller job, so it cannot deadlock.
   */
  async settle(): Promise<void> {
    for (let round = 0; round < 100_000; round++) {
      if (this.pending.size > 0) {
        await Promise.allSettled([...this.pending]);
        continue;
      }
      await macrotask();
      if (this.pending.size === 0) return;
    }
    throw new Error('sim: settle did not converge');
  }

  /** Simulates Chrome suspending the worker: in-memory state is lost, storage remains. */
  suspendWorker(): void {
    this.detachListeners();
    this.worker = null;
  }

  private detachListeners(): void {
    for (const ev of Object.values(this.events)) (ev as unknown as { listeners: Listener[] }).listeners = [];
  }

  private chromeEventsView(): ChromeEvents {
    const e = this.events;
    return {
      alarms: { onAlarm: e.onAlarm },
      runtime: { onStartup: e.onStartup, onInstalled: e.onInstalled, onMessage: e.onMessage },
      windows: { onFocusChanged: e.onFocusChanged },
      tabs: {
        onActivated: e.onActivated,
        onUpdated: e.onUpdated,
        onCreated: e.onCreated,
        onRemoved: e.onRemoved,
        onReplaced: e.onReplaced,
      },
      idle: { onStateChanged: e.onIdleStateChanged },
    } as unknown as ChromeEvents;
  }

  private async ensureWorker(): Promise<void> {
    if (!this.extensionEnabled) return;
    if (!this.worker || !this.worker.alive) this.startWorker();
  }

  /** User disables EarnTime in chrome://extensions. Its worker stops; history keeps recording. */
  disableExtension(): void {
    this.extensionEnabled = false;
    this.suspendWorker();
  }

  /** User re-enables EarnTime. The worker starts again; alarms resume on the next period. */
  async enableExtension(): Promise<void> {
    this.extensionEnabled = true;
    this.alarmNextAt = this.now + TICK_PERIOD_MIN * 60_000;
    this.startWorker();
    await this.settle();
    await this.settle();
  }

  /** Chrome hides incognito tabs from extensions that are not allowed in incognito. */
  private visible(tab: SimTab): boolean {
    return !tab.incognito || this.incognitoAllowed;
  }

  // ---------------------------------------------------------------- time

  private schedule(at: number, fn: () => Promise<void> | void): void {
    this.scheduled.push({ at, seq: this.seq++, fn });
  }

  /** Advances virtual time by `ms`, firing alarms and scheduled actions in order. */
  async runFor(ms: number): Promise<void> {
    const end = this.now + ms;
    for (;;) {
      const nextAlarm = this.extensionEnabled ? this.alarmNextAt ?? Infinity : Infinity;
      this.scheduled.sort((a, b) => a.at - b.at || a.seq - b.seq);
      const nextScheduled = this.scheduled[0]?.at ?? Infinity;
      const next = Math.min(nextAlarm, nextScheduled);
      if (next > end || next === Infinity) break;
      this.moveClock(next);
      if (nextScheduled <= nextAlarm) {
        const item = this.scheduled.shift();
        if (item) await item.fn();
        await this.settle();
      } else {
        this.alarmNextAt = (this.alarmNextAt ?? next) + 30_000;
        await this.ensureWorker();
        this.events.onAlarm.emit({ name: TICK_ALARM });
        await this.settle();
      }
    }
    this.moveClock(end);
  }

  private moveClock(to: number): void {
    const delta = to - this.now;
    if (delta > 0) this.mono += delta;
    this.now = to;
  }


  /**
   * Changes the system (wall) clock without the monotonic clock moving. Scheduled alarms move with
   * the wall clock, as they do in Chrome.
   */
  shiftWallClock(deltaMs: number): void {
    this.now += deltaMs;
    if (this.alarmNextAt !== null) this.alarmNextAt += deltaMs;
    for (const item of this.scheduled) item.at += deltaMs;
  }

  // ---------------------------------------------------------------- user actions

  private async fire(event: SimEvent, ...args: unknown[]): Promise<void> {
    await this.ensureWorker();
    if (!this.extensionEnabled) return;
    event.emit(...args);
  }

  /** Events for tabs the extension cannot see (incognito, not allowed) are not delivered. */
  private async fireTab(event: SimEvent, tab: SimTab, ...args: unknown[]): Promise<void> {
    if (!this.visible(tab)) return;
    await this.fire(event, ...args);
  }

  private tabInfo(t: SimTab): any {
    return {
      id: t.id,
      windowId: t.windowId,
      url: t.url,
      pendingUrl: undefined,
      active: t.active,
      audible: t.audible,
      incognito: t.incognito,
      title: t.url,
    };
  }

  private lastFocusedWindow(q?: { populate?: boolean }): any {
    const candidates = [...this.windows.values()];
    if (candidates.length === 0) return undefined;
    const win =
      (this.lastFocusedId !== null ? this.windows.get(this.lastFocusedId) : undefined) ?? candidates[candidates.length - 1];
    if (win.incognito && !this.incognitoAllowed) return undefined;
    const info: any = {
      id: win.id,
      focused: this.focusedWindowId === win.id && (!win.incognito || this.incognitoAllowed),
      state: win.state,
      incognito: win.incognito,
      type: 'normal',
    };
    if (q?.populate !== false) {
      info.tabs = [...this.tabs.values()]
        .filter((t) => t.windowId === win.id && this.visible(t))
        .map((t) => this.tabInfo(t));
    }
    return info;
  }

  private setFocus(windowId: number | null): void {
    this.focusedWindowId = windowId;
    if (windowId !== null) this.lastFocusedId = windowId;
  }

  private queryIdle(seconds: number): IdleState {
    if (this.locked) return 'locked';
    if (!this.userAway) return 'active';
    if (this.now - this.lastInputAt >= seconds * 1000) return 'idle';
    return 'active';
  }

  /** Current idle state; emits onStateChanged when it differs from the last reported value. */
  private async refreshIdle(): Promise<void> {
    const next = this.queryIdle(IDLE_DETECTION_S);
    if (next !== this.idleState) {
      this.idleState = next;
      await this.fire(this.events.onIdleStateChanged, next);
    }
  }

  /** User provides input now (back at the keyboard). */
  async input(): Promise<void> {
    this.userAway = false;
    this.lastInputAt = this.now;
    await this.refreshIdle();
    await this.settle();
  }

  /** User walks away; chrome.idle reports 'idle' after the detection interval. */
  stopInput(): void {
    this.userAway = true;
    this.lastInputAt = this.now;
    this.schedule(this.now + IDLE_DETECTION_S * 1000, () => this.refreshIdle());
  }

  async lockScreen(): Promise<void> {
    this.locked = true;
    await this.refreshIdle();
    await this.settle();
  }

  async unlockScreen(): Promise<void> {
    this.locked = false;
    this.userAway = false;
    this.lastInputAt = this.now;
    await this.refreshIdle();
    await this.settle();
  }

  /** Adds a window (focused if requested). */
  async openWindow(opts: { focused?: boolean; incognito?: boolean } = {}): Promise<number> {
    const id = this.nextWindowId++;
    this.windows.set(id, { id, state: 'normal', incognito: opts.incognito === true });
    if (opts.focused !== false) {
      this.setFocus(id);
      await this.fire(this.events.onFocusChanged, id);
    }
    return id;
    await this.settle();
  }

  async focusWindow(windowId: number | null): Promise<void> {
    this.setFocus(windowId);
    await this.fire(this.events.onFocusChanged, windowId ?? -1);
    await this.settle();
  }

  async minimizeWindow(windowId: number): Promise<void> {
    const win = this.windows.get(windowId);
    if (!win) throw new Error('sim: no such window');
    win.state = 'minimized';
    if (this.focusedWindowId === windowId) {
      this.setFocus(null);
      await this.fire(this.events.onFocusChanged, -1);
    }
    await this.settle();
  }

  async restoreWindow(windowId: number): Promise<void> {
    const win = this.windows.get(windowId);
    if (!win) throw new Error('sim: no such window');
    win.state = 'normal';
    this.setFocus(windowId);
    await this.fire(this.events.onFocusChanged, windowId);
    await this.settle();
  }

  /** Opens a tab. Visits are recorded for http(s) pages. */
  async openTab(
    url: string,
    opts: { windowId?: number; active?: boolean; audible?: boolean; incognito?: boolean; id?: number } = {},
  ): Promise<number> {
    // New tabs open in the current window, as in Chrome: the focused one, else the most recently focused.
    const current = this.focusedWindowId ?? this.lastFocusedId ?? [...this.windows.keys()][0];
    const windowId = opts.windowId ?? current ?? (await this.openWindow());
    const id = opts.id ?? this.nextTabId++;
    const active = opts.active !== false;
    if (active) {
      for (const t of this.tabs.values()) if (t.windowId === windowId) t.active = false;
    }
    this.tabs.set(id, {
      id,
      windowId,
      url: 'about:blank',
      active,
      audible: opts.audible === true,
      incognito: opts.incognito === true,
    });
    // A new tab's first load is a main-frame navigation, so DNR rules apply to it too.
    this.navigateInternal(id, url);
    const created = this.tabs.get(id) as SimTab;
    await this.fireTab(this.events.onCreated, created, this.tabInfo(created));
    if (active) await this.fireTab(this.events.onActivated, created, { tabId: id, windowId });
    return id;
    await this.settle();
  }

  /** Navigates a tab. Blocked navigations are redirected by simulated DNR rules. */
  async navigate(tabId: number, url: string): Promise<void> {
    this.navigateInternal(tabId, url);
    const tab = this.tabs.get(tabId);
    if (!tab) return;
    await this.fireTab(this.events.onUpdated, tab, tabId, { url: tab.url }, this.tabInfo(tab));
    await this.fireTab(this.events.onUpdated, tab, tabId, { status: 'complete' }, this.tabInfo(tab));
    await this.settle();
  }

  private navigateInternal(tabId: number, url: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error('sim: no such tab');
    const decision = this.evaluateDnr(url);
    if (decision && decision.startsWith('redirect:')) {
      tab.url = `${EXT_ORIGIN}${decision.slice('redirect:'.length)}`;
      return;
    }
    tab.url = url;
    this.recordVisit(url);
  }

  /** History keeps http(s) pages and chrome:// pages (the latter act as boundaries in reconciliation). */
  private recordVisit(url: string): void {
    if (hostOf(url) || url.startsWith('chrome://')) this.visits.push({ url, at: this.now });
  }

  async activateTab(tabId: number): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error('sim: no such tab');
    for (const t of this.tabs.values()) if (t.windowId === tab.windowId) t.active = t.id === tabId;
    await this.fireTab(this.events.onActivated, tab, { tabId, windowId: tab.windowId });
    await this.settle();
  }

  async setAudible(tabId: number, audible: boolean): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error('sim: no such tab');
    tab.audible = audible;
    await this.fireTab(this.events.onUpdated, tab, tabId, { audible }, this.tabInfo(tab));
    await this.settle();
  }

  async closeTab(tabId: number): Promise<void> {
    const tab = this.tabs.get(tabId);
    if (!tab) throw new Error('sim: no such tab');
    this.tabs.delete(tabId);
    await this.fireTab(this.events.onRemoved, tab, tabId, { windowId: tab.windowId, isWindowClosing: false });
    await this.settle();
  }

  /** Chrome replaces a tab (prerender or discard). The new id keeps the page. */
  async replaceTab(removedId: number, addedId: number): Promise<void> {
    const tab = this.tabs.get(removedId);
    if (!tab) throw new Error('sim: no such tab');
    this.tabs.delete(removedId);
    this.tabs.set(addedId, { ...tab, id: addedId });
    await this.fire(this.events.onReplaced, addedId, removedId);
    await this.settle();
  }

  /** Browser quit and started again: tabs are gone, the worker starts with onStartup. */
  async restartBrowser(): Promise<void> {
    this.suspendWorker();
    this.tabs.clear();
    this.windows.clear();
    this.setFocus(null);
    this.lastFocusedId = null;
    this.locked = false;
    this.lastInputAt = this.now;
    this.idleState = 'active';
    this.nextTabId += 100; // Chrome does not reuse ids across sessions
    this.nextWindowId += 100;
    this.startWorker();
    await this.fire(this.events.onStartup);
    await this.settle();
  }

  /** Extension installed or updated: onInstalled fires. */
  async installExtension(reason: 'install' | 'update' = 'update'): Promise<void> {
    this.startWorker();
    await this.fire(this.events.onInstalled, { reason });
    await this.settle();
  }

  // ---------------------------------------------------------------- content scripts & UI

  /** Sends a message as if from a content script in `tabId`. Returns the worker's reply. */
  async sendFromTab(tabId: number, message: unknown, url?: string): Promise<any> {
    await this.ensureWorker();
    if (!this.extensionEnabled) throw new Error('sim: extension disabled');
    const tab = this.tabs.get(tabId);
    const sender = { tab: { id: tabId, url: url ?? tab?.url }, url: url ?? tab?.url };
    return this.sendMessage(sender, message);
  }

  /** Sends a message from an extension page (popup, settings, block page). */
  async sendFromExtensionPage(message: unknown): Promise<any> {
    await this.ensureWorker();
    if (!this.extensionEnabled) throw new Error('sim: extension disabled');
    return this.sendMessage({ url: `${EXT_ORIGIN}/popup.html` }, message);
  }

  private sendMessage(sender: unknown, message: unknown): Promise<any> {
    const listeners = (this.events.onMessage as unknown as { listeners: Listener[] }).listeners;
    if (listeners.length === 0) return Promise.reject(new Error('sim: no worker listening'));
    return new Promise((resolve, reject) => {
      let answered = false;
      const sendResponse = (response: unknown) => {
        answered = true;
        resolve(response);
      };
      for (const listener of listeners) {
        const keep = listener(message, sender, sendResponse);
        if (keep === true) break;
      }
      setTimeout(() => {
        if (!answered) reject(new Error('sim: no response'));
      }, 2000);
    }).then(async (response) => {
      await this.settle();
      return clone(response);
    });
  }

  // ---------------------------------------------------------------- DNR evaluation

  /**
   * Returns 'allow', 'redirect:<path>' or null for a main-frame navigation to `url`, following
   * Chrome's rule: highest priority wins.
   */
  evaluateDnr(url: string): string | null {
    const host = hostOf(url);
    if (!host || !this.extensionEnabled) return null;
    const rules = [...this.dnr.values()].sort((a, b) => b.priority - a.priority);
    for (const rule of rules) {
      if (!rule.condition.resourceTypes.includes('main_frame')) continue;
      let matches = false;
      if (rule.condition.requestDomains) {
        matches = rule.condition.requestDomains.some((d) => host === d || host.endsWith(`.${d}`));
      } else if (rule.condition.regexFilter) {
        matches = new RegExp(rule.condition.regexFilter).test(url);
      }
      if (!matches) continue;
      if (rule.action.type === 'allow') return 'allow';
      if (rule.action.type === 'redirect') return `redirect:/${rule.action.redirect.extensionPath.replace(/^\//, '')}`;
    }
    return null;
  }

  // ---------------------------------------------------------------- inspection helpers

  activeTabOf(windowId: number): SimTab | undefined {
    return [...this.tabs.values()].find((t) => t.windowId === windowId && t.active);
  }

  tabUrl(tabId: number): string {
    return this.tabs.get(tabId)?.url ?? '';
  }

  /** Reads the persisted state exactly as it is stored (JSON round-trip). */
  storedState(): any {
    return clone(this.storage.state);
  }
}

