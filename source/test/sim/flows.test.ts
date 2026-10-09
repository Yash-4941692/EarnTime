import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXT_ORIGIN } from './fakeBrowser';
import {
  BLOCK_EXHAUSTED,
  BLOCK_EXTENSIONS,
  MIN,
  SEC,
  balanceMin,
  command,
  confirmedCommand,
  debtMin,
  installAndSetup,
  newBrowser,
  openedWindowWithTab,
  setupPayload,
} from './helpers';

const near = (actual: number, expected: number, tolerance: number, label: string) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);

test('installing creates state with no balance until setup is complete', async () => {
  const b = newBrowser();
  await b.installExtension('install');
  const s = b.storedState();
  assert.equal(s.setupDone, false);
  assert.equal(s.balanceMs, 0);
  assert.equal(b.badge.text, '');
});

test('setup applies the ratio and starting balance once; a second setup is refused', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 15 });
  assert.equal(balanceMin(b), 15);
  const again = await command(b, { type: 'setup.complete', payload: setupPayload({ initialBalanceMin: 500 }) });
  assert.equal(again.ok, false);
  assert.equal(balanceMin(b), 15);
  assert.equal(b.badge.text, '15m');
});

test('one productive hour earns exactly five minutes (60:5 rule)', async () => {
  const b = newBrowser();
  await installAndSetup(b);
  await b.openWindow({ focused: true });
  await b.openTab('https://www.khanacademy.org/math', { active: true });
  await b.runFor(60 * MIN);
  assert.equal(b.storedState().balanceMs, 5 * MIN);
  const day = b.storedState().days['2026-10-08'];
  assert.equal(day.prodMs, 60 * MIN);
  assert.equal(day.earnedMs, 5 * MIN);
});

test('unproductive time spends the balance, then Instagram is blocked everywhere', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const { tabId } = await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(10 * MIN);
  assert.equal(balanceMin(b), 0);
  assert.equal(b.storedState().debtMs, 0, 'live spending never creates debt');
  assert.equal(b.tabUrl(tabId), BLOCK_EXHAUSTED, 'open Instagram tab is sent to the block page');
  assert.ok(b.notifications.some((n) => n.title === 'Screen time used up'));
  assert.equal(b.badge.text, '0m');

  // A new Instagram tab is stopped by the declarativeNetRequest rule. DNR redirects to the bare
  // page path; the block page reads the reason from state, so no query string is needed.
  const newTab = await b.openTab('https://instagram.com/explore', { active: true });
  assert.equal(b.tabUrl(newTab), `${EXT_ORIGIN}/block.html`);

  // Neutral sites stay reachable while the balance is empty.
  const neutral = await b.openTab('https://example.org/', { active: true });
  assert.equal(b.tabUrl(neutral), 'https://example.org/');
});

test('background tabs and unfocused, minimized windows are not counted', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  const { windowId } = await openedWindowWithTab(b, 'https://www.khanacademy.org/');
  await b.openTab('https://www.instagram.com/', { windowId, active: false });
  await b.runFor(5 * MIN);
  const afterStudy = b.storedState();
  assert.equal(afterStudy.days['2026-10-08'].unprodMs ?? 0, 0, 'background Instagram tab is not charged');
  near(afterStudy.balanceMs, 30 * MIN + 25 * SEC, 1, 'five productive minutes credit 25 s');

  // A second window with Instagram focused in the background of Chrome.
  const other = await b.openWindow({ focused: false });
  await b.openTab('https://www.instagram.com/', { windowId: other, active: true });
  await b.runFor(3 * MIN);
  assert.equal(b.storedState().days['2026-10-08'].unprodMs ?? 0, 0, 'unfocused window is not charged');

  // Minimizing the study window leaves no focused window at all.
  await b.minimizeWindow(windowId);
  await b.runFor(3 * MIN);
  assert.equal(b.storedState().days['2026-10-08'].prodMs, 8 * MIN, 'nothing counted while minimized');
});

test('switching tabs changes what is counted', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  const { windowId, tabId: study } = await openedWindowWithTab(b, 'https://www.khanacademy.org/');
  const social = await b.openTab('https://www.instagram.com/', { windowId, active: false });
  await b.activateTab(social);
  await b.runFor(2 * MIN);
  assert.equal(b.storedState().days['2026-10-08'].unprodMs, 2 * MIN);
  await b.activateTab(study);
  await b.runFor(MIN);
  assert.equal(b.storedState().days['2026-10-08'].prodMs, MIN);
});

