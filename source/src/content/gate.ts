/**
 * The load-time gate: the reason a half-productive page can no longer be used before EarnTime has
 * decided what it is.
 *
 * Before this, enforcement lived in an overlay that was appended once `document.documentElement`
 * existed and a verdict had arrived. An overlay is only a visual cover: until it was on screen the
 * real page was already there, already painted and already clickable, and the page itself could
 * remove the overlay node at any moment (hydration, `innerHTML` on `<html>`, a "clear unknown
 * elements" script). On the FIRST visit to a half-productive site that window was wide open — the
 * worker was often still cold — so the mode chooser could be bypassed entirely and the site used
 * uncounted.
 *
 * The gate closes that window from the other side:
 *
 *  1. A `<style>` element is injected at `document_start`, before the site's own markup is parsed.
 *     While the gate is closed it hides every child of `<html>` and swallows pointer and keyboard
 *     input. Injected CSS applies as soon as the elements exist, so the site is never painted in a
 *     usable state — there is nothing to click during the load, which is exactly when the URL has
 *     to be judged.
 *  2. EarnTime's own UI (the cover, the chooser) is rendered on top of the hidden page, from a
 *     shadow root that the site's CSS cannot reach and cannot restyle.
 *  3. The overlay host is re-appended whenever the page removes it, so a site that wipes the DOM
 *     cannot uncover itself.
 *  4. The gate is only opened by a positive decision, or by the extension going away: an unmanaged
 *     page must never stay hidden with nobody left to explain why.
 *
 * `document_start` also means the gate is installed before the worker is asked anything, so a cold
 * service worker no longer decides whether the page is protected — it only decides how long the
 * "Checking this site" cover stays up.
 */

/** Style element id, so a page cannot confuse it with its own markup (and we can find it again). */
export const GATE_STYLE_ID = 'earntime-gate';
/** Overlay host id. */
export const OVERLAY_HOST_ID = 'earntime-root';

/**
 * Gate CSS. It is written to the document as soon as the content script runs, but every rule is
 * scoped behind `html[data-et-gate="closed"]`, so the page is only affected while EarnTime has not
 * decided what it is. `#earntime-root` is exempted explicitly: `visibility` and `pointer-events`
 * both inherit, and EarnTime's own card has to stay visible and clickable over a hidden page.
 */
export const GATE_CSS = `
html[data-et-gate="closed"] > *:not(#${OVERLAY_HOST_ID}) {
  visibility: hidden !important;
  pointer-events: none !important;
  user-select: none !important;
}
html[data-et-gate="closed"] #${OVERLAY_HOST_ID},
html[data-et-gate="closed"] #${OVERLAY_HOST_ID} * {
  visibility: visible !important;
}
#${OVERLAY_HOST_ID} {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147483647 !important;
  pointer-events: auto !important;
  background: transparent;
}
html[data-et-gate="open"] #${OVERLAY_HOST_ID} {
  position: static !important;
  inset: auto !important;
  pointer-events: none !important;
}
`;

/** Minimal timer surface, so tests can drive the watchdog without real time passing. */
export interface GateTimers {
  setInterval(handler: () => void, ms: number): number;
  clearInterval(handle: number): void;
}

export interface GateOptions {
  /** How often the overlay host is checked and re-appended (default 250 ms). */
  keepAliveMs?: number;
  /** How often the "is the extension still there" check runs (default 1000 ms). */
  watchdogMs?: number;
  timers?: GateTimers;
}

export interface Gate {
  /** True while the page is hidden and input is swallowed. */
  readonly closed: boolean;
  /** Injects the gate style. Safe to call more than once. */
  install(): void;
  /** Hides the page and blocks input. */
  close(): void;
  /** Reveals the page. Irreversible: once EarnTime has decided, it does not un-decide. */
  open(): void;
  /**
   * Appends an overlay host to the document and keeps it there. `build` runs only when the host is
   * missing, so a page that removes EarnTime's UI gets it back on the next keep-alive tick.
   */
  mountOverlay(build: () => HTMLElement): HTMLElement;
  /** Stops the keep-alive and watchdog intervals. */
  dispose(): void;
}

