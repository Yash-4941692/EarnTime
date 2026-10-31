# EarnTime user guide

EarnTime turns study time into screen time. You study on productive sites, earn minutes, and spend them on sites you choose to distract yourself with. If you overspend, you are in **debt**: only productive sites open until you study the debt off.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the EarnTime folder (or the folder from the ZIP).
3. Pin EarnTime to the toolbar. The badge shows your remaining minutes (or `DEBT`).
4. The setup wizard opens by itself. If you close it, it opens again the next time Chrome starts, and
   the popup keeps a *Finish setup* button until it is done.

## Setup (once)

The setup wizard opens the first time. It has eight steps:

1. **Welcome**: the loop is Study → Earn → Use → Overspend → Repay.
2. **Earn rule**: default **60 productive minutes earn 5 minutes**. Also set the **unlock cost** (default 10 min, see *Protection* below).
3. **Starting balance**: default 0. Setup runs once, so the starting balance cannot be reset later.
4. **Screen-time access**: EarnTime asks Chrome for the optional `history` permission. Granting it lets EarnTime reconstruct the time it could not watch itself and show per-site screen time (see *Screen time and analytics*). Declining is fully supported and setup continues either way.
5. **Websites**: productive sites (earn), half-productive sites (you choose the mode each visit; YouTube and WhatsApp are included by default), and unproductive sites (spend time; Instagram, Facebook, X, Reddit and Netflix are suggested).
6. **YouTube keywords**: default `JEE`, `NDA`, `Study`, `Learn`, `Education`, `PW`.
7. **Daily tasks** (optional): goals that pay screen time.
8. **Review**, then **Finish setup**.

## How time is counted

- Only the **active tab of the focused Chrome browser or installed web-app/shortcut window** counts. Background tabs, minimised windows, unrelated apps and idle time do not. The web app must be exposed to EarnTime in the same Chrome profile.
- **EarnTime's own popup counts too.** Opening the popup takes focus away from the page, so it used to freeze the numbers until you closed it. The popup now beats once a second and the timer keeps falling while you watch it.
- A tab playing audio counts even while you are away from the keyboard (for example, a video you are watching).
- A locked screen does not count.
- Incognito windows are **not tracked** unless you allow EarnTime in incognito (`chrome://extensions` → EarnTime → *Allow in Incognito*). The popup warns you when they are not tracked.

## Site modes

| List | What happens |
| --- | --- |
| Productive | Time earns screen time at your ratio. Always open. |
| Half-productive | A prompt asks **Productive Mode** or **Unproductive Mode** each visit — shown over the page as it loads, so nothing is usable before you answer. Productive earns; Unproductive spends. |
| Unproductive | Time spends your balance. Blocked when the balance is empty or you are in debt. |
| Not listed | Not tracked and not blocked (unless you are in debt, when only productive sites open). |

## Adult-site focus

The adult-site focus guard is always on. It covers a curated list of dedicated adult-site hostnames, adult top-level domains such as `.xxx` and `.porn`, and unmistakable adult words in the hostname itself. It cannot be turned off and its built-in list cannot be edited.

No list can name every site, so you can add your own: open **Settings → Protection → Your own pause list**, type a site such as `example.com` and press **Add**. From then on that site (and its subdomains) opens the same motivational pause instead of the page, whatever your balance is. Adding is free and so is removing something you added. The pause shows a short encouragement and three things to do instead; it never names the site, the reason or your balance.

If a page does open before the pause can replace it, EarnTime covers the page with the pause itself, so there is nothing to use behind it. The separate balance and debt rules still apply independently.

Matching is by hostname and covers subdomains. EarnTime does **not** inspect page text, URL paths, images, search terms or embedded content, so a health, education, news or social page is not classified because of words on it. Mixed-use domains are excluded from the curated list. A matching visit opens a short motivational pause page of its own (not a block page): it does not name the site or the reason, and it says nothing about your balance or debt — it is a pause, not an accounting statement.

### YouTube in Productive Mode

