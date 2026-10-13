import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCommand } from '../../src/core/commands';
import { chargeInterval } from '../../src/core/engine';
import { chargeReclassifiedSite } from '../../src/core/reclassify';
import { sanitizeState } from '../../src/core/state';
import { dayKey } from '../../src/core/time';
import { addScreenTime, statsFor } from '../../src/core/wallet';
import { freshState, MIN, T0 } from './helpers';

const addArena = { type: 'site.add', list: 'unproductive', host: 'https://www.arena.ai/' } as const;

test('adding arena.ai charges 20 recorded minutes against 10 earned minutes and starts 10 minutes of debt', () => {
  const s = freshState();
  s.balanceMs = 10 * MIN;
  addScreenTime(s, dayKey(T0), 'www.arena.ai', 20 * MIN, false);
  assert.equal(applyCommand(s, addArena, T0).ok, true);
  assert.equal(s.balanceMs, 0);
  assert.equal(s.debtMs, 10 * MIN);
  assert.equal(s.days[dayKey(T0)].usedMs, 20 * MIN);
  assert.equal(s.days[dayKey(T0)].screenMs, 20 * MIN, 'reclassification is not another screen-time measurement');
  assert.ok(s.ledger.some(e => e.kind === 'spend' && e.host === 'www.arena.ai'));
});

test('moving, removing and re-adding a site does not charge already-billed time twice, even after reload', () => {
  let s = freshState();
  s.settings.unlockCostMin = 0;
  s.balanceMs = 50 * MIN;
  addScreenTime(s, dayKey(T0), 'arena.ai', 5 * MIN, false);
  applyCommand(s, addArena, T0);
  s = sanitizeState(s, T0);
  applyCommand(s, { type: 'site.remove', host: 'arena.ai' }, T0);
  addScreenTime(s, dayKey(T0), 'arena.ai', 2 * MIN, false);
  applyCommand(s, { type: 'site.add', list: 'half', host: 'arena.ai' }, T0);
  applyCommand(s, { type: 'site.move', host: 'arena.ai', to: 'unproductive' }, T0);
  assert.equal(s.balanceMs, 43 * MIN);
  assert.equal(statsFor(s, dayKey(T0)).usedMs, 7 * MIN);
  assert.equal(chargeReclassifiedSite(s, 'arena.ai', T0), 0);
});

test('live and gap charges share the actual hostname with screen time, not the parent rule entry', () => {
  const s = freshState();
  s.rules.unproductive.push('arena.ai');
  s.balanceMs = 50 * MIN;
  chargeInterval(s, { k: 'unproductive', host: 'arena.ai' }, T0, T0 + MIN, 'live', 'www.arena.ai');
  chargeInterval(s, { k: 'unproductive', host: 'arena.ai' }, T0 + MIN, T0 + 2 * MIN, 'gap', 'app.arena.ai');
  assert.deepEqual(s.days[dayKey(T0)].chargedHosts, { 'www.arena.ai': MIN, 'app.arena.ai': MIN });
  assert.equal(chargeReclassifiedSite(s, 'arena.ai', T0), 0);
  assert.equal(s.balanceMs, 48 * MIN);
});

test('only today and matching unproductive hosts are charged, respecting more-specific productive rules', () => {
  const s = freshState();
  s.balanceMs = 20 * MIN;
  s.rules.productive.push('study.arena.ai');
  addScreenTime(s, dayKey(T0 - 24 * 60 * MIN), 'arena.ai', 40 * MIN, false);
  addScreenTime(s, dayKey(T0), 'app.arena.ai', 3 * MIN, false);
  addScreenTime(s, dayKey(T0), 'study.arena.ai', 4 * MIN, false);
  addScreenTime(s, dayKey(T0), 'notarena.ai', 10 * MIN, false);
  applyCommand(s, addArena, T0);
  assert.equal(s.balanceMs, 17 * MIN);
});

test('estimated screen time is charged once without requiring history access to remain granted', () => {
  const s = freshState();
  s.historyGranted = false;
  addScreenTime(s, dayKey(T0), 'arena.ai', 3 * MIN, true);
  applyCommand(s, addArena, T0);
  assert.equal(s.debtMs, 3 * MIN);
  assert.equal(s.days[dayKey(T0)].estimatedScreenMs, 3 * MIN);
  assert.equal(applyCommand(s, addArena, T0).ok, false);
  assert.equal(s.debtMs, 3 * MIN);
});

test('upgrade defaults to local history and conservatively preserves existing bills, not neutral use', () => {
  const s = freshState();
  addScreenTime(s, dayKey(T0), 'instagram.com', 4 * MIN, false);
  addScreenTime(s, dayKey(T0), 'arena.ai', 20 * MIN, false);
  s.days[dayKey(T0)].usedMs = 4 * MIN;
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.historyScope;
  delete raw.days[dayKey(T0)].chargedHosts;
  const loaded = sanitizeState(raw, T0);
  assert.equal(loaded.historyScope, 'local');
  assert.deepEqual(loaded.days[dayKey(T0)].chargedHosts, { 'instagram.com': 4 * MIN });
  loaded.balanceMs = 10 * MIN;
  applyCommand(loaded, addArena, T0);
  assert.equal(loaded.debtMs, 10 * MIN);
});

test('history source command validates input and survives reload', () => {
  const s = freshState();
  assert.equal(applyCommand(s, { type: 'screenTime.scope', scope: 'all' }, T0).ok, true);
  assert.equal(sanitizeState(s, T0).historyScope, 'all');
  const before = JSON.stringify(s);
  assert.equal(applyCommand(s, { type: 'screenTime.scope', scope: 'other' } as any, T0).ok, false);
  assert.equal(JSON.stringify(s), before);
});
