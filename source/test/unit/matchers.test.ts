import { test } from 'node:test';
import assert from 'node:assert/strict';
import { channelAllowed, filterKindForHost, matchingKeyword, normalizeName, youtubePageKind } from '../../src/core/matchers';
import { DEFAULT_YOUTUBE_KEYWORDS } from '../../src/core/constants';

const KW = [...DEFAULT_YOUTUBE_KEYWORDS];

test('YouTube channel rule: contains a keyword, case-insensitive', () => {
  assert.equal(channelAllowed('Physics Wallah JEE Academy', KW), true);
  assert.equal(channelAllowed('nda guidance', KW), true);
  assert.equal(channelAllowed('STUDY WITH ME', KW), true);
  assert.equal(channelAllowed('Random Vlogs', KW), false);
});

test('YouTube channel rule fails closed for unknown or empty names', () => {
  assert.equal(channelAllowed(null, KW), false);
  assert.equal(channelAllowed(undefined, KW), false);
  assert.equal(channelAllowed('   ', KW), false);
  assert.equal(channelAllowed('JEE', []), false);
  assert.equal(channelAllowed('JEE', ['   ']), false);
});

test('YouTube keyword matching uses NFKC so full-width letters match', () => {
  assert.equal(normalizeName('ＰＷ Live'), 'pw live');
  assert.equal(channelAllowed('ＰＷ Live', KW), true);
});

test('matchingKeyword reports which keyword allowed the channel', () => {
  assert.equal(matchingKeyword('Learn Python', KW), 'Learn');
  assert.equal(matchingKeyword('Cooking', KW), null);
});

test('YouTube page kinds include keyword-checked channel and playlist browsing, but still block Shorts', () => {
  assert.equal(youtubePageKind('/'), 'home');
  assert.equal(youtubePageKind('/results'), 'search');
  assert.equal(youtubePageKind('/watch'), 'watch');
  assert.equal(youtubePageKind('/playlist'), 'playlist');
  assert.equal(youtubePageKind('/@SomeChannel'), 'channel');
  assert.equal(youtubePageKind('/@SomeChannel/videos'), 'channel');
  assert.equal(youtubePageKind('/channel/UC123/playlists'), 'channel');
  assert.equal(youtubePageKind('/c/SomeChannel/videos'), 'channel');
  assert.equal(youtubePageKind('/user/SomeChannel/videos'), 'channel');
  assert.equal(youtubePageKind('/shorts/abc'), 'shorts');
  assert.equal(youtubePageKind('/@SomeChannel/shorts'), 'shorts');
  assert.equal(youtubePageKind('/channel/UC123/shorts'), 'shorts');
  assert.equal(youtubePageKind('/feed/subscriptions'), 'other');
});

test('filterKindForHost maps hosts to content filters', () => {
  assert.equal(filterKindForHost('www.youtube.com'), 'youtube');
  assert.equal(filterKindForHost('youtube.com'), 'youtube');
  assert.equal(filterKindForHost('example.com'), null);
  assert.equal(filterKindForHost(null), null);
});
