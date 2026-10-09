import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyHost, hostFromUrl, hostMatches, listOfEntry, normalizeHostInput } from '../../src/core/domains';
import { cleanHostList, dedupeRules } from '../../src/core/state';

test('normalizeHostInput accepts URLs, bare domains and www prefixes', () => {
  assert.equal(normalizeHostInput('https://www.YouTube.com/watch?v=abc'), 'youtube.com');
  assert.equal(normalizeHostInput('  youtube.com/feed  '), 'youtube.com');
  assert.equal(normalizeHostInput('nptel.ac.in.'), 'nptel.ac.in');
  assert.equal(normalizeHostInput('xn--80ak6aa92e.com'), 'xn--80ak6aa92e.com');
});

test('normalizeHostInput rejects non-domains and non-web schemes', () => {
  for (const bad of ['', '   ', 'localhost', 'chrome://extensions', 'ftp://example.com', 'javascript:alert(1)', 'a b.com', '-bad-.com', 'example..com']) {
    assert.equal(normalizeHostInput(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('hostFromUrl returns hostnames only for http(s)', () => {
  assert.equal(hostFromUrl('https://Example.com/a?b=c'), 'example.com');
  assert.equal(hostFromUrl('chrome://extensions/'), null);
  assert.equal(hostFromUrl('chrome-extension://abc/block.html'), null);
  assert.equal(hostFromUrl(''), null);
  assert.equal(hostFromUrl(undefined), null);
});

test('hostMatches covers subdomains but not look-alike suffixes', () => {
  assert.equal(hostMatches('m.youtube.com', 'youtube.com'), true);
  assert.equal(hostMatches('youtube.com', 'youtube.com'), true);
  assert.equal(hostMatches('notyoutube.com', 'youtube.com'), false);
  assert.equal(hostMatches('youtube.com.evil.net', 'youtube.com'), false);
});

test('classifyHost picks the most specific entry', () => {
  const rules = { productive: ['docs.python.org'], half: [], unproductive: ['python.org'] };
  assert.deepEqual(classifyHost('docs.python.org', rules), { kind: 'productive', entry: 'docs.python.org' });
  assert.deepEqual(classifyHost('pypi.python.org', rules), { kind: 'unproductive', entry: 'python.org' });
  assert.deepEqual(classifyHost('example.org', rules), { kind: 'neutral', entry: null });
});

test('classifyHost breaks ties in favour of the stricter list', () => {
  const rules = { productive: ['site.com'], half: ['site.com'], unproductive: ['site.com'] };
  assert.equal(classifyHost('site.com', rules).kind, 'unproductive');
});

test('dedupeRules keeps the strictest list for a host that appears twice', () => {
  const out = dedupeRules({
    productive: ['a.com', 'b.com'],
    half: ['a.com', 'c.com'],
    unproductive: ['b.com'],
  });
  assert.deepEqual(out.unproductive, ['b.com']);
  assert.deepEqual(out.half, ['a.com', 'c.com']);
  assert.deepEqual(out.productive, []);
});

test('cleanHostList drops invalid and duplicate entries and caps length', () => {
  const list = cleanHostList(['https://x.com', 'x.com', 'bad host', 42, null, 'y.org']);
  assert.deepEqual(list, ['x.com', 'y.org']);
  const many = Array.from({ length: 500 }, (_, i) => `site${i}.com`);
  assert.equal(cleanHostList(many, 200).length, 200);
});

test('listOfEntry finds the list holding an exact entry', () => {
  const rules = { productive: ['a.com'], half: ['b.com'], unproductive: [] };
  assert.equal(listOfEntry('b.com', rules), 'half');
  assert.equal(listOfEntry('c.com', rules), null);
});