test('idle time is not charged; audible media keeps counting while the user is away', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  const tab = await b.openTab('https://www.instagram.com/', { active: true });
  await b.runFor(2 * MIN);
  b.stopInput();
  await b.runFor(5 * MIN);
  assert.equal(balanceMin(b), 28, 'nothing charged after the idle transition');

  await b.setAudible(tab, true);
  await b.runFor(2 * MIN);
  assert.equal(balanceMin(b), 26, 'audible video is watched, so it counts');

  await b.setAudible(tab, false);
  await b.input();
  await b.runFor(MIN);
  assert.equal(balanceMin(b), 25, 'back at the keyboard, counting resumes');
});

test('a service-worker restart mid-session neither loses nor double-counts time', async () => {
  const b = newBrowser();
  await installAndSetup(b);
  await b.openWindow({ focused: true });
  await b.openTab('https://www.khanacademy.org/', { active: true });
  await b.runFor(10 * MIN);
  b.suspendWorker(); // Chrome drops the worker's memory; the next alarm wakes it.
  await b.runFor(10 * MIN);
  assert.equal(b.storedState().balanceMs, 100 * SEC, '20 productive minutes at 60:5 earn 100 s');
  assert.equal(b.storedState().days['2026-10-08'].prodMs, 20 * MIN);
  assert.ok(b.workerRestarts >= 2);
});

test('a browser restart resets sessions and does not charge the time the browser was closed', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(MIN);
  assert.equal(balanceMin(b), 9);
  await b.restartBrowser();
  await b.runFor(10 * MIN); // browser closed or idle with no windows
  assert.equal(balanceMin(b), 9, 'no window open means nothing is charged');
  assert.equal(b.storedState().sessions && Object.keys(b.storedState().sessions).length, 0);
  assert.ok(b.storedState().ledger.some((e: { kind: string }) => e.kind === 'startup'));
});

test('disabling EarnTime for 40 minutes and re-enabling it creates debt from history (balance 10, usage ~40)', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const { tabId } = await openedWindowWithTab(b, 'https://www.instagram.com/p/start');
  await b.runFor(30 * SEC); // a checkpoint is recorded before the user disables the extension

  b.disableExtension();
  for (let i = 0; i < 4; i++) {
    await b.navigate(tabId, `https://www.instagram.com/p/${i}`);
    await b.runFor(10 * MIN);
  }
  await b.enableExtension();
  await b.runFor(2 * MIN);

  const s = b.storedState();
  assert.equal(s.balanceMs, 0, 'balance drained by the interruption');
  near(s.debtMs / MIN, 30, 1.5, 'debt is roughly usage (40) minus balance (10)');
  assert.ok(s.lastReconcile, 'reconciliation summary is stored');
  assert.ok(s.lastReconcile.chargedMs >= 39 * MIN);
  assert.ok(b.notifications.some((n) => n.title === 'Debt started'));
  assert.equal(b.tabUrl(tabId).startsWith(`${EXT_ORIGIN}/block.html?reason=debt`), true, 'open Instagram tab is blocked in debt');
  assert.ok(b.dnr.size >= 2, 'debt rules are installed');
});

test('in debt only productive sites open; studying repays the debt and normal rules return', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const { tabId } = await openedWindowWithTab(b, 'https://www.instagram.com/p/start');
  await b.runFor(30 * SEC);
  b.disableExtension();
  for (let i = 0; i < 4; i++) {
    await b.navigate(tabId, `https://www.instagram.com/p/${i}`);
    await b.runFor(10 * MIN);
  }
  await b.enableExtension();
  await b.runFor(2 * MIN);
  assert.ok(debtMin(b) > 25);

  const blocked = await b.openTab('https://example.org/', { active: true });
  assert.equal(b.tabUrl(blocked), `${EXT_ORIGIN}/block.html`, 'neutral site blocked in debt');
  const study = await b.openTab('https://www.khanacademy.org/', { active: true });
  assert.equal(b.tabUrl(study), 'https://www.khanacademy.org/', 'productive site open in debt');

  // Repay: at 60:5 each productive hour repays 5 minutes, so about 30 minutes of debt needs 6 hours; use 7 for margin.
  await b.runFor(7 * 60 * MIN);
  const after = b.storedState();
  assert.equal(after.debtMs, 0, 'debt cleared');
  assert.ok(b.notifications.some((n) => n.title === 'Debt cleared'));
  assert.equal(b.dnr.size, 0, 'no blocking rules once there is balance and no debt');
});

test('chrome://extensions is redirected to the block page (guard), including typed navigation', async () => {
  const b = newBrowser();
  await installAndSetup(b);
  const created = await b.openTab('chrome://extensions/', { active: true });
  assert.equal(b.tabUrl(created), BLOCK_EXTENSIONS);
  await b.navigate(created, 'chrome://extensions/?id=abcdefghijklmnop');
  assert.equal(b.tabUrl(created), BLOCK_EXTENSIONS);
  const settingsRoute = await b.openTab('chrome://settings/extensions', { active: true });
  assert.equal(b.tabUrl(settingsRoute), BLOCK_EXTENSIONS, 'chrome://settings/extensions is redirected too');
  await b.navigate(created, 'chrome://settings/privacy');
  assert.equal(b.tabUrl(created), 'chrome://settings/privacy', 'other chrome pages are not affected');
  assert.ok(b.storedState().ledger.some((e: { kind: string }) => e.kind === 'guard'));
});

