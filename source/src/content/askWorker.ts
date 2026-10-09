/**
 * Asking the service worker what a page should show.
 *
 * Chrome unloads the service worker after a period of inactivity and starts it again on demand, and
 * that start is not instant. A page that begins loading while the worker is asleep can therefore
 * send `page.init` and get "Could not establish connection. Receiving end does not exist." back
 * instead of an answer.
 *
 * The page used to read that as "no directive" and do nothing at all: no mode chooser, no filter,
 * and — because a session is only recorded once a mode has been chosen — no screen time charged
 * either. Reloading appeared to fix it, but only because the worker was warm by then.
 *
 * So the question is retried with a growing pause, which covers the window in which Chrome is
 * starting the worker. An answer that *is* an answer — including a refusal — is returned straight
 * away; only a missing one is retried.
 *
 * This narrows that fail-open gap but does not close it. If every attempt fails, this one page load
 * stays unmanaged and uncounted. That is documented in `docs/KNOWN_LIMITATIONS.md` rather than
 * hidden here.
 */

/** Pause before each retry. Growing, so a worker that is only just starting is given time to come up. */
export const RETRY_PAUSES_MS = [250, 500, 1000, 2000, 3000];

/** Default total time to keep retrying before leaving the page unmanaged. */
export const DEFAULT_BUDGET_MS = 10_000;

export interface AskOptions {
  /** Total time to keep retrying before giving up. */
  budgetMs?: number;
  /** Waits between attempts. Injectable so the retry can be tested without real time passing. */
  sleep?: (ms: number) => Promise<void>;
  /** Reads the clock. Injectable for the same reason. */
  now?: () => number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Sends `message` until it gets an answer back. Returns the answer, or undefined when the worker
 * never replied within the budget.
 */
export async function askWorker<T>(
  message: unknown,
  send: (message: unknown) => Promise<T | undefined>,
  options: AskOptions = {},
): Promise<T | undefined> {
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => Date.now());
  const startedAt = now();

  let reply = await send(message);
  if (reply !== undefined) return reply;

  for (const pause of RETRY_PAUSES_MS) {
    if (now() - startedAt + pause > budgetMs) return undefined;
    await sleep(pause);
    reply = await send(message);
    if (reply !== undefined) return reply;
  }
  return undefined;
}
