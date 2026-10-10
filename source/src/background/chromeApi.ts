/** Binds the ExtApi interface to the real chrome.* namespaces (MV3, promise-based). */

import type { IdleState } from '../core/types';
import type { ExtApi, PermissionName, WindowInfo } from './api';

/** `@types/chrome` types permission names as a union of the manifest's own strings. */
const asPermission = (permission: PermissionName): chrome.runtime.ManifestPermission =>
  permission as chrome.runtime.ManifestPermission;

export function createChromeApi(c: typeof chrome): ExtApi {
  return {
    storage: {
      get: async (key) => (await c.storage.local.get(key))[key],
      getAll: () => c.storage.local.get(null),
      set: (values) => c.storage.local.set(values),
      remove: (keys) => c.storage.local.remove(keys),
      session: {
        // storage.session exists in every Chrome that runs MV3 service workers; the guard keeps an
        // unexpected shape from taking the whole worker down with it.
        get: async (key) => (c.storage.session ? (await c.storage.session.get(key))[key] : undefined),
        set: async (values) => {
          if (c.storage.session) await c.storage.session.set(values);
        },
      },
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
        // Installed web apps and "Open as window" shortcuts can be popup/app windows, not
        // normal browser windows. Keep devtools and other window types excluded.
        (await c.windows.getLastFocused({ populate: true, windowTypes: ['normal', 'popup', 'app'] })) as WindowInfo | undefined,
    },
    tabs: {
      query: () => c.tabs.query({}),
      update: async (tabId, url) => {
        await c.tabs.update(tabId, { url });
      },
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
    permissions: {
      // Callback form throughout: it exists in every Chrome that supports optional permissions at
      // all, and it keeps the types honest about what the browser actually answers.
      contains: (permission) =>
        new Promise<boolean>((resolve) => {
          if (!c.permissions) return resolve(false);
          c.permissions.contains({ permissions: [asPermission(permission)] }, (granted) => resolve(granted === true));
        }),
      request: (permission) =>
        new Promise<boolean>((resolve) => {
          if (!c.permissions) return resolve(false);
          c.permissions.request({ permissions: [asPermission(permission)] }, (granted) => resolve(granted === true));
        }),
      remove: (permission) =>
        new Promise<boolean>((resolve) => {
          if (!c.permissions) return resolve(false);
          c.permissions.remove({ permissions: [asPermission(permission)] }, (removed) => resolve(removed === true));
        }),
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

