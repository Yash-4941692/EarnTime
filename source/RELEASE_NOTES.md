# EarnTime 2.6.9

## The pause page works in incognito windows

In an incognito window, EarnTime's redirects landed on Chrome's own page instead of EarnTime's:
`<extension id> is blocked` / `ERR_BLOCKED_BY_CLIENT`. The pause appeared in a normal window and
not in an incognito one, which made the guard look broken exactly where it was least wanted off.

- **Cause.** Chrome will not load a page from an extension's own package into the main frame of an
  incognito tab while the extension runs in the default **spanning** incognito mode — even with
  *Allow in Incognito* switched on. Every page EarnTime interrupts with (`motivation.html`,
  `block.html`) is such a page, so both the pause and the block page were refused there.
- **Fixed.** The manifest now asks for `"incognito": "split"`, which runs a second copy of EarnTime
  inside incognito windows; that copy is allowed to show the extension's own pages. The wallet,
  rules and settings stay shared between the two copies, because `chrome.storage.local` always is.
- **Unchanged.** The curated host list, the sponsored-TLD test, the redirect rules and the wording
  of the pause are exactly as they were in 2.6.8.
- **Known consequence.** Two copies of the worker now share one state document. A checkpoint that
  runs in both at the same instant can overwrite the other's write, so up to one 30-second interval
  of accounting can be missed; the next checkpoint continues from the stored state. This is
  documented in `docs/KNOWN_LIMITATIONS.md`.
- **Regression test added.** A unit test fails if the manifest loses `"incognito": "split"`, and
  checks that every page a redirect points at is listed in `web_accessible_resources`.

## Install or update

Download **EarnTime-2.6.9.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

**Already on 2.6.8?** Replace the contents of your unpacked folder with this release and click **Reload** for EarnTime at `chrome://extensions`. A manifest change needs that reload; incognito windows must be closed and reopened afterwards. **Do not uninstall** if you want to keep your settings and balance.

# EarnTime 2.6.8

## The package loads again

2.6.6 and 2.6.7 could not be installed: Chrome reported `focus_guard.json: Rules file must
contain a list.` and `Could not load manifest`, because the static ruleset file was written as
`{ "rules": [...] }` instead of a bare list.

- **Fixed:** `rules/focus_guard.json` is now a plain array of rules, which is what
  `declarative_net_request.rule_resources` requires.
- **Regression test added:** a unit test asserts the packaged ruleset is an array, and the
  release workflow refuses to publish a ZIP whose ruleset is not a list.
- **Nothing else changed in the guard.** The dynamic rules, the curated 296-host list, the
  hostname and sponsored-TLD tests and the pause page are exactly as they were in 2.6.7; the
  changes listed for that release still apply and are repeated below.
- **Verified:** strict TypeScript check, **311 source tests** (168 unit, 82 DOM, 61
  simulated-browser) and the production build.

## Install or update

Download **EarnTime-2.6.8.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

**Already on 2.6.6 or 2.6.7?** Those builds cannot be installed at all, so replace the contents of your unpacked folder with this release and click **Reload** for EarnTime at `chrome://extensions`. **Do not uninstall** if you want to keep your settings and balance — uninstalling discards them.

# EarnTime 2.6.7

## Adult blocking audit, and the personal list removed

This build is the same extension with three corrections to the fixed hostname policy, a narrower
surface for it, and no user-editable additions.

- **Fixed a false positive in the sponsored-TLD rule.** The host part of `ADULT_TLD_REGEX` was
  `[^/]+`, which also swallowed a query or fragment after the host: `https://example.com#x=.sex`
  and `https://example.com?next=foo.porn` paused an ordinary page because of text in its address.
  The host part is now `[^/?#]+`, which is what a hostname can actually contain. Unit tests pin the
  fragment and query cases, and the generated static ruleset uses the same pattern.
- **Fixed a false positive in the word list.** The whole-label token `joi` also matched `joi.dev`,
  the documentation site of the widely used JavaScript validation library. It is removed; JAV
  destinations remain covered by the curated list and the specific `jav*` fragments.
- **Coverage audit.** The curated list grows from 263 to 296 dedicated destinations after checking
  the popular sites the first list missed: `tube8.com/.net`, `ashemaletube.com`, `heavy-r.com`,
  `xbabe.com`, `letmejerk.com`, `badoinkvr.com`, `twistys.com`, `tushy.com`, `deeper.com`,
  `familystrokes.com`, `sislovesme.com`, `nubilefilms.com`, `passion-hd.com`, `wetplace.com`,
  `vjav.com`, `supjav.com`, `javhihi.com`, `javdock.com`, `jav321.com`, `javwhores.com`,
  `123av.com`, `avple.tv`, `sextb.net`, `netflav.com`, `hanime1.me`, `javdoe.com`, `javsin.com`,
  `javsky.tv`, `javsub.tv`, `beeg.net`, `redtube.net` and `missav.ws`. Matching fragments and
  whole-label words grew with them, so alternate TLDs of those brands are covered too.
