# EarnTime 2.4.0

Three things: **the URL is now checked while the page loads**, **the timer moves in front of you**, and **screen time is measured per site, per day**.

## The first visit can no longer bypass the mode chooser

Until now EarnTime evaluated a page's address **after** it had loaded and after the background worker had answered. Chrome suspends that worker when it is idle and restarting it is not instant, so a first visit to a half-productive site — `youtube.com`, `web.whatsapp.com`, anything you added yourself — could be briefly usable, or the chooser arrived late enough that you had to reload for it to stick.

That is fixed at the root: the content script now classifies the URL **itself**, at `document_start`, before the page has a body.

- The page is **closed from the first byte** (`data-et-gate="closed"`), so nothing on it is visible, clickable or scrollable before a verdict exists.
- A **half-productive** site gets the Productive / Unproductive chooser over the first paint, with **zero** round-trips to the worker — the local rules the worker mirrors into `chrome.storage.session` are enough.
- A **productive** or **unproductive** site gets its status card immediately; an unproductive site with an empty balance is still blocked outright.
- A site that cannot be classified yet shows **"Checking this site…"** with no grace period, and the page never opens itself.
- **Answering applies straight away — no reload.** Choosing a mode, and every later navigation, republishes the verdict for that tab.
- **Every navigation is re-checked**, including in-page ones: single-page apps, `pushState`, clicking through WhatsApp chats or YouTube. The address is watched continuously and re-asked within about three quarters of a second, with the 30-second checkpoint as a backstop. Leaving a half-productive site and coming back asks again, as before.
- The worker's answer always **replaces** the local one, so balance-dependent restrictions and the YouTube keyword filter still apply. If the worker refuses, the page stays closed and shows why.
- **Fail-closed, everywhere.** If the worker never answers *and* the rules cannot be read, the page stays covered. The only path that releases a held page is the watchdog noticing that the extension context itself is gone (disabled, reloaded or removed mid-load), because at that point nothing is left to enforce a verdict. A bug the new tests found on the way: that fallback used to *open* exactly the page the gate exists to hold.

## The timer ticks while you watch it

Opening the popup takes OS focus away from the browser window, and Chrome fires **no event** for that. The worker therefore saw "no focused window", stopped counting, and the popup showed numbers that only changed after you closed and reopened it.

- The popup (and the analytics page) now send a **heartbeat once a second**. The worker treats that beat as "the user is here" for up to 2.5 seconds, so the active tab keeps counting **behind** the popup and the display keeps moving **in front** of you.
- Remaining, earned/used and the live role advance every second; the per-day screen-time figures move too.
- Closing the popup stops the heartbeat and the normal rule returns: no focused window, no counting. The stretch that was open while EarnTime could not see it is charged once, at the first checkpoint after the heartbeat expires — no time lost, none double-charged.

## Screen time per site, per day (optional `history` permission)

- **Setup asks for screen-time access** in a new step. `history` moved from `permissions` to **`optional_permissions`**, so Chrome installs EarnTime without it and only your explicit click grants it. Declining is fully supported and setup continues either way; you can grant or remove it later in *Settings → Analytics*.
- **Every foreground minute is attributed to a site.** `DayStats` now carries `hosts` (minutes per site), `screenMs` and `estimatedScreenMs`. Only time actually **in front of you** counts — background tabs, idle time and locked screens are excluded. Covered YouTube pages, EarnTime's own pages and pending mode choices count as screen time with **zero billing**. A site on no list is measured and shown, and costs nothing.
- **Earned, used, debt and every daily total are derived from that day's screen time**, so the account and the breakdown can no longer disagree.
- **Interruptions reconstruct per site too**, from history, and are marked **estimated** and shown separately from exact time. Without access, gaps fall back to the conservative capped continuation and the analytics say the data is partly estimated.
- **New analytics UI**: *Settings → Analytics* shows today's screen time, study time, charged and earned; the full per-site breakdown with small sites rolled into "other"; a **14-day trend**; today against yesterday and against your average; and the study share. The popup shows today's total and the top three sites as bars, with a link through.
- **Access is never trusted from storage.** The worker verifies it with `chrome.permissions.contains` at startup, at install, on window focus and after a worker restart, and writes "Screen-time access granted/removed" to the ledger on every change — including a revocation done in `chrome://extensions`, which Chrome does not announce.
- Upgraded installs keep the access they already had (they were granted `history` at install time); a fresh install starts without it. Storage schema is now **5**.
- Privacy is unchanged in kind and bounded in size: **hostnames and minutes only**, at most 60 sites per day (smallest rolled into the totals), no page addresses, no titles, no network requests. The audit export now ships the daily per-site records.

## Verification

`npm test` passes **213 tests** — 134 unit, 37 jsdom DOM, 42 simulated-browser flow tests — plus the strict TypeScript check. New coverage includes the load-time gate and page lifecycle in jsdom (fail-closed on unreadable rules, zero round-trips for the local chooser, SPA re-ask, abandoned-tab disposal), the analytics view model, the worker-free verdict and gate cache, and simulated flows for gate-cache publication, per-site screen time, estimated reconstruction, granting/revoking access and the live popup timer. The Playwright suite (12 tests) still needs a Chromium binary, and the real-Chrome checklist in `docs/TESTING.md` remains necessary.
