import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLegacyStorage, migrateLegacy, sanitizeState } from '../../src/core/state';
import { DEFAULT_HALF_SITES, SCHEMA_VERSION } from '../../src/core/constants';
import { MIN, T0 } from './helpers';

test('legacy root-extension storage: balance (float minutes), ratio and lists are preserved', () => {
  const raw = {
    wallet: { balance: 12.5, todayEarned: 3 },
    settings: { studyMinutes: 25, rewardMinutes: 1, dailyGoalHours: 1, theme: 'dark' },
    categories: { productive: ['khanacademy.org', 'Khanacademy.org'], halfUnproductive: ['youtube.com', 'web.whatsapp.com'], unproductive: ['instagram.com'] },
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


test('loading a realistic v2.1.1 state preserves the wallet and core settings while discarding WhatsApp data', () => {
  const v211 = {
    schema: 2,
    setupDone: true,
    createdAt: T0 - 30 * 24 * 60 * MIN,
    settings: {
      earnFromMin: 60,
      earnToMin: 5,
      unlockCostMin: 10,
      youtubeKeywords: ['JEE', 'Study'],
      whatsappChats: ['Mom', 'Progress Check'],
      whatsappGroups: ['Progress Check'],
    },
    rules: {
      productive: ['khanacademy.org'],
      half: ['youtube.com', 'web.whatsapp.com', 'medium.com'],
      unproductive: ['instagram.com'],
    },
    balanceMs: 4 * MIN + 1234,
    debtMs: 0,
    debtOriginMs: 0,
    debtSince: null,
    tasks: [
      {
        id: 'task-physics',
        title: 'Physics revision',
        rewardMin: 5,
        recurring: true,
        createdAt: T0 - MIN,
        completedOn: '2026-10-08',
        rewardedOn: '2026-10-08',
      },
    ],
    autoReplies: [
      {
        id: 'rule-task',
        name: 'Task announcement',
        enabled: true,
        trigger: 'task',
        targets: ['Progress Check'],
        message: 'Completed {task}',
        taskTitles: [],
        from: '',
        to: '',
        cooldownMin: 0,
        repeat: 'daily',
      },
    ],
    autoReplyQueue: [
      {
        id: 'job-1',
        ruleId: 'rule-task',
        chat: 'Progress Check',
        message: 'Completed Physics revision',
        trigger: 'task',
        createdAt: T0,
        expiresAt: T0 + 60 * MIN,
      },
    ],
    autoReplyLog: [{ id: 1, at: T0, chat: 'Progress Check', ruleId: 'rule-task', ok: true, detail: 'Sent' }],
    nextAutoReplyLogId: 2,
    autoReplySent: { 'rule-task|progress check': { at: T0, day: '2026-10-08' } },
    days: {
      '2026-10-08': {
        prodMs: 3 * MIN,
        halfProdMs: MIN,
        halfUnprodMs: 0,
        unprodMs: 0,
        earnedMs: 20_000,
        repaidMs: 0,
        taskMs: 0,
        usedMs: 0,
      },
    },
    ledger: [{ id: 1, at: T0, kind: 'earn', ms: 5000, host: 'khanacademy.org', note: 'Productive time credited' }],
    nextLedgerId: 2,
    sessions: {},
    modeLog: {},
    last: null,
    lastAt: null,
    live: null,
    lastReconcile: null,
    browserStartAt: null,
    revision: 42,
  };

  const state = sanitizeState(v211, T0 + 1);

  assert.equal(SCHEMA_VERSION, 3);
  assert.equal(state.schema, SCHEMA_VERSION, 'the v2 state is explicitly rewritten as schema 3');
  assert.equal(state.balanceMs, v211.balanceMs, 'exact balance survives');
  assert.deepEqual(state.days, v211.days, 'daily totals survive without changes');
  assert.deepEqual(state.ledger, v211.ledger, 'ledger history survives without changes');
  assert.deepEqual(state.tasks, v211.tasks, 'task definitions and completion history survive without changes');
  assert.deepEqual(state.rules, {
    productive: v211.rules.productive,
    half: ['youtube.com', 'medium.com'],
    unproductive: v211.rules.unproductive,
  }, 'all site rules survive except the obsolete WhatsApp half-filter entry');
  assert.deepEqual(state.settings, {
    earnFromMin: 60,
    earnToMin: 5,
    unlockCostMin: 10,
    youtubeKeywords: ['JEE', 'Study'],
  });
  for (const removedField of ['whatsappChats', 'whatsappGroups']) {
    assert.equal(Object.prototype.hasOwnProperty.call(state.settings, removedField), false, `${removedField} is not carried forward`);
  }
  for (const removedField of ['autoReplies', 'autoReplyQueue', 'autoReplyLog', 'autoReplySent', 'nextAutoReplyLogId']) {
    assert.equal(Object.prototype.hasOwnProperty.call(state, removedField), false, `${removedField} is not carried forward`);
  }
});