test('YouTube Productive Mode: a mode must be chosen, earning needs a healthy filter', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 20 });
  const { tabId } = await openedWindowWithTab(b, 'https://www.youtube.com/results?search_query=jee');
  const url = 'https://www.youtube.com/results?search_query=jee';

  const init = await b.sendFromTab(tabId, { type: 'page.init', url });
  assert.equal(init.directive.kind, 'choose');
  assert.equal(init.directive.canUnproductive, true);

  const refused = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' }).catch((e: Error) => e);
  assert.equal(refused.ok, true, 'Unproductive Mode is available while the balance is positive');

  const chosen = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'productive' });
  assert.equal(chosen.ok, true);
  assert.equal(chosen.directive.kind, 'active');
  assert.equal(chosen.directive.filter, 'youtube');
  assert.ok(chosen.directive.youtubeKeywords.includes('JEE'));

  // Healthy filter for 10 minutes: productive credit.
  for (let i = 0; i < 20; i++) {
    await b.sendFromTab(tabId, { type: 'page.health', ok: true }, url);
    await b.runFor(30 * SEC);
  }
  near(b.storedState().balanceMs, 20 * MIN + 50 * SEC, 2 * SEC, 'ten healthy productive minutes credit 50 s');

  // Filter stops reporting: after the freshness window the time counts as unproductive.
  const before = b.storedState().balanceMs;
  await b.runFor(3 * MIN);
  assert.ok(b.storedState().balanceMs < before, 'failing filter charges the balance');
  assert.ok(b.storedState().days['2026-10-08'].halfUnprodMs > 0);
});

test('YouTube intentional covers do not earn or charge, while a broken filter still charges', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const url = 'https://www.youtube.com/watch?v=non-study';
  const { tabId } = await openedWindowWithTab(b, url);
  const chosen = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'productive' });
  assert.equal(chosen.ok, true);

  for (let i = 0; i < 4; i++) {
    await b.sendFromTab(tabId, { type: 'page.health', ok: true, detail: 'covered' }, url);
    await b.runFor(30 * SEC);
  }
  const covered = b.storedState();
  assert.equal(covered.balanceMs, 10 * MIN, 'intentional cover neither earns nor spends screen time');
  // Covered time is not billed, but the user was still looking at YouTube, so the day's screen-time
  // breakdown records it. Billing totals stay at zero.
  const coveredDay = covered.days['2026-10-08'];
  assert.equal(coveredDay.prodMs + coveredDay.halfProdMs + coveredDay.halfUnprodMs + coveredDay.unprodMs, 0, 'covered time does not create accounting totals');
  assert.equal(coveredDay.earnedMs + coveredDay.usedMs, 0);
  assert.equal(coveredDay.screenMs, 2 * MIN, 'covered time is recorded as screen time');
  assert.deepEqual(coveredDay.hosts, { 'www.youtube.com': 2 * MIN });
  assert.equal(coveredDay.estimatedScreenMs, 0, 'observed screen time is exact, not estimated');
  assert.equal(covered.live?.why, 'filter-covered');

  await b.sendFromTab(tabId, { type: 'page.health', ok: false }, url);
  await b.runFor(30 * SEC);
  assert.ok(b.storedState().balanceMs < 10 * MIN, 'a genuinely unhealthy filter still fails closed as unproductive');
  assert.ok(b.storedState().days['2026-10-08'].halfUnprodMs > 0);
});

test('choosing Unproductive Mode on a half-productive site charges the full time', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const url = 'https://www.youtube.com/watch?v=abc';
  const { tabId } = await openedWindowWithTab(b, url);
  const reply = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' });
  assert.equal(reply.ok, true);
  assert.equal(reply.directive.kind, 'active');
  if (reply.directive.kind === 'active') {
    assert.equal('grayscale' in reply.directive, false, 'Unproductive Mode applies no greyscale');
  }
  await b.runFor(2 * MIN);
  assert.equal(balanceMin(b), 8);
});