function browserTimers(): GateTimers {
  return {
    setInterval: (handler, ms) => window.setInterval(handler, ms) as unknown as number,
    clearInterval: (handle) => window.clearInterval(handle),
  };
}

/** True when the extension context this content script was injected from still exists. */
export function extensionContextAlive(): boolean {
  try {
    return Boolean(chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

/**
 * Creates the gate for the current document. `documentElement` may not exist yet (`document_start`
 * on an empty document), which is why the style is (re)inserted on every state change and on the
 * keep-alive tick rather than once.
 */
export function createGate(
  doc: Document,
  isAlive: () => boolean = extensionContextAlive,
  onAbandoned?: () => void,
  opts: GateOptions = {},
): Gate {
  const timers = opts.timers ?? browserTimers();
  const keepAliveMs = opts.keepAliveMs ?? 250;
  const watchdogMs = opts.watchdogMs ?? 1000;

  let closed = true;
  let disposed = false;
  let overlayHost: HTMLElement | null = null;
  let buildOverlay: (() => HTMLElement) | null = null;
  let keepAlive: number | null = null;
  let watchdog: number | null = null;

  const applyAttribute = () => {
    const root = doc.documentElement;
    if (!root) return;
    root.setAttribute('data-et-gate', closed ? 'closed' : 'open');
  };

  const ensureStyle = () => {
    const existing = doc.getElementById(GATE_STYLE_ID);
    if (existing && existing.textContent === GATE_CSS) {
      applyAttribute();
      return;
    }
    existing?.remove();
    const style = doc.createElement('style');
    style.id = GATE_STYLE_ID;
    // The site must not be able to switch the gate back on or off by editing this attribute.
    style.setAttribute('data-et-internal', '1');
    style.textContent = GATE_CSS;
    const parent = doc.head ?? doc.documentElement;
    if (parent) {
      if (parent === doc.documentElement) parent.insertBefore(style, parent.firstChild);
      else parent.insertBefore(style, parent.firstChild);
      applyAttribute();
    }
  };

  const ensureOverlay = () => {
    if (!buildOverlay) return;
    const root = doc.documentElement;
    if (!root) return;
    if (overlayHost && overlayHost.ownerDocument === doc && overlayHost.isConnected) return;
    // A host that was detached lost nothing: it is the same node, with the same listeners, so the
    // chooser card the user was looking at comes back instead of being rebuilt.
    if (overlayHost && overlayHost.ownerDocument === doc) {
      root.append(overlayHost);
      return;
    }
    overlayHost = buildOverlay();
    root.append(overlayHost);
  };

  const tick = () => {
    if (disposed) return;
    ensureStyle();
    ensureOverlay();
  };

  const stopTimers = () => {
    if (keepAlive !== null) {
      timers.clearInterval(keepAlive);
      keepAlive = null;
    }
    if (watchdog !== null) {
      timers.clearInterval(watchdog);
      watchdog = null;
    }
  };

  const gate: Gate = {
    get closed() {
      return closed;
    },
    install() {
      ensureStyle();
      if (keepAlive === null) keepAlive = timers.setInterval(tick, keepAliveMs);
      if (watchdog === null) {
        watchdog = timers.setInterval(() => {
          if (disposed) return;
          if (isAlive()) return;
          // The extension was disabled, reloaded or removed mid-load. Drop everything: a page that
          // nobody manages must not stay hidden.
          disposed = true;
          stopTimers();
          doc.getElementById(GATE_STYLE_ID)?.remove();
          overlayHost?.remove();
          overlayHost = null;
          doc.documentElement?.removeAttribute('data-et-gate');
          onAbandoned?.();
        }, watchdogMs);
      }
    },
    close() {
      // Also re-arms an already-opened gate: an in-page navigation to a host that has to be judged
      // again hides the page until the new verdict arrives.
      if (disposed) return;
      closed = true;
      ensureStyle();
    },
    open() {
      if (disposed) return;
      closed = false;
      applyAttribute();
    },
    mountOverlay(build) {
      buildOverlay = build;
      ensureOverlay();
      return overlayHost as HTMLElement;
    },
    dispose() {
      disposed = true;
      stopTimers();
    },
  };

  return gate;
}