- **Personal pause list removed.** `guard.add` / `guard.remove`, `settings.guardedHosts`, the
  Settings → Protection list editor and its sanitiser entry are gone. The fixed policy is now the
  only input. The storage schema moves to 10; upgrading drops the retired list and preserves the
  balance, rules, reviews, tasks and the rest of the settings.
- **No advance disclosure.** The Settings page, README, user guide, known-limitations document and
  test report no longer describe the policy. The static ruleset is named `focus_guard` (not
  `adult_guard`), so the manifest and the package do not name it either. A visit is the first
  moment the pause becomes visible; it still explains nothing about the site, the reason or the
  wallet. A unit test pins that the shipped files contain no advance disclosure.
- **Verified:** strict TypeScript check, **311 source tests** (168 unit, 82 DOM, 61
  simulated-browser) and the production build. The separate Playwright/Chromium suite and a real
  installed Chrome were not run (no Chromium binary available).

## Install or update

Download **EarnTime-2.6.7.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

For an existing unpacked installation, replace its files with the extracted release and click **Reload** for EarnTime at `chrome://extensions`. **Do not uninstall** if you want to keep your settings and balance. Reload once after updating: the static ruleset is read when the extension loads.

# EarnTime 2.6.6

## The pause actually pauses, and you can add any site you find

This release answers two reports: an adult site showed only an ordinary block instead of the motivation, and some sites (one of them `xhaccess`) opened anyway.

- **More sites are recognised.** The curated list grows from 45 to about 260 dedicated destinations, and two hostname tests now run beside it: the adult sponsored top-level domains (`.xxx`, `.porn`, `.adult`, `.sex`, `.sexy`) and unmistakable whole-label words or brand fragments (`xhaccess`, `xnxx`, `hentai`, …). Matching is still hostname-only — never page text, paths, images or embedded content — and the word tests use label boundaries, so `sussex.ac.uk`, `analytics.example.com` and `xxxlutz.at` are not caught.
- **You can add any site yourself.** *Settings → Protection → Your own pause list* takes any hostname; it is paused exactly like a built-in one, from then on and for its subdomains. Adding is free (it can only restrict), removing your own entry is free, and both are written to the audit log. The built-in policy still cannot be removed.
- **The pause no longer depends on a redirect surviving.** Three layers now enforce it: a **static** `declarativeNetRequest` ruleset shipped in the package (active from the moment EarnTime is enabled, before the service worker has done anything), the same guard as **dynamic** rules (which include your own additions), and the **content script**, which closes the page at `document_start` and draws the pause over it. If a site opens anyway — a hostname fragment no rule can express, a single-page navigation, a redirect that lost — the page is covered by the pause and cannot be used.
- **The pause itself now motivates.** Eight rotating lines instead of four, plus three concrete things to do in the next minute, on both `motivation.html` and the in-page pause. It still says nothing about the site, the reason, the balance or the debt.
- **Time on a guarded page is charged, never credited.** If a guarded page is ever in front of you (a page guard that has not painted yet, or a visit recorded from history while EarnTime was not running), its time counts as unproductive instead of being uncounted.
- **The debt and "screen time used up" block pages keep their encouragement** (introduced in 2.6.5) and still show the balance and debt.
- Existing settings, balances, day totals, ledger, tasks, reviews and site rules are preserved. The storage schema moves to 9, which adds the empty personal pause list.

## Verification

Strict TypeScript checking, **315 source tests** (169 unit, 84 DOM, 62 simulated-browser) and the production build pass. New tests cover the hostname tests and their deliberate non-matches, the personal list in both directions, the static ruleset being byte-identical to the runtime guard, and the in-page pause on a guarded page (including a worker answering "nothing to do"). The separate Playwright/Chromium suite and real-Chrome checks were not run because no Chromium binary was available. See `docs/TESTING.md`.

## Install or update

Download **EarnTime-2.6.6.zip**, extract it, and select the folder containing `manifest.json` via Chrome's **Load unpacked** option.

For an existing unpacked installation, replace its files with the extracted release and click **Reload** for EarnTime at `chrome://extensions`. **Do not uninstall** if you want to keep your settings and balance. Reload once after updating: the new static ruleset is read when the extension loads.

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

