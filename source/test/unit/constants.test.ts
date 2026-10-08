import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHROME_LIMITATION_SENTENCE, GUARDED_PAGE_PREFIXES } from '../../src/core/constants';

test('the chrome:// limitation sentence is exactly the wording required by the specification', () => {
  assert.equal(
    CHROME_LIMITATION_SENTENCE,
    'Chrome prevents extensions from completely controlling privileged `chrome://` pages. Therefore this protection cannot be made absolute using a standard Chrome extension alone.',
  );
});

test('the guard covers the extensions management pages', () => {
  assert.deepEqual([...GUARDED_PAGE_PREFIXES], ['chrome://extensions', 'chrome://settings/extensions']);
});