- The homepage shows **no videos** — and no blocking banner either. The rest of the page (search box, guide) works normally.
- **Search results are never removed.** Every channel's videos and Shorts shelves/cards stay visible in search, even unproductive ones. The channel is judged only when the content actually plays: the moment a video starts, its channel name is read (on the first visit, no reload needed) and a non-matching video is covered and paused.
- **Every channel and playlist page can be browsed**, whoever owns it. EarnTime does not judge a page by a channel name it may not be able to read: the channel rule is applied when something actually **starts playing**. On a channel or playlist page the owner is read at that moment, and playback from a non-matching — or unreadable — channel is refused and stopped. That cover offers *Keep browsing*, so the page itself stays usable.
- **Shorts playback follows your mode.** In Productive Mode, a Short plays visibly only if its active channel or a credited collaborator matches a study keyword. A Short from a channel that does not match is covered and paused. When EarnTime cannot read the channel name at all — the channel bar has not filled in, or the layout hides it — it does not just refuse: you get a **Shorts channel not verified** card with *Continue (trust)*, and continuing counts that time as productive. EarnTime reads the name from the reel, the channel bar, the page's own data for the video in the address bar, the link's title/aria-label, or the channel handle, before it asks. Search results and channel Shorts tabs remain browsable either way, and only the Short you trusted is affected: the next one asks again. In Unproductive Mode, all Shorts are available.
- Subscriptions and non-matching videos are covered. While a deliberate cover is showing, time is neither charged nor credited.
- If YouTube's layout itself cannot be verified after the grace period, the filter fails closed and that time is counted as unproductive until the page loads correctly.
- Matching is by substring: `pw` also matches `Upwork`. Use longer keywords where that matters. *Settings → YouTube* has a checker.

### Half-productive sites without a filter (WhatsApp, and sites you add)

- You get the same **Productive / Unproductive Mode** chooser on every visit; nothing on the page is hidden or blanked in either mode.
- It is trust based: what you pick is what the time counts as. Productive earns at your ratio, Unproductive is charged to your balance.

## The gate: no first-visit bypass

EarnTime checks the address **while the page loads**, not after it has finished. From the first byte, a page is held closed behind its own verdict:

- a **half-productive** site shows the Productive / Unproductive chooser immediately, over the first paint;
- a **productive** or **unproductive** site shows its status card (and unproductive sites are blocked outright when the balance is empty);
- a site EarnTime cannot classify yet shows **"Checking this site…"** until the worker answers.

Answering the chooser applies straight away — **no reload needed**. The check repeats on every navigation, including in-page ones (single-page apps, `pushState`, clicking through YouTube or WhatsApp chats), and on every revisit: a half-productive mode is per tab, so leaving a site and coming back asks again.

If EarnTime's worker is asleep, disabled or simply not answering, the page **stays closed**. The only thing that releases a held page is EarnTime detecting that the extension itself is gone (disabled, reloaded or removed), because then there is nothing left to enforce a verdict.

## Screen time and analytics

With screen-time access granted, EarnTime keeps a **per-site, per-day** record of the time each site was in front of you, and every daily figure — earned, used, debt, productive minutes — is measured from that day's screen time.

**Where to look:**

- **Popup → *Screen time today***: today's total, the three biggest sites as bars, the study share, and a link to the full analytics. The numbers move while the popup is open.
- **Settings → Analytics**: today's screen time, study time, charged and earned; the full per-site breakdown for the day with "other sites" rolled up; a **14-day trend** so you can see progress or degradation; today against yesterday and against your average; and the screen-time access switch.

**What counts as screen time:** only time the site was actually **in front of you** — the active tab of a focused, non-minimised Chrome browser or web-app window. Background tabs, idle time and a locked screen are excluded. Time on a deliberately covered YouTube page, on EarnTime's own pages, or while a mode choice is pending is counted as screen time but is **not billed**. Sites that are on no list are measured and shown, and cost nothing.

**Estimated vs. exact:** time EarnTime watched live is exact. Time it had to reconstruct after an interruption (from history) is marked as **estimated** and shown separately, so you always know which numbers are hard and which are inferred. Without screen-time access, gaps are charged conservatively from the last checkpoint, the per-site breakdown only covers what was observed live, and the analytics say so.

**Privacy:** hostnames and minutes only. No page addresses, no titles, no search terms, and no network requests — ever. A day keeps at most 60 sites (the smallest are rolled into the totals), and days are pruned after the retention window.