test('per-second ui.tick checkpoints charge exactly one second per second — never two', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const url = 'https://instagram.com/';
  const { tabId } = await openedWindowWithTab(b, url);
  await b.sendFromTab(tabId, { type: 'ui.tick' });
  const before = b.storedState().balanceMs;
  // Thirty seconds of unproductive use, checkpointed once per second the way the popup does.
  for (let i = 0; i < 30; i++) {
    await b.sendFromTab(tabId, { type: 'ui.tick' });
    await b.runFor(SEC);
  }
  await b.sendFromTab(tabId, { type: 'ui.tick' });
  const charged = before - b.storedState().balanceMs;
  assert.ok(
    charged >= 29 * SEC && charged <= 31 * SEC,
    `charged ${charged}ms for 30 seconds of use — one second in, one second out (a double charge would be ~60000)`,
  );
});

test('leaving a half-productive site means choosing a mode again on return', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const youtube = 'https://www.youtube.com/';
  const { tabId } = await openedWindowWithTab(b, youtube);
  await b.sendFromTab(tabId, { type: 'page.choose', url: youtube, mode: 'productive' });
  await b.navigate(tabId, 'https://example.org/');
  await b.navigate(tabId, youtube);
  const init = await b.sendFromTab(tabId, { type: 'page.init', url: youtube });
  assert.equal(init.directive.kind, 'choose');
});

test('an Unproductive Mode session ends when the balance runs out; the choice is then productive-only', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 1 });
  const url = 'https://www.youtube.com/';
  const { tabId } = await openedWindowWithTab(b, url);
  await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' });
  await b.runFor(2 * MIN);
  assert.equal(balanceMin(b), 0);
  assert.equal(b.tabUrl(tabId), BLOCK_EXHAUSTED, 'the YouTube tab is sent to the block page');

  await b.navigate(tabId, url);
  const init = await b.sendFromTab(tabId, { type: 'page.init', url });
  assert.equal(init.directive.kind, 'choose');
  assert.equal(init.directive.canUnproductive, false);
  const refused = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' });
  assert.equal(refused.ok, false);
});

test('a recurring task pays once per day; un-ticking and re-ticking do not pay twice', async () => {
  const b = newBrowser();
  await installAndSetup(b, { tasks: [{ title: 'Revise formulas', rewardMin: 5, recurring: true }] });
  const id = b.storedState().tasks[0].id;
  await command(b, { type: 'task.toggle', id });
  assert.equal(balanceMin(b), 5);
  await command(b, { type: 'task.toggle', id });
  await command(b, { type: 'task.toggle', id });
  assert.equal(balanceMin(b), 5, 'no second reward the same day');
  await b.runFor(24 * 60 * MIN);
  await command(b, { type: 'task.toggle', id });
  assert.equal(balanceMin(b), 10, 'a new day pays again');
});

test('legacy storage is migrated on first start and legacy keys (including the nuclear password) are removed', async () => {
  const b = newBrowser();
  b.storage.wallet = { balance: 12.5, todayEarned: 0 };
  b.storage.settings = { studyMinutes: 25, rewardMinutes: 1, dailyGoalHours: 1 };
  b.storage.categories = { productive: ['khanacademy.org'], halfUnproductive: ['youtube.com'], unproductive: ['instagram.com'] };
  b.storage.nuclear = { isActive: false, password: 'hunter2' };
  b.storage.streaks = { current: 3 };
  await b.installExtension('update');
  const s = b.storedState();
  assert.equal(s.balanceMs, 750_000);
  assert.equal(s.settings.earnFromMin, 25);
  assert.equal(s.settings.earnToMin, 1);
  assert.deepEqual(s.rules.unproductive, ['instagram.com']);
  assert.equal(s.setupDone, true);
  assert.deepEqual(Object.keys(b.storage), ['state'], 'only the new state key remains');
  assert.equal(JSON.stringify(b.storage).includes('hunter2'), false);
});

test('a backwards system-clock change never erases usage; the monotonic clock still charges', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(2 * MIN);
  assert.equal(balanceMin(b), 8);
  b.shiftWallClock(-60 * MIN);
  await b.runFor(2 * MIN);
  assert.ok(balanceMin(b) <= 6 + 0.01, `usage continues after the clock change (got ${balanceMin(b)})`);
  assert.ok(balanceMin(b) >= 5.9, 'no more than the real elapsed time is charged');
  assert.ok(b.storedState().ledger.some((e: { kind: string }) => e.kind === 'clock'));
});

test('a forward clock jump is treated as an interruption and reconciled, never as free time', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(MIN);
  b.shiftWallClock(3 * 60 * MIN);
  await b.runFor(MIN);
  const s = b.storedState();
  assert.ok(s.lastReconcile, 'reconciled');
  assert.ok(s.balanceMs < 30 * MIN - MIN, 'time is charged rather than skipped');
});

