/**
 * Sending one message to the service worker — with a hard timeout.
 *
 * Chrome can drop a message sent while the worker is starting without ever invoking the callback.
 * An unbounded wait would leave the page covered forever, so every send resolves to `undefined`
 * after `SEND_TIMEOUT_MS`, which `askWorker` reads as "no answer yet" and retries.
 */

import type { Reply } from './page';

/** A single message must come back within this long, or it counts as no answer and is retried. */
export const SEND_TIMEOUT_MS = 8_000;

export function chromeSend(message: unknown): Promise<Reply | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: Reply | undefined) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(undefined), SEND_TIMEOUT_MS);
    try {
      chrome.runtime.sendMessage(message, (reply: Reply | undefined) => {
        if (chrome.runtime.lastError) finish(undefined);
        else finish(reply);
      });
    } catch {
      // The extension was reloaded or disabled: this page is no longer managed.
      finish(undefined);
    }
  });
}
