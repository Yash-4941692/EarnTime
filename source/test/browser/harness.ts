/**
 * In-page harness for browser tests. Installs the simulated browser (test/sim) as `window.chrome`
 * and starts the real service-worker controller inside the page. Storage is mirrored to
 * localStorage so that separate page loads on the same origin share state, as the real extension
 * storage would.
 */

import { FakeBrowser } from '../sim/fakeBrowser';

declare global {
  interface Window {
    __ET_ROLE?: 'ui' | 'content';
    __ET_TAB?: number;
    __et: { sim: FakeBrowser; role: string; tabId: number };
  }
}

const STORE_KEY = 'et-sim:storage';
const role = window.__ET_ROLE ?? 'ui';
const tabId = window.__ET_TAB ?? 7;

const sim = new FakeBrowser(Date.now());
const saved = localStorage.getItem(STORE_KEY);
if (saved) sim.storage = JSON.parse(saved) as Record<string, unknown>;
sim.onStorageWritten = () => localStorage.setItem(STORE_KEY, JSON.stringify(sim.storage));
sim.senderFor = () =>
  role === 'content'
    ? { tab: { id: tabId, url: location.href }, url: location.href }
    : { url: location.href };
sim.startWorker();

// A content script lives in a real tab. Give the simulated browser a focused window with that tab,
// so the controller sees the page as the active tab (with the same id the content script reports).
if (role === 'content') {
  void (async () => {
    await sim.openWindow({ focused: true });
    await sim.openTab(location.href, { id: tabId, active: true });
  })();
}

(window as unknown as { chrome: unknown }).chrome = sim.chrome;
window.__et = { sim, role, tabId };
