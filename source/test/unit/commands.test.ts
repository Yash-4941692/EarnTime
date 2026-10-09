import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand, applySetup, auditExport, type SetupPayload } from '../../src/core/commands';
import { siteChangeLoosens, ratioLoosens } from '../../src/core/protection';
import { freshState, MIN, T0 } from './helpers';

const setupBase: SetupPayload = {
  earnFromMin: 60,
  earnToMin: 5,
  unlockCostMin: 10,
  initialBalanceMin: 0,
  productive: ['khanacademy.org'],
  half: ['youtube.com'],
  unproductive: ['instagram.com'],
  youtubeKeywords: ['JEE'],
  whatsappChats: ['Mom'],
  tasks: [],
};

test('setup applies once and refuses to run again (no balance reset)', () => {
  const state = freshState(false);
  const first = applySetup(state, { ...setupBase, initialBalanceMin: 15 }, T0);
  assert.equal(first.ok, true);
  assert.equal(state.balanceMs, 15 * MIN);
  const second = applySetup(state, { ...setupBase, initialBalanceMin: 500 }, T0 + 1);
  assert.equal(second.ok, false);
  assert.equal(state.balanceMs, 15 * MIN);
});

test('setup rejects a website that is on two lists', () => {
  const state = freshState(false);
  const result = applySetup(state, { ...setupBase, productive: ['instagram.com'] }, T0);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'duplicate');
  assert.equal(state.setupDone, false);
});

test('setup caps the starting balance, so reinstalling cannot grant a large allowance', () => {
  const state = freshState(false);
  assert.equal(applySetup(state, { ...setupBase, initialBalanceMin: 31 }, T0).ok, false);
  assert.equal(state.setupDone, false);
  assert.equal(applySetup(state, { ...setupBase, initialBalanceMin: 30 }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN);
});

test('setup validates the ratio, cost and starting balance', () => {
  const state = freshState(false);
  assert.equal(applySetup(state, { ...setupBase, earnToMin: 90 }, T0).ok, false, 'earn more than productive time is refused');
  assert.equal(applySetup(state, { ...setupBase, unlockCostMin: 999 }, T0).ok, false);
  assert.equal(applySetup(state, { ...setupBase, initialBalanceMin: -5 }, T0).ok, false);
  assert.equal(state.setupDone, false);
});

test('before setup, changes are free', () => {
  const state = freshState(false);
  state.balanceMs = 0;
  assert.equal(applyCommand(state, { type: 'site.add', list: 'productive', host: 'nptel.ac.in' }, T0).ok, true);
  assert.equal(state.balanceMs, 0);
});

test('after setup, adding a site to any list is free: it was untracked, so nothing is unlocked', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  for (const list of ['productive', 'half', 'unproductive'] as const) {
    const host = { productive: 'nptel.ac.in', half: 'medium.com', unproductive: 'reddit.com' }[list];
    assert.equal(applyCommand(state, { type: 'site.add', list, host }, T0).ok, true, list);
  }
  assert.equal(state.balanceMs, 30 * MIN, 'no unlock cost for listing a site');
  assert.ok(state.rules.productive.includes('nptel.ac.in'));
  assert.equal(state.ledger.some((e) => e.kind === 'unlock'), false, 'no unlock was charged');
});

test('removing a restricted site costs the unlock cost; removing a productive site is free', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'site.remove', host: 'instagram.com' }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN, 'dropping an unproductive site lifts a block, so it costs');
  assert.equal(applyCommand(state, { type: 'site.remove', host: 'khanacademy.org' }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN, 'dropping a productive site is stricter, so it is free');
  assert.ok(state.ledger.some((e) => e.kind === 'unlock' && e.ms === 10 * MIN));
});

test('marking an unproductive site productive costs; marking it unproductive again is free', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'site.move', host: 'instagram.com', to: 'productive' }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN, 'unproductive → productive costs');
  assert.equal(applyCommand(state, { type: 'site.move', host: 'instagram.com', to: 'unproductive' }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN, 'the way back is free');
});

test('an insufficient balance refuses the change without mutating anything', () => {
  const state = freshState(true);
  state.balanceMs = 4 * MIN;
  const before = JSON.stringify(state.rules);
  const result = applyCommand(state, { type: 'site.remove', host: 'instagram.com' }, T0);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.code, 'insufficient');
  assert.equal(result.ok === false && result.needMs, 10 * MIN);
  assert.equal(state.balanceMs, 4 * MIN);
  assert.equal(JSON.stringify(state.rules), before);
});

test('debt blocks every loosening change', () => {
  const state = freshState(true);
  state.balanceMs = 0;
  state.debtMs = 5 * MIN;
  state.debtOriginMs = 5 * MIN;
  const result = applyCommand(state, { type: 'site.remove', host: 'instagram.com' }, T0);
  assert.equal(result.ok === false && result.code, 'debt');
  assert.equal(applyCommand(state, { type: 'site.move', host: 'instagram.com', to: 'productive' }, T0).ok === false, true);
  // Tightening is still possible, and so is listing a new site.
  assert.equal(applyCommand(state, { type: 'site.add', list: 'unproductive', host: 'reddit.com' }, T0).ok, true);
  assert.equal(applyCommand(state, { type: 'site.add', list: 'productive', host: 'nptel.ac.in' }, T0).ok, true);
});

