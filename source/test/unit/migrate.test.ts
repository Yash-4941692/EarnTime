import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLegacyStorage, migrateLegacy, sanitizeState } from '../../src/core/state';
import { DEFAULT_HALF_SITES } from '../../src/core/constants';
import { MIN, T0 } from './helpers';

test('legacy root-extension storage: balance (float minutes), ratio and lists are preserved', () => {
  const raw = {
    wallet: { balance: 12.5, todayEarned: 3 },
    settings: { studyMinutes: 25, rewardMinutes: 1, dailyGoalHours: 1, theme: 'dark' },
    categories: { productive: ['khanacademy.org', 'Khanacademy.org'], halfUnproductive: ['youtube.com'], unproductive: ['instagram.com'] },
    nuclear: { password: 'plaintext' },
  };
  assert.equal(isLegacyStorage(raw), true);
  const state = migrateLegacy(raw, T0);
  assert.equal(state.balanceMs, 12.5 * MIN);
  assert.equal(state.settings.earnFromMin, 25);
  assert.equal(state.settings.earnToMin, 1);
  assert.deepEqual(state.rules.productive, ['khanacademy.org']);
  assert.deepEqual(state.rules.half, ['youtube.com']);
  assert.deepEqual(state.rules.unproductive, ['instagram.com']);
  assert.equal(state.setupDone, true);
  assert.equal(state.ledger[0].kind, 'migrate');
  assert.equal(JSON.stringify(state).includes('plaintext'), false, 'nuclear password is not carried over');
});

test('React prototype storage: balanceSeconds and blocked sites map to unproductive', () => {
  const raw = {
    wallet: { balanceSeconds: 600 },
    settings: { studyMinutes: 60, rewardMinutes: 5, productiveSites: ['nptel.ac.in'], halfUnproductiveSites: [], blockedSites: ['reddit.com'] },
  };
  const state = migrateLegacy(raw, T0);
  assert.equal(state.balanceMs, 600_000);
  assert.deepEqual(state.rules.productive, ['nptel.ac.in']);
  assert.deepEqual(state.rules.unproductive, ['reddit.com']);
  assert.deepEqual(state.rules.half, [...DEFAULT_HALF_SITES], 'empty half list falls back to the defaults');
});

test('a host present on several legacy lists keeps the strictest classification', () => {
  const raw = {
    wallet: { balance: 0 },
    settings: { studyMinutes: 60, rewardMinutes: 5 },
    categories: { productive: ['a.com'], halfUnproductive: ['a.com'], unproductive: ['a.com'] },
  };
  const state = migrateLegacy(raw, T0);
  assert.deepEqual(state.rules.unproductive, ['a.com']);
  assert.equal(state.rules.productive.includes('a.com'), false);
  assert.equal(state.rules.half.includes('a.com'), false);
});

test('an empty legacy install needs setup; a non-legacy object is not detected as legacy', () => {
  const state = migrateLegacy({ wallet: { balance: 0 }, settings: {}, categories: { productive: [], halfUnproductive: [], unproductive: [] } }, T0);
  assert.equal(state.setupDone, false);
  assert.equal(isLegacyStorage({ state: {} }), false);
  assert.equal(isLegacyStorage({}), false);
});

test('sanitizeState repairs corrupted storage without negative money or invalid lists', () => {
  const state = sanitizeState(
    {
      balanceMs: -5000,
      debtMs: 'lots',
      settings: { earnFromMin: 0, earnToMin: 99, unlockCostMin: -4 },
      rules: { productive: ['bad host', 'ok.com'], unproductive: 'nope' },
      tasks: [{ id: 7 }],
      last: { at: 'x' },
    },
    T0,
  );
  assert.equal(state.balanceMs, 0);
  assert.equal(state.debtMs, 0);
  assert.equal(state.settings.earnFromMin >= 1, true);
  assert.ok(state.settings.earnToMin <= state.settings.earnFromMin);
  assert.equal(state.settings.unlockCostMin, 0);
  assert.deepEqual(state.rules.productive, ['ok.com']);
  assert.deepEqual(state.rules.unproductive, []);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.last, null);
});
