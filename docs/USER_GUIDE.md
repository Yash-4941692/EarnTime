# EarnTime user guide

EarnTime turns study time into screen time. You study on productive sites, earn minutes, and spend them on sites you choose to distract yourself with. If you overspend, you are in **debt**: only productive sites open until you study the debt off.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the EarnTime folder (or the folder from the ZIP).
3. Pin EarnTime to the toolbar. The badge shows your remaining minutes (or `DEBT`).
4. The setup wizard opens by itself. If you close it, it opens again the next time Chrome starts, and
   the popup keeps a *Finish setup* button until it is done.

## Setup (once)

The setup wizard opens the first time. It has seven steps:

1. **Welcome**: the loop is Study → Earn → Use → Overspend → Repay.
2. **Earn rule**: default **60 productive minutes earn 5 minutes**. Also set the **unlock cost** (default 10 min, see *Protection* below).
3. **Starting balance**: default 0. Setup runs once, so the starting balance cannot be reset later.
4. **Websites**: productive sites (earn), half-productive sites (you choose the mode each visit; YouTube and WhatsApp are included by default), and unproductive sites (spend time; Instagram, Facebook, X, Reddit and Netflix are suggested).
5. **YouTube keywords**: default `JEE`, `NDA`, `Study`, `Learn`, `Education`, `PW`.
6. **Daily tasks** (optional): goals that pay screen time.
7. **Review**, then **Finish setup**.

## How time is counted

- Only the **active tab of the focused Chrome window** counts. Background tabs, minimised windows, other apps and idle time do not.
- A tab playing audio counts even while you are away from the keyboard (for example, a video you are watching).
- A locked screen does not count.
- Incognito windows are **not tracked** unless you allow EarnTime in incognito (`chrome://extensions` → EarnTime → *Allow in Incognito*). The popup warns you when they are not tracked.

## Site modes

| List | What happens |
| --- | --- |
| Productive | Time earns screen time at your ratio. Always open. |
| Half-productive | A prompt asks **Productive Mode** or **Unproductive Mode** each visit. Productive earns; Unproductive spends. |
| Unproductive | Time spends your balance. Blocked when the balance is empty or you are in debt. |
| Not listed | Not tracked and not blocked (unless you are in debt, when only productive sites open). |

### YouTube in Productive Mode

- The homepage shows **no videos** — and no blocking banner either. The rest of the page (search box, guide) works normally.
- **Search results are never removed.** Every channel's videos stay visible in search, even unproductive ones. The channel is judged only when the content actually plays: the moment a video starts, its channel name is read (on the first visit, no reload needed) and a non-matching video is covered and paused.
- Shorts, subscriptions, playlists, channel pages and non-matching videos are covered. While a deliberate cover is showing, time is neither charged nor credited.
- If YouTube's layout itself cannot be verified after the grace period, the filter fails closed and that time is counted as unproductive until the page loads correctly.
- Matching is by substring: `pw` also matches `Upwork`. Use longer keywords where that matters. *Settings → YouTube* has a checker.

### Half-productive sites without a filter (WhatsApp, and sites you add)

- You get the same **Productive / Unproductive Mode** chooser on every visit; nothing on the page is hidden or blanked in either mode.
- It is trust based: what you pick is what the time counts as. Productive earns at your ratio, Unproductive is charged to your balance.

## Balance, debt and repayment

- **Remaining** is your balance. **Earned**, **Used**, **Productive**, **Half-productive** and **Unproductive** show today's totals.
- Live use of an unproductive site never goes below zero. The site is blocked when the balance runs out.
- **Debt** appears only after an *interruption*: EarnTime was not running (extension disabled, browser closed, computer asleep). On the next check, EarnTime estimates the time from your browser history. Use beyond the balance becomes debt. Example: balance 10 min, 40 min of Instagram use while EarnTime was off → debt 30 min.
- In **DEBT MODE** only productive and half-productive sites (in Productive Mode) open. The popup and block page show the debt, how much productive time is needed (at 60:5 each productive hour repays 5 minutes, so 30 min of debt needs 6 hours), and the progress.
- Productive time and task rewards repay debt before they add to the balance.
- *Why this debt exists* in the popup shows the interruption window and the charged and credited minutes.

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

EarnTime also redirects `chrome://extensions` and `chrome://settings/extensions` tabs to its block page.

> Chrome prevents extensions from completely controlling privileged `chrome://` pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.

See `docs/KNOWN_LIMITATIONS.md` section 1 for the API this uses, what has been tested, and which bypasses remain.

## Audit

*Settings → Protection → Download JSON* exports settings, lists, daily totals and the full ledger (every credit, charge, debt, rule change and interruption) as a read-only file. It contains **hosts only**, never page addresses.

## Troubleshooting

- **"Setup isn't finished"**: open the popup and choose *Finish setup*. It also reopens on every browser start until you finish it.
- **Time is not counting**: check that the EarnTime tab is the active tab in the focused window, and that you are not in an incognito window without access.
- **YouTube homepage looks empty**: that is Productive Mode hiding the videos. Use the search box to find study content; every result stays visible and the channel is checked when you play a video.
- **"Filter unavailable"**: the site changed its layout. Time on that page is counted as unproductive until it loads correctly. Reload the page.
- **Your balance seems wrong after a computer sleep or a browser restart**: EarnTime estimates the gap from history. The audit export shows what it used.
