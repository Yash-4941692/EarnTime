/** Connects chrome events to the controller. Kept separate so the simulation tests use the same wiring. */

import { TICK_ALARM } from '../core/constants';
import type { IdleState } from '../core/types';
import type { Controller, TabChange } from './controller';
import type { TabInfo } from './api';

export interface EventLike<A extends unknown[]> {
  addListener(callback: (...args: A) => unknown): void;
}

export interface ChromeEvents {
  alarms: { onAlarm: EventLike<[{ name: string }]> };
  runtime: {
    onStartup: EventLike<[]>;
    onInstalled: EventLike<[unknown]>;
    onMessage: EventLike<[unknown, { tab?: { id?: number; url?: string }; url?: string }, (response: unknown) => void]>;
  };
  windows: { onFocusChanged: EventLike<[number]> };
  tabs: {
    onActivated: EventLike<[unknown]>;
    onUpdated: EventLike<[number, TabChange, TabInfo]>;
    onCreated: EventLike<[TabInfo]>;
    onRemoved: EventLike<[number, unknown]>;
    onReplaced: EventLike<[number, number]>;
  };
  idle: { onStateChanged: EventLike<[IdleState]> };
}

export function attachEvents(events: ChromeEvents, controller: Controller): void {
  const quiet = (promise: Promise<unknown>) => {
    promise.catch((err: unknown) => console.warn('[EarnTime] event handler failed', err));
  };

  events.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM) quiet(controller.tick());
  });
  events.runtime.onStartup.addListener(() => quiet(controller.onStartup()));
  events.runtime.onInstalled.addListener((details) => {
    const reason = typeof details === 'object' && details !== null ? (details as { reason?: string }).reason : undefined;
    quiet(controller.onInstalled(reason));
  });
  events.windows.onFocusChanged.addListener(() => quiet(controller.onFocusChanged()));
  events.tabs.onActivated.addListener(() => quiet(controller.onActivated()));
  events.tabs.onUpdated.addListener((tabId, change, tab) => quiet(controller.onTabUpdated(tabId, change, tab)));
  events.tabs.onCreated.addListener((tab) => quiet(controller.onTabCreated(tab)));
  events.tabs.onRemoved.addListener((tabId) => quiet(controller.onTabRemoved(tabId)));
  events.tabs.onReplaced.addListener((addedId, removedId) => quiet(controller.onTabReplaced(addedId, removedId)));
  events.idle.onStateChanged.addListener(() => quiet(controller.onIdleChanged()));
  events.runtime.onMessage.addListener((message, sender, sendResponse) => {
    controller
      .onMessage(message, { tabId: sender.tab?.id, url: sender.tab?.url ?? sender.url })
      .then(sendResponse, (err: unknown) => {
        console.error('[EarnTime] message failed', err);
        sendResponse({ ok: false, error: { code: 'unknown', message: 'EarnTime could not complete that action.' } });
      });
    return true;
  });
}