test('incognito windows are invisible to EarnTime unless the user allows incognito', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const incognito = await b.openWindow({ focused: true, incognito: true });
  await b.openTab('https://www.instagram.com/', { windowId: incognito, active: true, incognito: true });
  await b.runFor(2 * MIN);
  assert.equal(balanceMin(b), 10, 'not tracked while incognito access is off');
  b.incognitoAllowed = true;
  await b.runFor(2 * MIN);
  // No Chrome event announces the permission change, so the first 30-second interval after it is
  // still charged under the old role (the user is favoured by at most one checkpoint interval).
  assert.equal(balanceMin(b), 8.5, 'tracked once the user has allowed incognito (one interval of lag)');
});

test('the audit export lists hosts and minutes but never page URLs', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  await openedWindowWithTab(b, 'https://www.instagram.com/p/secret-path-123');
  await b.runFor(2 * MIN);
  const reply = await b.sendFromExtensionPage({ type: 'ui.export' });
  assert.equal(reply.ok, true);
  const text = JSON.stringify(reply.data);
  assert.ok(text.includes('instagram.com'));
  assert.equal(text.includes('secret-path-123'), false);
  assert.equal(text.includes('https://'), false);
});

test('listing a site is free on every list; lifting a restriction costs live balance', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  let r = await command(b, { type: 'site.add', list: 'productive', host: 'coursera.org' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(balanceMin(b), 30, 'adding a productive site is free');
  r = await command(b, { type: 'site.add', list: 'unproductive', host: 'tiktok.com' });
  assert.equal(r.ok, true);
  assert.equal(balanceMin(b), 30, 'adding an unproductive site is free');
  r = await command(b, { type: 'youtube.add', keyword: 'Organic Chemistry' });
  assert.equal(r.ok, true);
  assert.equal(r.ok, true);
  assert.equal(balanceMin(b), 30, 'keywords and chats are free to add');
  // These two lift a restriction, so the UI quotes them first and charges only once accepted.
  r = await confirmedCommand(b, { type: 'site.move', host: 'tiktok.com', to: 'productive' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(balanceMin(b), 20, 'making an unproductive site productive costs the unlock cost');
  r = await confirmedCommand(b, { type: 'site.remove', host: 'instagram.com' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(balanceMin(b), 10, 'dropping an unproductive site lifts a block, so it costs');
});

test('a loosening change is quoted to the UI and charged only once the quote is accepted', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });

  const quote = await command(b, { type: 'site.remove', host: 'instagram.com' });
  assert.equal(quote.ok, false);
  assert.equal(quote.error.code, 'confirm');
  assert.equal(quote.error.quote.minutes, 10, 'the quote names the price');
  assert.equal(quote.error.quote.balanceMin, 30, 'the quote names the balance');
  assert.equal(
    quote.error.message,
    'Removing instagram.com from unproductive sites costs 10 min of your screen-time balance (you have 30 min).',
  );
  assert.equal(balanceMin(b), 30, 'quoting charged nothing');
  assert.ok(b.storedState().rules.unproductive.includes('instagram.com'), 'quoting left the site listed');

  // Asking again without accepting is the same as declining: still nothing spent.
  const again = await command(b, { type: 'site.remove', host: 'instagram.com' });
  assert.equal(again.error.code, 'confirm');
  assert.equal(balanceMin(b), 30);

  const accepted = await command(b, { type: 'site.remove', host: 'instagram.com', confirm: true });
  assert.equal(accepted.ok, true, JSON.stringify(accepted));
  assert.equal(balanceMin(b), 20, 'only the accepted call paid');
  assert.equal(b.storedState().rules.unproductive.includes('instagram.com'), false);
});

test('a changed setting that the balance cannot pay is refused without side effects', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 4 });
  const r = await command(b, { type: 'site.move', host: 'instagram.com', to: 'productive' });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'insufficient');
  assert.equal(balanceMin(b), 4);
  assert.ok(b.storedState().rules.unproductive.includes('instagram.com'));
});

test('an open study tab that is replaced keeps its YouTube mode', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const url = 'https://www.youtube.com/';
  const { tabId } = await openedWindowWithTab(b, url);
  await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' });
  const replacement = 9001;
  await b.replaceTab(tabId, replacement);
  const sessions = b.storedState().sessions;
  assert.ok(sessions[String(replacement)], 'session moved to the replacement tab');
  assert.equal(sessions[String(tabId)], undefined);
});

test('workers started after time passes continue cleanly (no duplicate DNR rules)', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 0 });
  await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(MIN);
  b.suspendWorker();
  await b.runFor(MIN);
  b.suspendWorker();
  await b.runFor(MIN);
  assert.ok(b.dnr.size <= 1);
  assert.equal(balanceMin(b), 0);
});

test('closing a half-productive tab ends its mode session, so the next visit asks again', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const url = 'https://www.youtube.com/';
  const { tabId } = await openedWindowWithTab(b, url);
  await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'productive' });
  assert.ok(b.storedState().sessions[String(tabId)], 'session exists after choosing a mode');
  await b.closeTab(tabId);
  assert.equal(b.storedState().sessions[String(tabId)], undefined, 'session removed with the tab');
  const again = await b.openTab(url, { active: true });
  const init = await b.sendFromTab(again, { type: 'page.init', url });
  assert.equal(init.directive.kind, 'choose', 'a new tab on the same site asks for a mode');
});