**Granting and removing access:** setup asks once; *Settings → Analytics* can grant or remove it at any time. Because Chrome only shows the permission prompt during a real click, that button must be pressed by you — EarnTime cannot grant it to itself. If you revoke `history` in `chrome://extensions` instead, EarnTime notices at the next window focus or worker start, records the change in the ledger, and stops reconstructing gaps.

### Choose which devices supply history

In **Settings → Analytics → Devices used for history estimates**, choose:

- **This device only** (default, including on upgrade): imports only visits Chrome marks as local. Synced and unknown-source visits are excluded.
- **All devices with synced Chrome history**: opts into the combined history Chrome exposes. This is still an estimate of visit durations, not an exact measurement of screen time on other devices.

Live tracking always measures the current device. Chrome's history API cannot identify which remote device made a synced visit, so individual remote devices cannot be selected. Changing the source affects future imports; it does not undo existing credits, spending or debt. If Chrome cannot identify visit sources, this-device mode uses live tracking and checkpoint estimates only.

## Balance, debt and repayment

- **Remaining** is your balance. **Earned**, **Used**, **Productive**, **Half-productive** and **Unproductive** show today's totals.
- Live use of an unproductive site never goes below zero. The site is blocked when the balance runs out.
- **Debt** can also start immediately when you add or move a website to **Unproductive**: its recorded screen time earlier today is charged against your remaining balance. For example, 20 recorded minutes on `arena.ai` and a 10-minute balance creates 10 minutes of debt. Time already charged is not charged again, and earlier days are not back-billed.
- **Interruption debt** appears after an *interruption*: EarnTime was not running (extension disabled, browser closed, computer asleep). On the next check, EarnTime estimates the time from your browser history. Use beyond the balance becomes debt. Example: balance 10 min, 40 min of Instagram use while EarnTime was off → debt 30 min.
- **Half-productive time during an interruption is split down the middle and then asked about.** EarnTime cannot tell which mode you were in while it was not running, so half of that estimated time is credited as study and half is charged as unproductive (see the card in the popup, the debt block page, or the notification). Example: 40 min of YouTube while EarnTime was off → 20 min counted as study credit and 20 min charged; the balance covers what it can and the rest becomes debt.
- **Answering the question: "Was that study time?"** The popup (and the debt block page) shows a card for every unverifiable stretch. Type how many of those minutes were study, or press *Keep half & half* to accept the default. The answer re-prices the stretch straight away: more study credits the difference (repaying debt first), less study charges it again. Answering is **free** — it only corrects an estimate — and the answer is written to the audit log. Ignore the card and the half-and-half split stands; questions are kept until answered, but only the newest 20 are kept at a time.
- In **DEBT MODE** only productive and half-productive sites (in Productive Mode) open. The popup and block page show the debt, how much productive time is needed (at 60:5 each productive hour repays 5 minutes, so 30 min of debt needs 6 hours), and the progress.
- **Every page that stops you says something worth reading.** The debt page and the "screen time used up" page each show a short encouragement above the numbers ("Debt is only time you have not studied yet…", "Earn it, then enjoy it…"), one line at a time, changing once a minute. The motivational pause for the adult-site focus guard keeps its own wording and stays silent about the site, the reason and the wallet.
- Productive time and task rewards repay debt before they add to the balance.
- *Why this debt exists* in the popup shows the interruption window and the charged and credited minutes. If part of the debt is an estimate from a half-productive site, the same popup asks about it (see above).

## Daily tasks

- Tick a task to pay its reward. A recurring task pays once per local day. A one-off task pays once.
- Un-ticking never takes back a reward, and ticking again the same day does not pay twice.
- Adding a task, or raising its reward, costs the unlock cost. Deleting a task is free.

## Protection (what costs time)

After setup, any change that makes usage easier costs the **unlock cost** (default 10 min) from your balance. Changes that make things stricter are free.

The rule is one sentence: **a change costs only when it lifts a restriction EarnTime was already
enforcing.**

