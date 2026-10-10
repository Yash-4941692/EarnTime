# Known limitations

EarnTime is a self-discipline tool. It is not a security boundary, and nothing in it is unbypassable. This document lists what it cannot do, what it can only approximate, and what was not verified in a real Chrome browser. Read it before relying on EarnTime for a commitment.

## 1. Chrome restrictions on `chrome://` pages (required statement)

> Chrome prevents extensions from completely controlling privileged `chrome://` pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.

**Can be blocked.** A tab that opens `chrome://extensions` or `chrome://settings/extensions` is redirected to EarnTime's block page. This covers typed addresses, links and the extensions menu, because they all end in a tab navigation.

**API used.** `chrome.tabs` events (`onCreated`, `onUpdated`) with `chrome.tabs.update`. No other technique is used. No hidden page, no injected script into `chrome://` pages, no workaround of Chrome's security model.

**Tested.** In the simulated browser only (`test/sim/flows.test.ts`): a new tab opened at `chrome://extensions` is redirected; a typed `chrome://extensions/?id=…` navigation in an existing tab is redirected; `chrome://settings/extensions` is redirected; `chrome://settings/privacy` is not affected. The redirect is recorded in the ledger. **Not tested in a real Chrome instance** (see `docs/TESTING.md`): the redirect timing, the flash, the extensions-menu route, and tabs restored at startup. Expect a possible brief flash of the extensions page before the redirect runs.

**Bypasses that remain** (none of these were tested in a real browser):

- Right-click the EarnTime toolbar icon and choose **Remove from Chrome**. Chrome allows this without opening any extensions page. Removing EarnTime deletes its data.
- A tab can briefly render `chrome://extensions` before the redirect runs.
- Disabling or reloading an extension through Chrome's own policy tools, or through enterprise management, is outside EarnTime's control.
- Other Chrome profiles, guest mode, incognito windows (unless the user allows EarnTime there), other browsers on the same machine, and Chrome's safe mode or `--disable-extensions`.
- Uninstalling EarnTime deletes its storage. A reinstall starts setup again. Setup can grant at most **30 minutes** of starting balance, which limits the damage, but it does not remove the bypass.
- Anyone with developer tools on the profile can read or edit extension storage, including the balance and the cost settings.
- The system clock. Moving it backwards charges only the real elapsed time seen by the worker (a monotonic clock), so usage is not erased. Moving it forwards is treated as an interruption and reconciled from history. Neither is a complete defence.

## 2. Counting

- **Only one tab counts**: the active tab of the focused Chrome browser window or Chrome-installed web-app/shortcut window (when exposed as a popup or app window to this extension). Tab switches are observed live, but during an interruption they can only be estimated (see section 3).
- **Idle detection is coarse.** `chrome.idle` reports idle after 15 seconds without input. Silent video watched without any input is not counted. That is a deliberate favour to the user, not a complete measure of attention.
- **Checkpoints every 30 seconds.** A state change that Chrome does not announce with an event (for example, allowing incognito access) takes effect at the next checkpoint, up to 30 seconds later.
- **The popup now counts.** Opening EarnTime's popup takes OS focus away from the browser window and Chrome announces no event for it, which used to freeze counting and the display. The popup beats once a second while it is open, and the worker treats that beat as "the user is here" for up to 2.5 seconds, so the timer keeps moving in front of you. Devtools and unrelated application windows are still not counted.
- **Picture-in-picture** and **embedded players on other sites** are not analysed. Only the top-level page is evaluated.
- **Incognito** is not tracked unless the user allows EarnTime in incognito. The popup shows a warning when it is not.
- **One profile, one ledger.** Each Chrome profile has its own EarnTime state.

## 3. Interruption reconciliation (estimates)

When the worker was not running (extension disabled, browser closed, computer asleep, or a gap longer than two minutes), EarnTime reads browser history and estimates the time. The rules are fixed and are written to the ledger:

