/**
 * Deciding what a page is while it loads, from persisted state alone. These are the rules the content
 * script applies before the service worker has answered, so they have to match what the worker would
 * have said — they are the same `pageDirective`, fed from storage instead of from the worker.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GATE_CACHE_KEY,
  GATE_CACHE_LIMIT,
  pickCacheEntry,
  provisionalVerdict,
  readLocalVerdictInput,
  stripHash,
  withCacheEntry,
  type LocalVerdictInput,
} from '../../src/content/local';
import type { PageDirective } from '../../src/core/directive';
import type { EarnState } from '../../src/core/types';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 8, 3, 30);

function stored(overrides: Partial<EarnState> = {}): EarnState {
  return {
    schema: 5,
    setupDone: true,
    historyGranted: true,
    createdAt: T0,
    settings: { earnFromMin: 60, earnToMin: 5, unlockCostMin: 10, youtubeKeywords: ['Study', 'JEE'] },
    rules: { productive: ['khanacademy.org'], half: ['youtube.com'], unproductive: ['instagram.com'] },
    balanceMs: 30 * MIN,
    debtMs: 0,
    debtOriginMs: 0,
    debtSince: null,
    tasks: [],
    days: {},
    ledger: [],
    nextLedgerId: 1,
    sessions: {},
    modeLog: {},
    last: null,
    lastAt: null,
    live: null,
    lastReconcile: null,
    browserStartAt: null,
    revision: 1,
    ...overrides,
  };
}

const URL = 'https://www.youtube.com/watch?v=abc';

test('a half-productive host with no session for this tab is the chooser, decided locally', () => {
  const local: LocalVerdictInput = {
    rules: stored().rules,
    sessions: {},
    balanceMs: 30 * MIN,
    debtMs: 0,
    youtubeKeywords: ['Study'],
    setupDone: true,
  };
  const verdict = provisionalVerdict('www.youtube.com', 7, local);
  assert.equal(verdict.kind, 'directive');
  if (verdict.kind !== 'directive') return;
  assert.equal(verdict.directive.kind, 'choose');
  if (verdict.directive.kind !== 'choose') return;
  assert.equal(verdict.directive.entry, 'youtube.com');
  assert.equal(verdict.directive.canUnproductive, true);
  assert.equal(verdict.directive.reason, null);
});

test('the local chooser matches the worker on debt and on an empty balance', () => {
  const base = { rules: stored().rules, sessions: {}, youtubeKeywords: [], setupDone: true };
  const inDebt = provisionalVerdict('www.youtube.com', 7, { ...base, balanceMs: 0, debtMs: 12 * MIN });
  assert.equal(inDebt.kind, 'directive');
  if (inDebt.kind === 'directive' && inDebt.directive.kind === 'choose') {
    assert.equal(inDebt.directive.canUnproductive, false);
    assert.equal(inDebt.directive.reason, 'debt');
  } else assert.fail('expected a chooser');

  const empty = provisionalVerdict('www.youtube.com', 7, { ...base, balanceMs: 0, debtMs: 0 });
  if (empty.kind === 'directive' && empty.directive.kind === 'choose') {
    assert.equal(empty.directive.canUnproductive, false);
    assert.equal(empty.directive.reason, 'exhausted');
  } else assert.fail('expected a chooser');
});

test('a session already chosen for this tab opens the page, with the YouTube filter for Productive Mode', () => {
  const rules = stored().rules;
  const productive = provisionalVerdict('www.youtube.com', 7, {
    rules,
    sessions: { '7': { entry: 'youtube.com', mode: 'productive', since: T0 } },
    balanceMs: MIN,
    debtMs: 0,
    youtubeKeywords: ['Study'],
    setupDone: true,
  });
  if (productive.kind === 'directive' && productive.directive.kind === 'active') {
    assert.equal(productive.directive.mode, 'productive');
    assert.equal(productive.directive.filter, 'youtube');
    assert.deepEqual(productive.directive.youtubeKeywords, ['Study']);
  } else assert.fail('expected an active directive');

  // Another tab's session is not this tab's: it still has to choose.
  const otherTab = provisionalVerdict('www.youtube.com', 8, {
    rules,
    sessions: { '7': { entry: 'youtube.com', mode: 'productive', since: T0 } },
    balanceMs: MIN,
    debtMs: 0,
    youtubeKeywords: ['Study'],
    setupDone: true,
  });
  assert.equal(otherTab.kind === 'directive' && otherTab.directive.kind, 'choose');
});

test('an Unproductive Mode session that the balance can no longer pay falls back to the chooser', () => {
  const verdict = provisionalVerdict('www.youtube.com', 7, {
    rules: stored().rules,
    sessions: { '7': { entry: 'youtube.com', mode: 'unproductive', since: T0 } },
    balanceMs: 0,
    debtMs: 0,
    youtubeKeywords: [],
    setupDone: true,
  });
  if (verdict.kind === 'directive' && verdict.directive.kind === 'choose') {
    assert.equal(verdict.directive.canUnproductive, false);
  } else assert.fail('expected the choice to be offered again');
});

test('hosts that are not half-productive need no verdict, so the page is open at once', () => {
  const local: LocalVerdictInput = {
    rules: stored().rules,
    sessions: {},
    balanceMs: 0,
    debtMs: 40 * MIN,
    youtubeKeywords: [],
    setupDone: true,
  };
  for (const host of ['www.khanacademy.org', 'instagram.com', 'example.org']) {
    const verdict = provisionalVerdict(host, 7, local);
    assert.deepEqual(verdict, { kind: 'open', why: 'not-tracked' }, host);
  }
  // Even in debt: an unproductive page is stopped by declarativeNetRequest while it loads, and a
  // blocked page must not also be hidden by a content script that cannot explain it.
});

test('a page EarnTime does not manage, and a state it cannot read, are told apart', () => {
  assert.deepEqual(provisionalVerdict(null, 7, null), { kind: 'open', why: 'unmanaged' });
  assert.deepEqual(provisionalVerdict('www.youtube.com', 7, null), { kind: 'hold', why: 'unknown' });
  // A tab id that is not known yet cannot use a published verdict, but the rules still decide.
  const local: LocalVerdictInput = {
    rules: stored().rules,
    sessions: { '7': { entry: 'youtube.com', mode: 'productive', since: T0 } },
    balanceMs: MIN,
    debtMs: 0,
    youtubeKeywords: [],
    setupDone: true,
  };
  const verdict = provisionalVerdict('www.youtube.com', null, local);
  assert.equal(verdict.kind === 'directive' && verdict.directive.kind, 'choose');
});

test('readLocalVerdictInput reads rules, sessions and money out of stored state', async () => {
  const local = await readLocalVerdictInput(7, URL, undefined, async () => ({ state: stored({ balanceMs: 5 * MIN }) }));
  assert.ok(local);
  assert.deepEqual(local?.rules.half, ['youtube.com']);
  assert.equal(local?.balanceMs, 5 * MIN);
  assert.equal(local?.setupDone, true);
  assert.deepEqual(local?.youtubeKeywords, ['Study', 'JEE']);
  assert.equal(local?.cached, null);
});

test('readLocalVerdictInput tolerates storage that cannot be read at all', async () => {
  assert.equal(await readLocalVerdictInput(7, URL, undefined, async () => ({})), null);
  assert.equal(
    await readLocalVerdictInput(7, URL, undefined, async () => {
      throw new Error('extension context invalidated');
    }),
    null,
  );
  // Nothing readable and no cache means "unknown", which keeps the page covered.
});

test('a published verdict is used only for the tab and URL it was published for', async () => {
  const directive: PageDirective = { kind: 'none' };
  const cache = { [GATE_CACHE_KEY]: { '7': { url: URL, at: T0, directive } } };
  const sessionGet = async () => cache;

  const exact = await readLocalVerdictInput(7, URL, sessionGet, async () => ({}));
  assert.equal(exact?.cached?.directive.kind, 'none');

  const otherTab = await readLocalVerdictInput(8, URL, sessionGet, async () => ({}));
  assert.equal(otherTab, null, 'another tab has no verdict, and no readable rules either');

  const otherUrl = await readLocalVerdictInput(7, 'https://www.youtube.com/watch?v=other', sessionGet, async () => ({}));
  assert.equal(otherUrl, null, 'another URL has no verdict');

  // Only the fragment differs: that is the same page as far as a verdict is concerned.
  const hashed = await readLocalVerdictInput(7, `${URL}#t=30`, sessionGet, async () => ({}));
  assert.equal(hashed?.cached?.directive.kind, 'none');
});

test('pickCacheEntry expires a verdict older than the TTL', () => {
  const raw = { '7': { url: URL, at: T0, directive: { kind: 'none' } } };
  assert.ok(pickCacheEntry(raw, 7, URL, T0 + 1000));
  assert.equal(pickCacheEntry(raw, 7, URL, T0 + 10 * MIN), null);
  assert.ok(pickCacheEntry(raw, 7, URL), 'without a clock to compare, nothing expires');
  assert.equal(pickCacheEntry(undefined, 7, URL), null);
  assert.equal(pickCacheEntry({ '7': { url: URL, at: 'nope', directive: { kind: 'none' } } }, 7, URL), null);
});

test('withCacheEntry replaces one tab, keeps the others and bounds the cache', () => {
  let cache = withCacheEntry({}, 7, URL, { kind: 'none' }, T0);
  cache = withCacheEntry(cache, 8, 'https://example.org/', { kind: 'none' }, T0);
  assert.deepEqual(Object.keys(cache).sort(), ['7', '8']);

  cache = withCacheEntry(cache, 7, URL, { kind: 'choose', host: 'www.youtube.com', entry: 'youtube.com', canUnproductive: true, reason: null, balanceMs: MIN, debtMs: 0 }, T0 + 1);
  assert.equal(cache['7'].directive.kind, 'choose');
  assert.equal(cache['8'].directive.kind, 'none');

  for (let tab = 100; tab < 100 + GATE_CACHE_LIMIT + 20; tab += 1) {
    cache = withCacheEntry(cache, tab, `https://site${tab}.example/`, { kind: 'none' }, T0);
  }
  assert.ok(Object.keys(cache).length <= GATE_CACHE_LIMIT + 1, 'the cache cannot grow without bound');
  assert.ok(cache['7'], 'and the tab being written is always kept');
});

test('stripHash ignores the fragment only', () => {
  assert.equal(stripHash('https://a.example/x#y'), 'https://a.example/x');
  assert.equal(stripHash('https://a.example/x?y=1'), 'https://a.example/x?y=1');
  assert.equal(stripHash('https://a.example/x'), 'https://a.example/x');
});