| Costs the unlock cost | Free |
| --- | --- |
| Removing a half-productive or unproductive site (it becomes untracked, so always open) | Adding a site to *any* list, including Productive |
| Moving a site to a more permissive list (unproductive → half → productive) | Moving a site to a stricter list |
| Raising the earn ratio; lowering the unlock cost (charged at the current price) | Removing a productive site; lowering the earn ratio; raising the unlock cost |
| Adding a task; raising a task reward | Deleting a task; lowering a task reward |
| — | Adding or removing a YouTube keyword |

Why adding a site is free: a site that is on no list is **not restricted at all** — it already opens
freely and simply is not tracked. Putting it on a list can only add tracking, never make a blocked
site reachable, so there is nothing to unlock. You can fill in all three lists after setup without
paying for each entry.

YouTube keywords are free for the same reason: they never control access to a site. YouTube is
half-productive, so the mode prompt is what gates it; a keyword only decides which channels count as
study inside a Productive Mode you already chose. *Trade-off to be aware of:* a very broad keyword
(like `a`) would let most of YouTube count as study time. Keywords are an honesty setting, not a lock.

Adding a task still costs, because a task is a button that pays you minutes on demand.

### You are asked before anything is charged

A change that costs screen time is never charged on the click that asked for it. EarnTime first shows
you the price and your balance, and nothing is spent or changed until you accept:

> Removing instagram.com from unproductive sites costs 10 min of your screen-time balance (you have
> 30 min). Continue?

Declining leaves everything exactly as it was. Free changes are never quoted, so filling in your
lists stays one click per entry.

If the balance cannot pay, the change is refused outright and nothing changes. Changes are refused while you are in debt.

Opening `chrome://extensions` or `chrome://settings/extensions` in a tab first shows a confirmation page. Choose **Go back**, open EarnTime's settings, or explicitly continue to Chrome's settings once. Chrome may still prevent a standard extension from fully controlling its privileged pages.

> Chrome prevents extensions from completely controlling privileged `chrome://` pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.

See `docs/KNOWN_LIMITATIONS.md` section 1 for the API this uses, what has been tested, and which bypasses remain.

## Audit

*Settings → Protection → Download JSON* exports settings, lists, daily totals and the full ledger (every credit, charge, debt, rule change and interruption) as a read-only file. It contains **hosts only**, never page addresses.

## Troubleshooting

- **"Setup isn't finished"**: open the popup and choose *Finish setup*. It also reopens on every browser start until you finish it.
- **Time is not counting**: check that the site is the active tab in a focused Chrome browser or web-app window in the same profile, and that you are not in an incognito window without access.
- **A half-productive site shows the chooser on a page you were already using**: that is the load-time gate. Pick a mode; the page opens immediately, without a reload.
- **A page is stuck on "Checking this site…"**: EarnTime's worker is not answering (it was just disabled or removed, or Chrome is still starting it). Give it a few seconds; if the extension is genuinely gone the page releases itself.
- **Analytics are empty or say "partly estimated"**: screen-time access is off, or today has not accumulated foreground time yet. *Settings → Analytics* shows the current status and the grant button.
- **YouTube homepage looks empty**: that is Productive Mode hiding the videos. Use the search box, or open any channel or playlist and browse it. Search results stay visible; each video's channel is checked when it plays.
- **Shorts are missing in search or an allowed player is blank after updating**: reload EarnTime on `chrome://extensions`, then refresh your open YouTube tabs so they load the updated content script. Do not uninstall the extension; reloading keeps your settings and balance.
- **"Nothing plays from this channel/playlist"**: at the moment playback started, its owner did not match your keywords or could not be read. Choose *Keep browsing* to carry on reading the page, or *Study search* to find study content.
- **"Shorts channel not verified"**: EarnTime could not read the Short's channel name, so it cannot check your keywords. Playback is paused until you decide: *Continue (trust)* if the Short is study content (its time then counts as productive), *Study search* to look for study content, or *Back*. A trusted Short stays trusted until you swipe to the next one.
- **"Filter unavailable"**: the site changed its layout. Time on that page is counted as unproductive until it loads correctly. Reload the page.
- **Your balance seems wrong after a computer sleep or a browser restart**: EarnTime estimates the gap from history. The audit export shows what it used. Half-productive time in that gap is split half study / half unproductive until you answer the popup's *Was that study time?* card.