test('a fresh install opens the setup wizard; updates do not reopen it', async () => {
  const b = newBrowser();
  await b.installExtension('install');
  const setupTabs = () => [...b.tabs.values()].filter((t) => t.url === `${EXT_ORIGIN}/setup.html`);
  assert.equal(setupTabs().length, 1, 'setup opened on install');
  await command(b, { type: 'setup.complete', payload: setupPayload({ initialBalanceMin: 5 }) });
  await b.installExtension('update');
  assert.equal(setupTabs().length, 1, 'an update after setup does not open setup again');
});

// ------------------------------------------------------------------ setup

test('an unfinished setup is offered again on every browser start', async () => {
  const b = newBrowser();
  await b.installExtension('install');
  const setupTabs = () => [...b.tabs.values()].filter((t) => t.url === `${EXT_ORIGIN}/setup.html`);
  assert.equal(setupTabs().length, 1, 'setup opened on install');

  await b.closeTab(setupTabs()[0].id as number);
  assert.equal(setupTabs().length, 0, 'the user closed the wizard without finishing');

  await b.restartBrowser();
  assert.equal(setupTabs().length, 1, 'the next browser start reopens it');
  await b.restartBrowser();
  assert.equal(setupTabs().length, 1, 'one setup tab per browser start, never two');

  await command(b, { type: 'setup.complete', payload: setupPayload({ initialBalanceMin: 5 }) });
  await b.restartBrowser();
  assert.equal(setupTabs().length, 0, 'a finished setup is never reopened');
});

test('an update that finds setup unfinished reopens the wizard instead of skipping it', async () => {
  const b = newBrowser();
  await b.installExtension('install');
  const setupTabs = () => [...b.tabs.values()].filter((t) => t.url === `${EXT_ORIGIN}/setup.html`);
  await b.closeTab(setupTabs()[0].id as number);
  await b.installExtension('update');
  assert.equal(setupTabs().length, 1, 'reloading an unpacked extension reports "update" and must not strand the user');
});

// ---------------------------------------------------------------------------
// Screen time while a page loads, and the analytics that come out of it
// ---------------------------------------------------------------------------

test('the worker publishes its verdict for a half-productive tab, so the next load is judged while loading', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 20 });
  const url = 'https://www.youtube.com/watch?v=abc';
  const { tabId } = await openedWindowWithTab(b, url);

  // The verdict exists before the page has asked anything: it is published for every open
  // half-productive tab, which is what lets a content script decide while the page loads instead of
  // waiting for a worker that may still be starting.
  await b.settle();
  let published = b.gateCache()[String(tabId)];
  assert.equal(published.directive.kind, 'choose', 'a first visit is published as "choose a mode"');
  assert.equal(published.url, url);
  assert.equal(published.directive.entry, 'youtube.com');

  const init = await b.sendFromTab(tabId, { type: 'page.init', url });
  assert.equal(init.ok, true);
  assert.equal(init.tabId, tabId, 'the page is told which tab it is, so it can find its own session');
  assert.equal(init.directive.kind, 'choose');

  const chosen = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' });
  assert.equal(chosen.ok, true);
  published = b.gateCache()[String(tabId)];
  assert.equal(published.directive.kind, 'active', 'the published verdict follows the choice');
  assert.equal(published.directive.mode, 'unproductive');

  // Leaving the site invalidates the session, and the published verdict goes back to the chooser, so
  // a return visit is asked again — while it loads, not after.
  await b.navigate(tabId, 'https://www.instagram.com/');
  await b.navigate(tabId, url);
  published = b.gateCache()[String(tabId)];
  assert.equal(published.directive.kind, 'choose', 'returning to the site asks again');

  // A site that is not half-productive gets no verdict published at all.
  const studyTab = await b.openTab('https://www.khanacademy.org/', { active: true });
  await b.settle();
  assert.equal(b.gateCache()[String(studyTab)], undefined);
});