- Each visit is assumed to last until the next visit, capped at **15 minutes**.
- The page that was active at the last checkpoint is assumed to last until the first visit, capped at 15 minutes.
- The final page is assumed to last until now, capped at 15 minutes if you are still on that site and at **2 minutes** if not.
- History does not record time within a page or tab switches between already-open tabs. Those are invisible during an interruption.
- Half-productive sites are charged as unproductive during an interruption, because their mode cannot be verified then. This is deliberate and fail-closed.
- If the browser was closed, only the last 30 seconds before closing are charged.
- Incognito visits are not in history, so they are not counted during an interruption.
- Reconciliation looks back at most **7 days**.
- After a sleep without a screen lock, returning to the same page can charge up to 15 minutes. If the screen locks, counting stops at lock time.

The audit export (Settings → Protection) records each reconciliation's window, charged minutes, credited minutes and debt added.

## 4. Half-productive filters and the load-time gate

- **YouTube keywords are substrings.** `pw` matches `Upwork`. Use longer keywords where that matters. The settings page has a checker.
- **Channel and playlist pages are browsable; the channel rule is applied to playback.** EarnTime no longer judges those pages by a channel name it may be unable to read: the owner is checked when media starts playing, and unmatched or unreadable playback is refused and stopped. Browsing such a page counts as productive time, exactly like reading search results — the rule holds playback, not reading. A playlist title still cannot qualify an unrelated owner. Shorts and subscriptions remain covered.
- **YouTube's layout can change.** If the page is not recognised, nothing can be verified, so the page is covered after eight seconds and that broken-filter time counts as unproductive until it loads correctly. Covers deliberately shown for Shorts, unsupported pages and non-study videos are reported separately and do not earn or spend time.
- **Embedded YouTube players** on other websites are not filtered.
- **Other half-productive sites** (WhatsApp and the sites you add yourself) have no content filter. Choosing Productive Mode there is a trust decision; the page stays fully visible in both modes.
- **The gate now runs at `document_start`, before the page has a body.** The content script classifies
  the URL itself, from the rules the worker keeps mirrored in `chrome.storage.session`, and closes the
  page immediately: a half-productive site shows the Productive/Unproductive chooser over the first
  paint, a productive or unproductive site shows its status card, and an unclassifiable site is
  covered with "Checking this site…". Nothing on the page is usable before that verdict, and no
  reload is needed to apply it. This removed the earlier window in which a first visit to a
  half-productive site could be used while the sleeping worker woke up.
- **What the gate cannot know yet.** Before the worker answers, the page script only knows its own URL
  and the mirrored rules. It cannot know the balance-dependent restrictions or the YouTube keyword
  filter, so it always confirms with the worker afterwards and the worker's answer replaces the local
  one. If the local answer was already correct (the common case) nothing visibly changes.
- **The mirrored rules are at most 30 seconds old, and 100 tabs wide.** A rule changed in the last few
  seconds may not be reflected in the first local verdict; the worker's answer corrects it.
- **A page that opens while the service worker is still starting is held, not released.** Every message
  has its own timeout, the question is retried for up to a minute, and until an answer arrives the
  page stays closed. If the rules cannot be read *and* the worker never answers, the page still stays
  covered — EarnTime fails closed. The only path that releases an unclassifiable page is the watchdog
  detecting that the extension context itself is gone (disabled, reloaded or removed mid-load),
  because at that point there is nothing left to enforce a verdict.

## 5. Debt and blocking

- **Blocking uses declarativeNetRequest** for top-level page loads. Sub-resources are not blocked.
- **Navigations inside an already-open page** (single-page apps, `pushState`) are not blocked by the rule. EarnTime watches the address of the open page and re-checks within about three quarters of a second, and open tabs are re-checked at each checkpoint (up to 30 seconds) as a backstop. In-page navigations are still never *network*-blocked: a page already loaded can only be covered or handed a mode choice, not refused.
- **Debt allows only productive sites** (and half-productive sites in Productive Mode). Unlisted sites are blocked too. Add the search engines and documentation you need to the productive list.
- **Unproductive Mode** on a half-productive site is unavailable when the balance is empty or the user is in debt. An Unproductive session ends when the balance runs out.
- **Half-productive mode is per tab.** Leaving the site and returning asks again. Closing the tab ends the session. Browser restarts clear all sessions.

