import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockingRules, MOTIVATION_PAGE_PATH } from '../../src/core/dnr';
import { DEFAULT_ADULT_SITE_HOSTS, isAdultSiteHost } from '../../src/core/adultSites';
import { pageDirective } from '../../src/core/directive';
import { blockReasonForHost, filterStateNeeded, isGuardedUrl, roleOf } from '../../src/core/roles';
import { freshState, MIN, obs, T0 } from './helpers';

test('roleOf: background, locked, idle and internal pages are not counted', () => {
  const state = freshState();
  assert.deepEqual(roleOf(state, obs({ at: T0, focused: false })), { k: 'none', why: 'background' });
  assert.deepEqual(roleOf(state, obs({ at: T0, tabActive: false })), { k: 'none', why: 'background' });
  assert.deepEqual(roleOf(state, obs({ at: T0, idle: 'locked' })), { k: 'none', why: 'locked' });
  assert.deepEqual(roleOf(state, obs({ at: T0, idle: 'idle' })), { k: 'none', why: 'idle' });
  assert.equal(roleOf(state, obs({ at: T0, idle: 'idle', audible: true })).k, 'productive');
  assert.deepEqual(roleOf(state, obs({ at: T0, host: null, internalPage: true })), { k: 'none', why: 'internal' });
});

test('roleOf: productive, unproductive and neutral classification', () => {
  const state = freshState();
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'www.khanacademy.org' })), { k: 'productive', host: 'khanacademy.org' });
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'instagram.com' })), { k: 'unproductive', host: 'instagram.com' });
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'example.org' })), { k: 'neutral', host: 'example.org' });
});

test('roleOf: half-productive sites need a mode choice first', () => {
  const state = freshState();
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'youtube.com', tabId: 7 })), {
    k: 'none',
    why: 'choose-mode',
    host: 'youtube.com',
  });
  state.sessions['7'] = { entry: 'youtube.com', mode: 'unproductive', since: T0 };
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'youtube.com', tabId: 7 })), {
    k: 'half',
    host: 'youtube.com',
    entry: 'youtube.com',
    mode: 'unproductive',
    degraded: false,
  });
});

test('roleOf: YouTube productive mode depends on the filter health', () => {
  const state = freshState();
  state.sessions['7'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  const base = { at: T0, host: 'www.youtube.com', tabId: 7 };
  assert.equal(roleOf(state, obs({ ...base, filterState: 'ok' })).k, 'half');
  assert.deepEqual(roleOf(state, obs({ ...base, filterState: 'pending' })), { k: 'none', why: 'filter-pending', host: 'www.youtube.com' });
  const bad = roleOf(state, obs({ ...base, filterState: 'bad' }));
  assert.equal(bad.k === 'half' && bad.degraded, true);
});

test('roleOf: an intentional YouTube cover is not filter failure and is not counted', () => {
  const state = freshState();
  state.sessions['7'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'youtube.com', tabId: 7, filterState: 'covered' })), {
    k: 'none',
    why: 'filter-covered',
    host: 'youtube.com',
  });
});

test('roleOf: half sites without a dedicated filter are trusted in Productive Mode', () => {
  const state = freshState();
  state.rules.half.push('news.example');
  state.sessions['7'] = { entry: 'news.example', mode: 'productive', since: T0 };
  const role = roleOf(state, obs({ at: T0, host: 'news.example', tabId: 7, filterState: 'n/a' }));
  assert.equal(role.k === 'half' && role.degraded === false, true);
  assert.equal(filterStateNeeded('news.example'), false);
  assert.equal(filterStateNeeded('m.youtube.com'), true);
});

