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

test('choosing Unproductive Mode on a half-productive site charges the full time', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 10 });
  const url = 'https://www.youtube.com/watch?v=abc';
  const { tabId } = await openedWindowWithTab(b, url);
  const reply = await b.sendFromTab(tabId, { type: 'page.choose', url, mode: 'unproductive' });
  assert.equal(reply.ok, true);
  assert.equal(reply.directive.grayscale, true);
  await b.runFor(2 * MIN);
  assert.equal(balanceMin(b), 8);
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

test('a rule change that loosens the rules costs live balance; tightening is free', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 30 });
  let r = await command(b, { type: 'site.add', list: 'productive', host: 'coursera.org' });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(balanceMin(b), 20, 'adding a productive site costs the 10-minute unlock cost');
  r = await command(b, { type: 'site.add', list: 'unproductive', host: 'tiktok.com' });
  assert.equal(r.ok, true);
  assert.equal(balanceMin(b), 20, 'adding an unproductive site is free');
});

test('a changed setting that the balance cannot pay is refused without side effects', async () => {
  const b = newBrowser();
  await installAndSetup(b, { initialBalanceMin: 4 });
  const r = await command(b, { type: 'site.add', list: 'productive', host: 'coursera.org' });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'insufficient');
  assert.equal(balanceMin(b), 4);
  assert.ok(!b.storedState().rules.productive.includes('coursera.org'));
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
