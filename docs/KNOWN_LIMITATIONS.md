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

- **Only one tab counts**: the active tab of the focused normal Chrome window. Tab switches are observed live, but during an interruption they can only be estimated (see section 3).
- **Idle detection is coarse.** `chrome.idle` reports idle after 15 seconds without input. Silent video watched without any input is not counted. That is a deliberate favour to the user, not a complete measure of attention.
- **Checkpoints every 30 seconds.** A state change that Chrome does not announce with an event (for example, allowing incognito access) takes effect at the next checkpoint, up to 30 seconds later.
- **Popup and devtools windows** are not normal windows, so while they have focus nothing is counted.
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

## 4. Half-productive filters

- **YouTube keywords are substrings.** `pw` matches `Upwork`. Use longer keywords where that matters. The settings page has a checker.
- **YouTube's layout can change.** If the page is not recognised, the results are hidden, the page is covered after eight seconds, and the time counts as unproductive until it loads correctly.
- **Embedded YouTube players** on other websites are not filtered.
- **WhatsApp Web chats** match exactly (after case and whitespace normalisation). WhatsApp's layout can change. If the chat list cannot be read, it is hidden and the time counts as unproductive.
- **Other half-productive sites** (sites you add yourself) have no content filter. Choosing Productive Mode there is a trust decision.

## 5. Debt and blocking

- **Blocking uses declarativeNetRequest** for top-level page loads. Sub-resources are not blocked.
- **Navigations inside an already-open page** (single-page apps, `pushState`) are not blocked by the rule. EarnTime re-checks open tabs at each checkpoint (up to 30 seconds).
- **Debt allows only productive sites** (and half-productive sites in Productive Mode). Unlisted sites are blocked too. Add the search engines and documentation you need to the productive list.
- **Unproductive Mode** on a half-productive site is unavailable when the balance is empty or the user is in debt. An Unproductive session ends when the balance runs out.
- **Half-productive mode is per tab.** Leaving the site and returning asks again. Closing the tab ends the session. Browser restarts clear all sessions.

## 6. Protection costs

- The cost model lives in extension storage. It is enforced by EarnTime, so it can be read or edited by anyone with developer access to the profile.
- The default unlock cost is 10 minutes. It can be set to 0, which turns the cost model off. Lowering it is charged at the current price first.
- Rules cannot be loosened while in debt.
- Setup runs once. Its starting balance is capped at 30 minutes.
- **A cost applies only when an existing restriction is lifted.** Adding a site to any list is free,
  because a site on no list is already unrestricted; adding or removing YouTube keywords, WhatsApp
  chats and WhatsApp groups is free, because those lists never gate access to a site. The
  consequences are deliberate and worth knowing:
  - You can mark any site productive without paying, and productive time earns screen time. The
    productive list is an honesty setting, not a lock.
  - A very broad YouTube keyword (a single letter, say) lets most of YouTube count as study time.
  - Moving a site *up* from unproductive, or dropping an unproductive or half-productive site, still
    costs, so undoing a restriction you set is never free.

## 7. Data and privacy

- Data is stored unencrypted in `chrome.storage.local`. Anyone with access to the Chrome profile can read it.
- The history permission is used only during reconciliation. EarnTime keeps hostnames and minutes. It does not store page addresses or titles.
- The audit export contains hostnames, minutes and settings. It contains no page addresses.
- The extension makes no network requests.

## 8. WhatsApp auto-reply

- **WhatsApp Web must be open and logged in** in a Chrome tab. There is no other channel and EarnTime
  does not use one: no WhatsApp Business API, no network requests, no phone pairing.
- **Plain text only.** Media, stickers, GIFs, documents, voice notes, location, contacts, reactions,
  replies to a specific message, mentions, and formatting (bold/italic/monospace) are not supported.
  Message *content* is never read — only chat titles and unread counts.
- **It drives WhatsApp's DOM**, because WhatsApp Web exposes no extension API. Every selector in
  `source/src/content/whatsappSend.ts` is a guess about the current layout and **will** break when
  WhatsApp ships a redesign. When it breaks, a send fails, the reason is logged, and after three
  consecutive failures that tab stops until WhatsApp is reloaded. Nothing is retried in a tight loop
  and the page is never left with a half-typed message that EarnTime reported as sent.
- **Group detection is best effort.** A group without a custom photo carries a group icon EarnTime can
  read; a group *with* a photo carries none. That is why the explicit group list in Settings is the
  authoritative signal, and why a chat that cannot be classified is treated as a group and skipped by
  fallback rules. A rule that *names* a group still messages it — naming is the override.
- **Unread detection depends on the unread badge.** A message that arrives and is read elsewhere
  (phone, another computer) before EarnTime's next scan may never be seen. Scans happen every 2.5 s in
  a focused tab and roughly every 30 s in a background tab, where Chrome throttles timers and the
  service worker has to nudge the page.
- **Delivery is not instant in a background tab.** Task announcements are pushed immediately; incoming
  -message replies can lag by up to about 30 seconds.
- **Automated messaging may violate WhatsApp's terms of service** and could in principle get a number
  restricted. Rate limits (cooldown, repeat mode, at most three messages per cycle with a pause
  between them) reduce the risk; they do not remove it.
- **Not supported:** sending to a chat that is not in the chat list *and* not findable by WhatsApp
  search, archived or blocked chats, channels, communities, status, calls, and any chat whose exact
  name you have not typed.

## 9. Out of scope

- Chrome for Android, Firefox, Edge and other browsers have not been tested.
- No sync across devices and no account.
- No time-of-day schedules for *blocking* (auto-reply has time windows; site blocking does not) and no parental-control features.
- No defence against a determined user with full control of the machine.

## 10. Test gaps

No real Chrome browser was available for end-to-end testing. The following behaviours have **not** been exercised with a real Chrome extension runtime:

- service-worker suspension and restart, and the worker's behaviour across real idle transitions;
- declarativeNetRequest blocking and the block-page redirect;
- the `chrome://extensions` redirect and the flash it may cause;
- disabling, reloading and removing the extension, and the reconciliation that follows;
- real `chrome.history` visits, real idle timing, real notifications and real incognito gating;
- YouTube and WhatsApp Web as they currently render (the browser tests use fixture pages, and the
  auto-reply DOM tests use a hand-written fake WhatsApp layout);
- a real auto-reply end to end: opening a real chat, typing into the real composer and actually
  delivering a message to a real contact.

`docs/TESTING.md` lists the manual checks to run before release.