test('blockReasonForHost: zero balance blocks unproductive sites only', () => {
  const state = freshState();
  state.balanceMs = 0;
  assert.equal(blockReasonForHost(state, 'instagram.com', 1), 'exhausted');
  assert.equal(blockReasonForHost(state, 'khanacademy.org', 1), null);
  assert.equal(blockReasonForHost(state, 'example.org', 1), null);
  assert.equal(blockReasonForHost(state, 'youtube.com', 1), null, 'pending choice is allowed');
  state.sessions['1'] = { entry: 'youtube.com', mode: 'unproductive', since: T0 };
  assert.equal(blockReasonForHost(state, 'youtube.com', 1), 'exhausted');
  state.sessions['1'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  assert.equal(blockReasonForHost(state, 'youtube.com', 1), null);
});

test('blockReasonForHost: debt allows only productive and productive-mode half sites', () => {
  const state = freshState();
  state.balanceMs = 0;
  state.debtMs = 30 * MIN;
  state.debtOriginMs = 30 * MIN;
  assert.equal(blockReasonForHost(state, 'khanacademy.org', 1), null);
  assert.equal(blockReasonForHost(state, 'example.org', 1), 'debt', 'unlisted sites are blocked in debt');
  assert.equal(blockReasonForHost(state, 'instagram.com', 1), 'debt');
  assert.equal(blockReasonForHost(state, 'youtube.com', 1), null, 'pending choice in debt is allowed (productive only)');
  state.sessions['1'] = { entry: 'youtube.com', mode: 'unproductive', since: T0 };
  assert.equal(blockReasonForHost(state, 'youtube.com', 1), 'debt');
  assert.equal(blockReasonForHost(state, null, 1), null, 'non-web pages are not blocked here');
});

test('fixed adult-site guard matches dedicated domains only', () => {
  const state = freshState();
  assert.equal(DEFAULT_ADULT_SITE_HOSTS.length, 45, 'ships a curated fixed starter set');
  assert.equal(isAdultSiteHost('www.pornhub.com'), true, 'subdomains of listed adult destinations match');
  assert.equal(blockReasonForHost(state, 'www.pornhub.com', 1), 'adult', 'independent of earned balance');
  for (const host of ['youtube.com', 'plannedparenthood.org', 'mayoclinic.org', 'example.org']) {
    assert.equal(isAdultSiteHost(host), false, `${host} is not classified by page wording or mixed-use content`);
    assert.equal(blockReasonForHost(state, host, 1), null);
  }
  for (const setting of ['adultSiteGuard', 'adultSiteHosts', 'adultSiteExemptions']) {
    assert.equal(setting in state.settings, false, `${setting} is not a user-editable setting`);
  }
});

test('pageDirective: choose screen offers Unproductive Mode only when the balance is positive', () => {
  const state = freshState();
  state.balanceMs = 0;
  const empty = pageDirective(state, 3, 'youtube.com');
  assert.equal(empty.directive.kind, 'choose');
  if (empty.directive.kind === 'choose') {
    assert.equal(empty.directive.canUnproductive, false);
    assert.equal(empty.directive.reason, 'exhausted');
  }
  state.balanceMs = 10 * MIN;
  const funded = pageDirective(state, 3, 'youtube.com');
  if (funded.directive.kind === 'choose') assert.equal(funded.directive.canUnproductive, true);
});

test('pageDirective: active directive carries the YouTube keywords for Productive Mode only', () => {
  const state = freshState();
  state.balanceMs = 10 * MIN;
  state.sessions['3'] = { entry: 'youtube.com', mode: 'productive', since: T0 };
  const productive = pageDirective(state, 3, 'www.youtube.com');
  assert.equal(productive.directive.kind, 'active');
  if (productive.directive.kind === 'active') {
    assert.equal(productive.directive.filter, 'youtube');
    assert.deepEqual(productive.directive.youtubeKeywords, state.settings.youtubeKeywords);
    assert.equal('grayscale' in productive.directive, false, 'the greyscale filter was removed entirely');
  }
  state.sessions['3'] = { entry: 'youtube.com', mode: 'unproductive', since: T0 };
  const unproductive = pageDirective(state, 3, 'youtube.com');
  if (unproductive.directive.kind === 'active') {
    assert.equal(unproductive.directive.filter, null);
    assert.equal('grayscale' in unproductive.directive, false, 'Unproductive Mode no longer greys the page');
  }
});

test('pageDirective: an Unproductive Mode session is dropped once the balance is empty', () => {
  const state = freshState();
  state.balanceMs = 0;
  state.sessions['3'] = { entry: 'youtube.com', mode: 'unproductive', since: T0 };
  const result = pageDirective(state, 3, 'youtube.com');
  assert.equal(result.clearSession, true);
  assert.equal(result.directive.kind, 'choose');
});

test('pageDirective: neutral and internal pages get no directive', () => {
  const state = freshState();
  assert.equal(pageDirective(state, 1, 'example.org').directive.kind, 'none');
  assert.equal(pageDirective(state, 1, null).directive.kind, 'none');
});

test('DNR rules: fixed adult-site pause is independent of wallet limits', () => {
  const state = freshState();
  state.balanceMs = 5 * MIN;
  let rules = buildBlockingRules(state);
  assert.equal(rules.length, 1, 'only the fixed adult-site rule applies while funded');
  const adult = rules.find((rule) => rule.id === 4);
  assert.ok(adult);
  assert.equal(adult.priority, 4);
  assert.equal(adult.action.type, 'redirect');
  if (adult.action.type === 'redirect') assert.equal(adult.action.redirect.extensionPath, MOTIVATION_PAGE_PATH);
  assert.ok(adult.condition.requestDomains?.includes('pornhub.com'));
  assert.deepEqual(adult.condition.resourceTypes, ['main_frame']);
  assert.equal(adult.condition.regexFilter, undefined, 'no URL or page text matching');
  assert.equal(adult.condition.excludedRequestDomains, undefined, 'the fixed policy has no user exceptions');

  state.balanceMs = 0;
  rules = buildBlockingRules(state);
  assert.equal(rules.length, 2);
  assert.ok(rules.some((rule) => rule.id === 4));
  const exhausted = rules.find((rule) => rule.id === 1);
  assert.ok(exhausted);
  assert.deepEqual(exhausted.condition.requestDomains, ['instagram.com']);
  assert.deepEqual(exhausted.action, { type: 'redirect', redirect: { extensionPath: '/block.html' } });

  state.debtMs = 10 * MIN;
  rules = buildBlockingRules(state);
  assert.equal(rules.length, 3);
  const adultInDebt = rules.find((rule) => rule.id === 4);
  const allow = rules.find((rule) => rule.action.type === 'allow');
  const block = rules.find((rule) => rule.id === 3);
  assert.ok(adultInDebt && allow && block);
  assert.ok(adultInDebt.priority > allow.priority, 'adult destinations stay restricted even if a productive domain rule overlaps');
  assert.ok(allow.priority > block.priority, 'productive allow must outrank debt redirect');
  assert.deepEqual(allow.condition.requestDomains, ['khanacademy.org', 'youtube.com']);
  assert.equal(block.condition.regexFilter, '^https?://');
});

test('isGuardedUrl matches extension management pages only', () => {
  assert.equal(isGuardedUrl('chrome://extensions'), true);
  assert.equal(isGuardedUrl('chrome://extensions/'), true);
  assert.equal(isGuardedUrl('chrome://extensions/?id=abcdef'), true);
  assert.equal(isGuardedUrl('chrome://settings/extensions'), true);
  assert.equal(isGuardedUrl('chrome://settings/privacy'), false);
  assert.equal(isGuardedUrl('chrome://extensionsfoo'), false);
  assert.equal(isGuardedUrl('https://chrome.google.com/webstore'), false);
  assert.equal(isGuardedUrl(undefined), false);
});
