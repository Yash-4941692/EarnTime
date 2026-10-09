/** Binds the ExtApi interface to the real chrome.* namespaces (MV3, promise-based). */

import type { IdleState } from '../core/types';
import type { ExtApi, WindowInfo } from './api';

export function createChromeApi(c: typeof chrome): ExtApi {
  return {
    storage: {
      get: async (key) => (await c.storage.local.get(key))[key],
      getAll: () => c.storage.local.get(null),
      set: (values) => c.storage.local.set(values),
      remove: (keys) => c.storage.local.remove(keys),
    },
    alarms: {
      get: (name) => c.alarms.get(name),
      create: async (name, periodInMinutes) => {
        c.alarms.create(name, { periodInMinutes });
      },
    },
    idle: {
      queryState: async (seconds) => (await c.idle.queryState(seconds)) as IdleState,
      setDetectionInterval: (seconds) => c.idle.setDetectionInterval(seconds),
    },
    windows: {
      getLastFocused: async () =>
        (await c.windows.getLastFocused({ populate: true, windowTypes: ['normal'] })) as WindowInfo | undefined,
    },
    tabs: {
      query: () => c.tabs.query({}),
      update: async (tabId, url) => {
        await c.tabs.update(tabId, { url });
      },
      sendToTab: (tabId, message) => c.tabs.sendMessage(tabId, message),
    },
    history: {
      search: (startTime, endTime, maxResults) =>
        c.history.search({ text: '', startTime, endTime, maxResults }),
      getVisits: (url) => c.history.getVisits({ url }),
    },
    dnr: {
      getDynamicRuleIds: async () => (await c.declarativeNetRequest.getDynamicRules()).map((rule) => rule.id),
      replaceDynamicRules: async (removeIds, addRules) => {
        await c.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: removeIds,
          addRules: addRules as unknown as chrome.declarativeNetRequest.Rule[],
        });
      },
    },
    notify: async (title, message) => {
      await c.notifications.create({
        type: 'basic',
        iconUrl: c.runtime.getURL('icons/icon128.png'),
        title,
        message,
      });
    },
    openPage: async (path) => {
      await c.tabs.create({ url: c.runtime.getURL(path) });
    },
    badge: async (text, color) => {
      await c.action.setBadgeText({ text });
      if (text) await c.action.setBadgeBackgroundColor({ color });
    },
    incognitoAllowed: () => c.extension.isAllowedIncognitoAccess(),
    pageUrl: (path) => c.runtime.getURL(path),
  };
}

