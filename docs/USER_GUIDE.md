# EarnTime user guide

EarnTime turns study time into screen time. You study on productive sites, earn minutes, and spend them on sites you choose to distract yourself with. If you overspend, you are in **debt**: only productive sites open until you study the debt off.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select the EarnTime folder (or the folder from the ZIP).
3. Pin EarnTime to the toolbar. The badge shows your remaining minutes (or `DEBT`).

## Setup (once)

The setup wizard opens the first time. It has eight steps:

1. **Welcome**: the loop is Study → Earn → Use → Overspend → Repay.
2. **Earn rule**: default **60 productive minutes earn 5 minutes**. Also set the **unlock cost** (default 10 min, see *Protection* below).
3. **Starting balance**: default 0. Setup runs once, so the starting balance cannot be reset later.
4. **Websites**: productive sites (earn), half-productive sites (you choose the mode each visit; YouTube and WhatsApp Web are included by default), and unproductive sites (spend time; Instagram, Facebook, X, Reddit and Netflix are suggested).
5. **YouTube keywords**: default `JEE`, `NDA`, `Study`, `Learn`, `Education`, `PW`.
6. **WhatsApp chats**: the exact chat names that stay visible in Productive Mode.
7. **Daily tasks** (optional): goals that pay screen time.
8. **Review**, then **Finish setup**.

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

- The homepage is replaced by a study search.
- Results and videos appear only when the **channel name** contains one of your keywords (case-insensitive). Anything whose channel you cannot read is hidden.
- Shorts, subscriptions, playlists and channel pages are closed.
- Matching is by substring: `pw` also matches `Upwork`. Use longer keywords where that matters. *Settings → YouTube* has a checker.

### WhatsApp Web in Productive Mode

- Only chats on your list are shown. Names must match exactly as WhatsApp shows them (letter case and extra spaces are ignored).
- An open conversation that is not on your list is covered.
- If WhatsApp changes its layout, the chat list is hidden and the time is **not** credited as productive until it works again.

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

| Costs the unlock cost | Free |
| --- | --- |
| Adding a site to Productive or Half-productive; removing a half-productive or unproductive site; moving a site to a more permissive list | Adding a site to Unproductive; removing a productive site; moving a site to a stricter list |
| Raising the earn ratio; lowering the unlock cost (charged at the current price) | Lowering the earn ratio; raising the unlock cost |
| Adding a YouTube keyword or a WhatsApp chat; adding a task; raising a task reward | Removing a keyword or chat; deleting a task |

If the balance cannot pay, the change is refused and nothing changes. Changes are refused while you are in debt.

EarnTime also redirects `chrome://extensions` and `chrome://settings/extensions` tabs to its block page.

> Chrome prevents extensions from completely controlling privileged `chrome://` pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.

See `docs/KNOWN_LIMITATIONS.md` section 1 for the API this uses, what has been tested, and which bypasses remain.

## Audit

*Settings → Protection → Download JSON* exports settings, lists, daily totals and the full ledger (every credit, charge, debt, rule change and interruption) as a read-only file. It contains **hosts only**, never page addresses.

## Troubleshooting

- **"Setup isn't finished"**: open the popup and choose *Finish setup*.
- **Time is not counting**: check that the EarnTime tab is the active tab in the focused window, and that you are not in an incognito window without access.
- **YouTube shows a blank page**: that is Productive Mode's study search. Pick a keyword or search for a topic.
- **"Filter unavailable"**: the site changed its layout. Time on that page is counted as unproductive until it loads correctly. Reload the page.
- **Your balance seems wrong after a computer sleep or a browser restart**: EarnTime estimates the gap from history. The audit export shows what it used.