## 6. Protection costs

- The cost model lives in extension storage. It is enforced by EarnTime, so it can be read or edited by anyone with developer access to the profile.
- The default unlock cost is 10 minutes. It can be set to 0, which turns the cost model off. Lowering it is charged at the current price first.
- Rules cannot be loosened while in debt.
- **A change that costs screen time is quoted before it is charged.** The first request is refused
  with the price and your balance, and nothing is spent or changed; the identical command, sent again
  with the cost accepted, is what pays. Free changes are never quoted, so filling in a list is still
  one click per entry. The quote is a prompt in EarnTime's own UI — it is not a Chrome-level
  confirmation, and a change made by editing storage directly bypasses it entirely.
- Setup runs once. Its starting balance is capped at 30 minutes.
- **A cost applies only when an existing restriction is lifted.** Adding a site to any list is free,
  because a site on no list is already unrestricted; adding or removing YouTube keywords is free,
  because that list never gates access to a site. The consequences are deliberate and worth
  knowing:
  - You can mark any site productive without paying, and productive time earns screen time. The
    productive list is an honesty setting, not a lock.
  - A very broad YouTube keyword (a single letter, say) lets most of YouTube count as study time.
  - Moving a site *up* from unproductive, or dropping an unproductive or half-productive site, still
    costs, so undoing a restriction you set is never free.

## 7. Data and privacy

- Data is stored unencrypted in `chrome.storage.local`. Anyone with access to the Chrome profile can read it.
- **Screen time is an optional permission, not a required one.** `history` moved to `optional_permissions`, so Chrome installs EarnTime without it and setup asks for it explicitly. Declining is supported: everything still works, reconciliation just stops attributing gaps site by site, and the analytics say the data is partly estimated.
- The history permission is used for two things now: reconstructing interruptions, and attributing foreground time to sites for the daily analytics. EarnTime keeps **hostnames and minutes only**. It does not store page addresses, titles or visit counts beyond the minute totals per site per day.
- **Per-site history is bounded.** At most 60 sites are kept for a day, and the smallest ones are dropped first when that limit is reached. A day with more than 60 distinct sites therefore loses its smallest rows into the totals.
- Access is verified against Chrome, never trusted from storage: at startup, at install, on window focus and after a worker restart. Revoking it in `chrome://extensions` is noticed at the next window focus (Chrome fires no event for revocation) and written to the ledger.
- The audit export contains hostnames, minutes and settings. It contains no page addresses.
- The extension makes no network requests.

## 8. Out of scope

- Chrome for Android, Firefox, Edge and other browsers have not been tested.
- No sync across devices and no account.
- No time-of-day schedules for *blocking* and no parental-control features.
- No defence against a determined user with full control of the machine.

## 9. Test gaps

No real Chrome browser was available for end-to-end testing. The following behaviours have **not** been exercised with a real Chrome extension runtime:

- service-worker suspension and restart, and the worker's behaviour across real idle transitions;
- declarativeNetRequest blocking and the block-page redirect;
- the `chrome://extensions` redirect and the flash it may cause;
- disabling, reloading and removing the extension, and the reconciliation that follows;
- real `chrome.history` visits, real idle timing, real notifications and real incognito gating;
- `chrome.permissions.request` from the setup page (it needs a real user gesture), revoking `history` in `chrome://extensions`, and `chrome.storage.session` lifetime across real worker restarts;
- the load-time gate in a real tab: first-paint timing, the chooser over a real half-productive page, and single-page-app navigations on real sites;
- YouTube as it currently renders (the browser tests use fixture pages).

`docs/TESTING.md` lists the manual checks to run before release.