test('screen time per site is recorded for the whole foreground day, not only for billed time', async () => {
  const b = newBrowser();
  // A starting balance the unproductive stretch can actually be charged to: without it the tab would
  // be redirected to the block page halfway through and the day would end early.
  await installAndSetup(b, { initialBalanceMin: 10 });
  const key = '2026-10-08';
  // Each navigation loses the 15-second idle-detection tail, exactly as billing does: the user was
  // already inactive when Chrome reported the change, so that quiet stretch is nobody's.
  const TAIL = 15 * SEC;

  const { tabId } = await openedWindowWithTab(b, 'https://www.khanacademy.org/math');
  await b.runFor(30 * MIN);
  await b.navigate(tabId, 'https://example.org/news');
  await b.runFor(10 * MIN);
  await b.navigate(tabId, 'https://www.instagram.com/');
  await b.runFor(5 * MIN);

  const day = b.storedState().days[key];
  assert.equal(b.tabUrl(tabId), 'https://www.instagram.com/', 'the balance covered the whole stretch');
  assert.equal(day.prodMs, 30 * MIN, 'study time is billed as before');
  near(day.unprodMs / MIN, 5, 0.3, 'unproductive time is billed as before');
  near(day.screenMs / MIN, 45 - TAIL / MIN, 0.6, 'screen time covers every site that was in front of the user');
  assert.equal(day.estimatedScreenMs, 0, 'observed screen time is exact');
  // Listed sites are recorded under the list entry that matched them (so subdomains group together);
  // a site on no list is recorded under its own hostname.
  near(day.hosts['khanacademy.org'] / MIN, 30, 0.3, 'study time goes to the study site');
  near(day.hosts['example.org'] / MIN, 10 - TAIL / MIN, 0.3, 'neutral time goes to the neutral site');
  near(day.hosts['instagram.com'] / MIN, 5, 0.3, 'distracting time goes to the distracting site');
  assert.equal(Object.keys(day.hosts).length, 3);
  // A neutral site is measured but never billed: 10 minutes of it cost nothing.
  near(
    day.screenMs / MIN - (day.prodMs + day.unprodMs + day.halfProdMs + day.halfUnprodMs) / MIN,
    10 - TAIL / MIN,
    0.3,
    'the neutral site is measured but never billed',
  );
  assert.equal(
    b.storedState().balanceMs,
    10 * MIN + day.earnedMs - day.usedMs,
    'the balance moved only by billing: ten neutral minutes cost nothing',
  );
});

test('time the user was away is not screen time', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(5 * MIN);
  b.stopInput();
  await b.runFor(10 * MIN); // idle: not billed, and not screen time either
  await b.input();
  await b.runFor(1 * MIN);

  const day = b.storedState().days['2026-10-08'];
  near(day.screenMs / MIN, 6, 0.4, 'the idle stretch is missing from screen time');
  assert.equal(day.hosts['instagram.com'], day.screenMs, 'all of it attributed to the site that was open');
  assert.equal(day.screenMs, day.unprodMs, 'and screen time equals billed time when nothing else was open');
});

test('time reconstructed from history after an interruption is screen time, marked as estimated', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  const { tabId } = await openedWindowWithTab(b, 'https://www.instagram.com/p/start');
  await b.runFor(30 * SEC);

  b.disableExtension();
  for (let i = 0; i < 3; i++) {
    await b.navigate(tabId, `https://www.instagram.com/p/${i}`);
    await b.runFor(10 * MIN);
  }
  await b.enableExtension();
  await b.runFor(2 * MIN);

  const day = b.storedState().days['2026-10-08'];
  assert.ok(day.estimatedScreenMs >= 25 * MIN, 'the gap was reconstructed from history');
  assert.ok(day.screenMs >= day.estimatedScreenMs);
  // A listed site is attributed to the list entry that matched it, live and reconstructed alike, so
  // its subdomains group into one row of the breakdown.
  assert.ok(day.hosts['instagram.com'] >= day.estimatedScreenMs, 'and attributed to the site it happened on');
});

test('without screen-time access a gap cannot be reconstructed, and the numbers say so', async () => {
  const b = newBrowser();
  b.revokeScreenTime();
  await installAndSetup(b, { initialBalanceMin: 30, screenTimeAccess: false });
  assert.equal(b.storedState().historyGranted, false, 'screen-time access was declined at setup');
  const { tabId } = await openedWindowWithTab(b, 'https://www.instagram.com/p/start');
  await b.runFor(30 * SEC);

  b.disableExtension();
  for (let i = 0; i < 3; i++) {
    await b.navigate(tabId, `https://www.instagram.com/p/${i}`);
    await b.runFor(10 * MIN);
  }
  await b.enableExtension();
  await b.runFor(2 * MIN);

  const s = b.storedState();
  const day = s.days['2026-10-08'];
  assert.equal(s.lastReconcile?.visits ?? 0, 0, 'reconciliation had no visits to work from');
  // The gap is still charged, but only as one unobserved stretch bounded by the continuation caps,
  // never as the thirty minutes of browsing that only history could have shown.
  assert.ok(day.estimatedScreenMs <= 15 * MIN, 'the estimate stops at the caps instead of covering the gap');
  assert.ok(day.screenMs < 20 * MIN, 'so the day is not credited with browsing nobody observed');
  assert.ok(s.balanceMs + s.debtMs > 30 * MIN - 20 * MIN, 'and the unseen browsing was not billed either');
});

