import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ADULT_TLD_REGEX, buildAdultGuardRuleSet, buildBlockingRules, MOTIVATION_PAGE_PATH } from '../../src/core/dnr';
import { DEFAULT_ADULT_SITE_HOSTS, isAdultSiteHost, isGuardedHost } from '../../src/core/adultSites';
import { pageDirective } from '../../src/core/directive';
import { blockReasonForHost, filterStateNeeded, gapRoleForHost, isGuardedUrl, roleOf } from '../../src/core/roles';
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

test('the adult-site guard covers a curated list, adult TLDs and unmistakable hostname words', () => {
  const state = freshState();
  assert.ok(DEFAULT_ADULT_SITE_HOSTS.length >= 200, 'ships a broad curated set, not a token dozen');
  assert.equal(isAdultSiteHost('www.pornhub.com'), true, 'subdomains of listed destinations match');
  assert.equal(isAdultSiteHost('xhaccess.com'), true, 'the sites users actually meet are listed');
  assert.equal(isAdultSiteHost('www.xhaccess.xxx'), true, 'a sponsored adult TLD is adult by definition');
  assert.equal(isAdultSiteHost('anything.porn'), true);
  assert.equal(isAdultSiteHost('a-free-porn-tube.example'), true, 'a distinctive fragment anywhere in the host');
  assert.equal(isAdultSiteHost('free-sex-videos.example'), true, 'an unambiguous whole-label word');
  assert.equal(isAdultSiteHost('xxxvideos.example'), true, 'known xxx-brand labels');
  assert.equal(isAdultSiteHost('xxx1.example'), true, 'numbered mirrors of a brand label');
  assert.equal(blockReasonForHost(state, 'www.pornhub.com', 1), 'adult', 'independent of earned balance');
});

test('the adult-site guard stays off ordinary sites, including mixed-use ones', () => {
  const state = freshState();
  for (const host of [
    'youtube.com',
    'plannedparenthood.org',
    'mayoclinic.org',
    'example.org',
    'sussex.ac.uk',
    'essex.gov.uk',
    'analytics.example.com',
    'nudestix.com',
    'classictube.com',
    'xxxlutz.at',
  ]) {
    assert.equal(isAdultSiteHost(host), false, `${host} is not classified by page wording or a partial word`);
    assert.equal(blockReasonForHost(state, host, 1), null);
  }
  for (const setting of ['adultSiteGuard', 'adultSiteHosts', 'adultSiteExemptions']) {
    assert.equal(setting in state.settings, false, `${setting} is not a user-editable setting`);
  }
});

test('a site the user adds to the pause is guarded like a built-in one, and its time is charged', () => {
  const state = freshState();
  assert.equal(isGuardedHost('mystery.example', []), false, 'nothing is guarded before it is added');
  state.settings.guardedHosts = ['mystery.example'];
  assert.equal(isGuardedHost('www.mystery.example', state.settings.guardedHosts), true, 'subdomains follow');
  assert.equal(blockReasonForHost(state, 'sub.mystery.example', 1), 'adult', 'the pause beats every wallet rule');
  assert.deepEqual(roleOf(state, obs({ at: T0, host: 'www.mystery.example' })), {
    k: 'unproductive',
    host: 'www.mystery.example',
  }, 'time on a guarded page is charged, never credited and never free');
  assert.deepEqual(gapRoleForHost(state, 'www.mystery.example'), {
    k: 'unproductive',
    host: 'www.mystery.example',
  }, 'a visit recorded while EarnTime was off is charged as well');
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

test('DNR rules: the adult-site pause is independent of wallet limits', () => {
  const state = freshState();
  state.balanceMs = 5 * MIN;
  let rules = buildBlockingRules(state);
  assert.equal(rules.length, 2, 'the pause and its adult-TLD rule apply while funded');
  const adult = rules.find((rule) => rule.id === 4);
  const tld = rules.find((rule) => rule.id === 5);
  assert.ok(adult && tld);
  assert.equal(adult.priority, 6);
  assert.equal(adult.action.type, 'redirect');
  if (adult.action.type === 'redirect') assert.equal(adult.action.redirect.extensionPath, MOTIVATION_PAGE_PATH);
  assert.ok(adult.condition.requestDomains?.includes('pornhub.com'));
  assert.ok(adult.condition.requestDomains?.includes('xhaccess.com'));
  assert.deepEqual(adult.condition.resourceTypes, ['main_frame']);
  assert.equal(adult.condition.regexFilter, undefined, 'domains are matched as domains');
  assert.equal(adult.condition.excludedRequestDomains, undefined, 'the fixed policy has no user exceptions');
  assert.equal(tld.condition.regexFilter, ADULT_TLD_REGEX, 'adult TLDs are matched by hostname, not page text');
  // The pattern has to behave, not just round-trip: a literal-dot escape is the whole point.
  const tldPattern = new RegExp(ADULT_TLD_REGEX, 'i');
  assert.equal(tldPattern.test('https://xhaccess.xxx/watch/1'), true);
  assert.equal(tldPattern.test('https://a.porn:8443/x'), true);
  assert.equal(tldPattern.test('https://example.com/porn'), false, 'the path is never read');
  assert.equal(tldPattern.test('https://notporn.example.com/'), false);
  assert.equal(tld.condition.isUrlFilterCaseSensitive, false);
  if (tld.action.type === 'redirect') assert.equal(tld.action.redirect.extensionPath, MOTIVATION_PAGE_PATH);

  state.settings.guardedHosts = ['mystery.example'];
  rules = buildBlockingRules(state);
  assert.ok(rules.find((rule) => rule.id === 4)?.condition.requestDomains?.includes('mystery.example'), 'personal additions ride the same rule');

  state.balanceMs = 0;
  rules = buildBlockingRules(state);
  assert.equal(rules.length, 3);
  const exhausted = rules.find((rule) => rule.id === 1);
  assert.ok(exhausted);
  assert.deepEqual(exhausted.condition.requestDomains, ['instagram.com']);
  assert.deepEqual(exhausted.action, { type: 'redirect', redirect: { extensionPath: '/block.html' } });

  state.debtMs = 10 * MIN;
  rules = buildBlockingRules(state);
  assert.equal(rules.length, 4);
  const adultInDebt = rules.find((rule) => rule.id === 4);
  const allow = rules.find((rule) => rule.action.type === 'allow');
  const block = rules.find((rule) => rule.id === 3);
  assert.ok(adultInDebt && allow && block);
  assert.ok(adultInDebt.priority > allow.priority, 'adult destinations stay restricted even if a productive domain rule overlaps');
  assert.ok(allow.priority > block.priority, 'productive allow must outrank debt redirect');
  assert.deepEqual(allow.condition.requestDomains, ['khanacademy.org', 'youtube.com']);
  assert.equal(block.condition.regexFilter, '^https?://');
});

test('the packaged static ruleset is the same guard the extension applies at runtime', () => {
  const path = new URL('../../../rules/adult_guard.json', import.meta.url);
  const packaged = JSON.parse(readFileSync(path, 'utf8')) as ReturnType<typeof buildAdultGuardRuleSet>;
  assert.deepEqual(packaged, buildAdultGuardRuleSet(), 'rules/adult_guard.json must be the built guard (npm run build regenerates it)');
  assert.equal(packaged.rules[0].condition.requestDomains?.length, DEFAULT_ADULT_SITE_HOSTS.length);
  assert.equal(packaged.rules[0].action.redirect.extensionPath, MOTIVATION_PAGE_PATH);
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
