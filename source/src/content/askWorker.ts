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
 * So the question is retried with a growing pause (then the last pause repeats until the budget
 * runs out), which covers the window in which Chrome is starting the worker. An answer that *is*
 * an answer — including a refusal — is returned straight away; only a missing one is retried.
 *
 * Together with the fail-closed "Checking this site" cover the content script shows while waiting,
 * a late worker no longer leaves the page open: it stays covered until a reply arrives. The
 * remaining gap (extension disabled mid-load) is documented in `docs/KNOWN_LIMITATIONS.md` rather
 * than hidden here.
 */

/** Pause before each retry. Growing, so a worker that is only just starting is given time to come up. */
export const RETRY_PAUSES_MS = [100, 200, 400, 800, 1500, 3000];

/** Default total time to keep retrying before leaving the page unmanaged. */
export const DEFAULT_BUDGET_MS = 90_000;

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
 *
 * The pause grows for the first attempts (a worker that is only just starting needs time) and
 * then repeats the last pause until the budget runs out, so a slow first start still gets an
 * answer within the same page load — no reload required.
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

  for (let attempt = 0; ; attempt += 1) {
    const pause = RETRY_PAUSES_MS[Math.min(attempt, RETRY_PAUSES_MS.length - 1)];
    if (now() - startedAt + pause > budgetMs) return undefined;
    await sleep(pause);
    reply = await send(message);
    if (reply !== undefined) return reply;
  }
}
