import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLOCK_PAGE_PATH, MOTIVATION_PAGE_PATH } from '../../src/core/dnr';

/**
 * Chrome refuses to load an extension's own pages into the main frame of an incognito tab while the
 * extension runs in the default `"spanning"` incognito mode: the navigation ends at Chrome's own
 * `ERR_BLOCKED_BY_CLIENT` page even when *Allow in Incognito* is on.
 *
 * Every page EarnTime interrupts with is a page from its own package (`block.html`,
 * `motivation.html`), and the redirect rules point at them. So without `"incognito": "split"` the
 * pause and the block appear in a normal window and, in incognito, Chrome's blocked page appears
 * instead — which looks exactly like "the extension stops working in incognito".
 */
interface Manifest {
  incognito?: string;
  web_accessible_resources?: Array<{ resources?: string[]; matches?: string[] }>;
}

const manifest = JSON.parse(readFileSync(new URL('../../../manifest.json', import.meta.url), 'utf8')) as Manifest;

test('the extension asks Chrome for split incognito mode', () => {
  assert.equal(
    manifest.incognito,
    'split',
    'spanning mode is the default and Chrome will not load EarnTime pages in an incognito tab with it',
  );
});

test('every page EarnTime redirects to can be opened in an incognito tab', () => {
  const resources = (manifest.web_accessible_resources ?? []).flatMap((entry) => entry.resources ?? []);
  for (const path of [BLOCK_PAGE_PATH, MOTIVATION_PAGE_PATH]) {
    assert.ok(path.startsWith('/'), `${path} is a declarativeNetRequest extensionPath`);
    assert.ok(
      resources.includes(path.slice(1)),
      `${path} must be web accessible, or Chrome blocks a navigation redirected to it`,
    );
  }
});