test('site cost rules: listing a site is always free, lifting a restriction costs', () => {
  // A host on no list is not restricted, so putting it on a list unlocks nothing.
  assert.equal(siteChangeLoosens('neutral', 'productive'), false);
  assert.equal(siteChangeLoosens('neutral', 'half'), false);
  assert.equal(siteChangeLoosens('neutral', 'unproductive'), false);
  // Removing a site that was gated, or moving one up the ladder, costs.
  assert.equal(siteChangeLoosens('unproductive', 'neutral'), true);
  assert.equal(siteChangeLoosens('half', 'neutral'), true);
  assert.equal(siteChangeLoosens('unproductive', 'half'), true);
  assert.equal(siteChangeLoosens('unproductive', 'productive'), true);
  assert.equal(siteChangeLoosens('half', 'productive'), true);
  // Every downward move is stricter and free.
  assert.equal(siteChangeLoosens('productive', 'neutral'), false);
  assert.equal(siteChangeLoosens('productive', 'half'), false);
  assert.equal(siteChangeLoosens('productive', 'unproductive'), false);
  assert.equal(siteChangeLoosens('half', 'unproductive'), false);
});

test('moving a site to a stricter list is free; to a looser list costs', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'site.move', host: 'youtube.com', to: 'unproductive' }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN);
  assert.equal(applyCommand(state, { type: 'site.move', host: 'youtube.com', to: 'half' }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN);
  assert.ok(state.rules.half.includes('youtube.com'));
});

test('a host can be on only one list', () => {
  const state = freshState(true);
  const result = applyCommand(state, { type: 'site.add', list: 'half', host: 'instagram.com' }, T0);
  assert.equal(result.ok === false && result.code, 'duplicate');
});

test('ratio: loosening costs the unlock cost, tightening is free', () => {
  assert.equal(ratioLoosens(60, 5, 60, 6), true);
  assert.equal(ratioLoosens(60, 5, 60, 4), false);
  assert.equal(ratioLoosens(60, 5, 30, 5), true);
  assert.equal(ratioLoosens(60, 5, 120, 5), false);
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'ratio.set', earnFromMin: 60, earnToMin: 4 }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN);
  assert.equal(applyCommand(state, { type: 'ratio.set', earnFromMin: 60, earnToMin: 6 }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN);
  assert.equal(state.settings.earnToMin, 6);
});

test('unlock cost: lowering it costs the current price, raising it is free', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'unlock.set', minutes: 25 }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN, 'raising the cost is free');
  assert.equal(applyCommand(state, { type: 'unlock.set', minutes: 5 }, T0).ok, true);
  assert.equal(state.balanceMs, 5 * MIN, 'lowering the cost is paid at the current price (25 min)');
  assert.equal(state.settings.unlockCostMin, 5);
  state.balanceMs = 2 * MIN;
  const refused = applyCommand(state, { type: 'unlock.set', minutes: 0 }, T0);
  assert.equal(refused.ok === false && refused.code, 'insufficient', 'cannot make changes free without paying');
  assert.equal(state.settings.unlockCostMin, 5);
});

test('YouTube keywords: adding and removing are free, duplicates are refused case-insensitively', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'youtube.add', keyword: 'Quantum' }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN, 'keywords never gate a site, so adding one is free');
  assert.equal(applyCommand(state, { type: 'youtube.add', keyword: 'quantum' }, T0).ok === false, true);
  assert.equal(applyCommand(state, { type: 'youtube.remove', keyword: 'Quantum' }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN);
});

test('WhatsApp chats: exact names, free to add and to remove', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  assert.equal(applyCommand(state, { type: 'whatsapp.add', chat: 'Study Group' }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN);
  assert.equal(applyCommand(state, { type: 'whatsapp.remove', chat: 'Study Group' }, T0).ok, true);
  assert.equal(state.balanceMs, 30 * MIN);
});

test('tasks: adding and raising rewards costs, deleting and lowering is free', () => {
  const state = freshState(true);
  state.balanceMs = 30 * MIN;
  const added = applyCommand(state, { type: 'task.add', title: 'Mock test', rewardMin: 5, recurring: true }, T0);
  assert.equal(added.ok, true);
  assert.equal(state.balanceMs, 20 * MIN);
  const id = state.tasks[0].id;
  assert.equal(applyCommand(state, { type: 'task.update', id, rewardMin: 3 }, T0).ok, true);
  assert.equal(state.balanceMs, 20 * MIN);
  assert.equal(applyCommand(state, { type: 'task.update', id, rewardMin: 9 }, T0).ok, true);
  assert.equal(state.balanceMs, 10 * MIN);
  assert.equal(applyCommand(state, { type: 'task.delete', id }, T0).ok, true);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.balanceMs, 10 * MIN);
});

test('task toggle through commands pays the reward', () => {
  const state = freshState(true);
  state.balanceMs = 0;
  state.tasks.push({ id: 'a', title: 'Chapter', rewardMin: 5, recurring: true, createdAt: T0, completedOn: null, rewardedOn: null });
  assert.equal(applyCommand(state, { type: 'task.toggle', id: 'a' }, T0).ok, true);
  assert.equal(state.balanceMs, 5 * MIN);
});

test('audit export contains hosts and minutes, never page URLs', () => {
  const state = freshState(true);
  state.balanceMs = 10 * MIN;
  state.ledger.push({ id: 1, at: T0, kind: 'spend', ms: 60_000, host: 'instagram.com', note: 'Unproductive site' });
  const exported = JSON.stringify(auditExport(state, T0));
  assert.ok(exported.includes('instagram.com'));
  assert.equal(exported.includes('http'), false);
  assert.equal(exported.includes('/watch'), false);
});
