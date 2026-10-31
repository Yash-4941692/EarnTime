# EarnTime 2.6.5

## The motivational pause shows again, and the block pages encourage you

- **Fixed: a guarded adult-site visit opened the ordinary block page instead of the motivational pause.** The pause lived at `block.html?reason=motivation`, so it depended on a query parameter surviving the `declarativeNetRequest` redirect. When the parameter did not arrive, the page had no reason to go on and fell back to the debt or "screen time used up" block — motivation never appeared, only blocking. The pause is now a page of its own, `motivation.html`, which is the motivational pause whatever the redirect carries. `block.html?reason=motivation` still shows it, so a tab redirected by an older build keeps working.
- **Chrome can now load the redirected pages at all.** `block.html` and `motivation.html` are declared in `web_accessible_resources`. Chrome refuses to load an extension page reached through a redirect from a navigation that started on a website (a link click, for example) unless it is declared, which is the other way a pause or a block could fail to appear. No other EarnTime page is exposed.
- **The debt and "screen time used up" pages now say something worth reading.** Each shows one short encouragement from a small rotating set beside the numbers — "Debt is only time you have not studied yet…", "Earn it, then enjoy it…", "Small sessions still count…" — picked once a minute. The adult-site pause keeps its own wording and still says nothing about the site, the reason, the balance or the debt.
- **A block page inside a frame shows nothing about the wallet.** Because those two pages have to be web-accessible, a site could load one in a frame; in that case EarnTime renders one line instead of your balance and debt.
- Existing settings, balances, day totals, ledger, tasks, reviews and site rules are preserved. The storage schema stays at 8.

## Verification

Strict TypeScript checking, **302 source tests** (164 unit, 79 DOM, 59 simulated-browser) and the production build pass. The separate Playwright/Chromium suite and real-Chrome checks were not run because no Chromium binary was available.

## Install or update

Download **EarnTime-2.6.5.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

For an existing unpacked installation, replace its files with the extracted release and click **Reload** for EarnTime at `chrome://extensions`. **Do not uninstall** if you want to keep your settings and balance.

# EarnTime 2.6.4

## Adult-site focus and Chrome settings confirmation

- Added a fixed, hostname-only focus guard for dedicated adult-site domains, using a curated 45-domain list. It matches hosts and subdomains only; it does not scan page text, paths, images, searches or embedded content. The guard is always on and is disclosed in Settings → Protection and the user documentation, but has no user-facing toggle, custom-domain editor or exception editor.
- Matching top-level visits show a motivational pause page without explaining the redirect. The guard is independent of the earned-time balance and debt rules.
- Opening `chrome://extensions` or `chrome://settings/extensions` now asks first. The confirmation provides a way back and a target-specific, one-use continue action that expires after 15 seconds.
- Schema 8 removes the former user-editable guard preferences while preserving the wallet, earned-time rules and history.
- Verification: strict TypeScript check, **294 source tests** (157 unit, 79 DOM, 58 simulated-browser) and production build pass. The separate Playwright/Chromium suite and real-Chrome checks were not run because no Chromium binary was available.

## Install or update

Download **EarnTime-2.6.4.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

For an existing unpacked installation, replace its files with the extracted release and click **Reload** for EarnTime at `chrome://extensions`. **Do not uninstall** if you want to keep your settings and balance.

# EarnTime 2.6.3

## Correctable interruption estimates, and Shorts that are read harder

- **Half-productive time in an interruption is no longer charged as unproductive.** EarnTime still cannot tell which mode you were in while it was not running, so it now splits the estimated time down the middle: half earns study credit at your ratio, half is charged as unproductive (creating debt only past the balance — the same worst case as before, half as big).
- **EarnTime asks, and the answer re-prices the stretch.** A *Was that study time?* card appears in the popup and on the debt block page (with a notification), showing the estimated minutes, the host and the last mode you chose. Type how many minutes were study, or press *Keep half & half* to accept the default. Answering is **free** — it only corrects an estimate — and corrections are symmetric: more study credits the difference and repays debt first; less study charges it again. The correction lands on the days the estimated time came from and is written to the ledger and the audit export.
- **Questions are bounded.** Only stretches of at least a minute are questioned, repeated visits to one host become one question, the newest 20 unanswered questions are kept, and an answer changes nothing else about the interruption's window or its per-visit caps.
- **Shorts are read harder before EarnTime gives up.** The active Short's channel is read from the active reel and the Shorts chrome, the page's own data for the video id in the address bar, the link's `title`/`aria-label`, and the channel handle as a last resort. On a channel page, the `@handle` in the address bar is used when the header cannot be read.
- **A Short with an unreadable channel is offered on trust instead of refused.** The *Shorts channel not verified* card explains that the name could not be read, and *Continue (trust)* allows the Short and counts its time as productive. Trust is remembered for that Short only: the next reel asks again. A non-study Short whose channel **can** be read is still covered and paused as before.
- Existing settings, balances, day totals, ledger, tasks, reviews and site rules are preserved; the storage schema moves to 6.

## Verification

Strict TypeScript checking, **291 source tests** (155 unit, 79 DOM, 57 simulated-browser), and the production build pass. The Playwright/Chromium fixture suite was not re-run for this change (last verified 15/15) and no Chromium binary was available; live YouTube and a real installed extension still require manual verification. See `docs/TESTING.md` for the report and the manual checklist.

## Install or update

Download **EarnTime-2.6.3.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

For an existing unpacked installation, replace its files with the extracted release, click **Reload** for EarnTime at `chrome://extensions`, then refresh existing YouTube tabs so they load the updated content script. **Do not uninstall** if you want to keep your settings and balance.