test('screen-time access can be granted and removed, and each change is written to the ledger', async () => {
  const b = newBrowser();
  b.revokeScreenTime();
  await installAndSetup(b, { screenTimeAccess: false });
  assert.equal(b.storedState().historyGranted, false);

  b.grantScreenTime(); // what Chrome does when the user accepts the prompt
  const granted = await b.sendFromExtensionPage({ type: 'ui.screenTimeAccess', grant: true });
  assert.equal(granted.ok, true);
  assert.equal(granted.data.granted, true);
  assert.equal(b.storedState().historyGranted, true);
  assert.ok(b.storedState().ledger.some((e: { note: string }) => e.note === 'Screen-time access granted'));

  await b.sendFromExtensionPage({ type: 'ui.screenTimeAccess', grant: false });
  await b.settle();
  assert.equal(b.storedState().historyGranted, false);
  assert.equal(b.grantedPermissions.has('history'), false, 'Chrome gave the permission up too');
  assert.ok(b.storedState().ledger.some((e: { note: string }) => e.note === 'Screen-time access removed'));
});

test('a revoked permission is noticed on the next worker start, without the user saying anything', async () => {
  const b = newBrowser();
  await installAndSetup(b);
  assert.equal(b.storedState().historyGranted, true);

  // The user removes the permission from chrome://extensions: no event reaches EarnTime.
  b.revokeScreenTime();
  await b.restartWorker();
  assert.equal(b.storedState().historyGranted, false, 'the recorded access follows Chrome');
});

test('setup records the screen-time access answer, and the worker corrects it against Chrome', async () => {
  const declined = newBrowser();
  declined.revokeScreenTime();
  await installAndSetup(declined, { screenTimeAccess: false });
  assert.equal(declined.storedState().historyGranted, false);

  // Claiming access that Chrome did not grant does not survive the first worker start.
  const liar = newBrowser();
  liar.revokeScreenTime();
  await installAndSetup(liar, { screenTimeAccess: true });
  assert.equal(liar.storedState().historyGranted, true, 'recorded as asked…');
  await liar.restartWorker();
  await liar.openWindow({ focused: true });
  await liar.settle();
  assert.equal(liar.storedState().historyGranted, false, '…and corrected to what Chrome really granted');
});

test('the popup keeps the timer running in front of the user instead of freezing', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const { windowId } = await openedWindowWithTab(b, 'https://www.instagram.com/');
  await b.runFor(60 * SEC);
  const before = b.storedState().balanceMs;
  assert.equal(b.storedState().live?.k, 'unproductive');

  // The popup takes OS focus. Chrome fires no event for that, so the worker only finds out at its
  // next periodic checkpoint — and what it sees is "no focused window".
  b.openPopup();
  await b.runFor(35 * SEC);
  const frozen = b.storedState();
  assert.equal(frozen.live?.why, 'background', 'with no heartbeat the worker treats it as "Chrome not focused"');
  const frozenCharge = before - frozen.balanceMs;
  assert.ok(frozenCharge >= 30 * SEC, 'and the whole stretch is charged at once, whenever that checkpoint happens');

  // The popup beats once a second, which is enough to keep both the counting and the display alive:
  // the numbers move every second instead of jumping once every thirty.
  const beat = async () => {
    await b.sendFromExtensionPage({ type: 'ui.tick' });
    await b.runFor(1 * SEC);
  };
  const beforeBeats = frozen.balanceMs;
  for (let i = 0; i < 12; i++) await beat();

  const during = b.storedState();
  assert.equal(during.live?.k, 'unproductive', 'the site behind the popup is still what is being used');
  assert.equal(during.live?.why, null, 'and it is no longer reported as "Chrome not focused"');
  near((beforeBeats - during.balanceMs) / SEC, 12, 2, 'twelve beats charged twelve seconds, one per second');
  assert.ok(during.days['2026-10-08'].hosts['instagram.com'] >= 60 * SEC, 'and it all went to the site that was open');

  // Closing the popup stops the heartbeat. The window that was open while EarnTime could not see it
  // is charged once, at the first checkpoint after the heartbeat expires, and then nothing more
  // moves: no focused window, no counting.
  await b.runFor(40 * SEC);
  const closed = b.storedState();
  assert.equal(closed.live?.why, 'background');
  const afterClose = closed.balanceMs;
  await b.runFor(60 * SEC);
  assert.equal(b.storedState().balanceMs, afterClose, 'a closed popup charges nothing');

  b.closePopup(windowId);
  await b.runFor(40 * SEC);
  assert.equal(b.storedState().live?.k, 'unproductive', 'and the page counts again once it is in front of the user');
});
