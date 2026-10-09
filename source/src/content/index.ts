/**
 * Content-script entry point. Manifest V3 injects this file at `document_start` in the top frame of
 * every http(s) page; all of the behaviour lives in `page.ts` so it can be tested against a DOM.
 *
 * `window.top !== window` keeps EarnTime out of iframes: only the top-level page is judged, as
 * documented in `docs/KNOWN_LIMITATIONS.md`.
 */

import { attachPage } from './page';
import { chromeSend } from './send';

declare const chrome: {
  runtime: { id?: string; sendMessage: (...args: unknown[]) => unknown; lastError?: unknown };
  storage: {
    local: { get(keys: string[]): Promise<Record<string, unknown>> };
    session?: { get(keys: string[]): Promise<Record<string, unknown>> };
    onChanged: {
      addListener(listener: (changes: Record<string, unknown>, area: string) => void): void;
      removeListener(listener: (changes: Record<string, unknown>, area: string) => void): void;
    };
  };
};

function start(): void {
  if (typeof window === 'undefined' || window.top !== window) return;

  const storageChangedListeners = new Set<(changedKeys: string[], area: string) => void>();
  const bridge = (changes: Record<string, unknown>, area: string) => {
    for (const listener of storageChangedListeners) listener(Object.keys(changes ?? {}), area);
  };
  chrome.storage.onChanged.addListener(bridge);

  attachPage(document, {
    send: chromeSend,
    localGet: (keys) => chrome.storage.local.get(keys),
    sessionGet: (keys) => (chrome.storage.session ? chrome.storage.session.get(keys) : Promise.resolve({})),
    onStorageChanged(listener) {
      storageChangedListeners.add(listener);
      return () => {
        storageChangedListeners.delete(listener);
      };
    },
    setInterval: (handler, ms) => window.setInterval(handler, ms) as unknown as number,
    clearInterval: (handle) => window.clearInterval(handle),
    setTimeout: (handler, ms) => window.setTimeout(handler, ms) as unknown as number,
    clearTimeout: (handle) => window.clearTimeout(handle),
    now: () => Date.now(),
  });
}

start();
