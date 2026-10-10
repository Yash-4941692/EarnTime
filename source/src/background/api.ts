/**
 * The subset of chrome.* the service worker uses, expressed with plain types and promises.
 * `chromeApi.ts` implements it on top of the real APIs; the simulation tests implement it on top
 * of a simulated browser. Keeping the controller behind this interface makes the flows testable.
 */

import type { DnrRule } from '../core/dnr';
import type { IdleState } from '../core/types';

export interface TabInfo {
  id?: number;
  windowId?: number;
  url?: string;
  pendingUrl?: string;
  active: boolean;
  audible?: boolean;
  incognito?: boolean;
}

export interface WindowInfo {
  id?: number;
  focused: boolean;
  state?: string;
  incognito?: boolean;
  tabs?: TabInfo[];
}

export interface HistoryItem {
  url?: string;
  lastVisitTime?: number;
}

export interface VisitItem {
  visitTime?: number;
}

/**
 * Optional permission names EarnTime can ask the user for. There is exactly one today: the browsing
 * history behind screen-time analytics.
 */
export type PermissionName = 'history';

export interface ExtApi {
  storage: {
    /** Returns the value stored under `key`, or undefined. */
    get(key: string): Promise<unknown>;
    /** Returns every stored key (used once, for legacy migration). */
    getAll(): Promise<Record<string, unknown>>;
    set(values: Record<string, unknown>): Promise<void>;
    remove(keys: string[]): Promise<void>;
    /**
     * In-memory, browser-session storage. Content scripts can read it without waking the service
     * worker, which is what lets a page be judged while it loads. Never persisted to disk.
     */
    session: {
      get(key: string): Promise<unknown>;
      set(values: Record<string, unknown>): Promise<void>;
    };
  };
  alarms: {
    get(name: string): Promise<unknown | undefined>;
    create(name: string, periodInMinutes: number): Promise<void>;
  };
  idle: {
    queryState(detectionIntervalSec: number): Promise<IdleState>;
    setDetectionInterval(seconds: number): void;
  };
  windows: {
    /** Last focused browser, web-app or shortcut window with its tabs populated, or undefined. */
    getLastFocused(): Promise<WindowInfo | undefined>;
  };
  tabs: {
    query(): Promise<TabInfo[]>;
    update(tabId: number, url: string): Promise<void>;
  };
  history: {
    search(startTime: number, endTime: number, maxResults: number): Promise<HistoryItem[]>;
    getVisits(url: string): Promise<VisitItem[]>;
  };
  dnr: {
    getDynamicRuleIds(): Promise<number[]>;
    replaceDynamicRules(removeIds: number[], addRules: DnrRule[]): Promise<void>;
  };
  /** Optional permissions (screen-time access). */
  permissions: {
    contains(permission: PermissionName): Promise<boolean>;
    request(permission: PermissionName): Promise<boolean>;
    remove(permission: PermissionName): Promise<boolean>;
  };
  notify(title: string, message: string): Promise<void>;
  /** Opens an extension page (for example the setup wizard) in a new tab. */
  openPage(path: string): Promise<void>;
  badge(text: string, color: string): Promise<void>;
  incognitoAllowed(): Promise<boolean>;
  pageUrl(path: string): string;
}
