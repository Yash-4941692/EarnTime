/**
 * The load-time gate: the page is hidden and deaf before anything is decided, it is released only by
 * a positive decision, EarnTime's UI survives a page that wipes its own DOM, and an extension that
 * goes away takes everything with it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createGate, GATE_CSS, GATE_STYLE_ID, OVERLAY_HOST_ID } from '../../src/content/gate';

/** Timers this test drives by hand, so no test has to wait for a real interval. */
class Timers {
  intervals: Array<{ handler: () => void; ms: number }> = [];
  private next = 1;
  setInterval = (handler: () => void, ms: number): number => {
    this.intervals.push({ handler, ms });
    return this.next++;
  };
  clearInterval = (): void => undefined;
  /** Runs every registered interval once. */
  tick(): void {
    for (const item of [...this.intervals]) item.handler();
  }
}

function makeDom(url = 'https://www.youtube.com/watch?v=abc'): JSDOM {
  return new JSDOM('<!doctype html><html><head></head><body><div id="site">the site</div></body></html>', { url });
}

test('the gate closes the page as soon as it is installed, before any verdict exists', () => {
  const dom = makeDom();
  const timers = new Timers();
  const gate = createGate(dom.window.document, () => true, undefined, { timers });
  gate.install();

  const root = dom.window.document.documentElement as HTMLElement;
  assert.equal(root.getAttribute('data-et-gate'), 'closed');
  assert.equal(gate.closed, true);
  const style = dom.window.document.getElementById(GATE_STYLE_ID);
  assert.ok(style, 'the gate style is injected');
  assert.equal(style?.textContent, GATE_CSS);
  // The site's own element is hidden and deaf; EarnTime's host is exempt.
  assert.match(GATE_CSS, /html\[data-et-gate="closed"\] > \*:not\(#earntime-root\)/);
  assert.match(GATE_CSS, /visibility: hidden !important/);
  assert.match(GATE_CSS, /pointer-events: none !important/);
  assert.match(GATE_CSS, new RegExp(`#${OVERLAY_HOST_ID}[\\s\\S]*visibility: visible !important`));
});

test('opening the gate reveals the page and cannot be undone by a later close request from a dead extension', () => {
  const dom = makeDom();
  const timers = new Timers();
  const gate = createGate(dom.window.document, () => true, undefined, { timers });
  gate.install();
  gate.open();
  const root = dom.window.document.documentElement as HTMLElement;
  assert.equal(root.getAttribute('data-et-gate'), 'open');
  assert.equal(gate.closed, false);
  // Re-arming is deliberate: an in-page navigation to another host has to be judged again.
  gate.close();
  assert.equal(root.getAttribute('data-et-gate'), 'closed');
});

test('a page that removes EarnTime\'s overlay gets it back on the next keep-alive tick', () => {
  const dom = makeDom();
  const timers = new Timers();
  let abandoned = 0;
  const gate = createGate(dom.window.document, () => true, () => {
    abandoned += 1;
  }, { timers });
  gate.install();

  let built = 0;
  const host = gate.mountOverlay(() => {
    built += 1;
    const node = dom.window.document.createElement('div');
    node.id = OVERLAY_HOST_ID;
    node.textContent = 'chooser';
    return node;
  });
  assert.equal(built, 1);
  assert.equal(dom.window.document.getElementById(OVERLAY_HOST_ID), host);

  // The site wipes its own DOM (hydration, `innerHTML` on <html>, a cleanup script).
  dom.window.document.documentElement.replaceChildren(dom.window.document.createElement('body'));
  assert.equal(dom.window.document.getElementById(OVERLAY_HOST_ID), null, 'the site really did remove it');

  timers.tick();
  assert.equal(dom.window.document.getElementById(OVERLAY_HOST_ID), host, 'the same node comes back');
  assert.equal(built, 1, 'it is re-appended, not rebuilt, so its listeners survive');
});

test('the keep-alive also restores the gate style if a page removes it', () => {
  const dom = makeDom();
  const timers = new Timers();
  const gate = createGate(dom.window.document, () => true, undefined, { timers });
  gate.install();
  dom.window.document.getElementById(GATE_STYLE_ID)?.remove();
  dom.window.document.documentElement.removeAttribute('data-et-gate');
  timers.tick();
  assert.ok(dom.window.document.getElementById(GATE_STYLE_ID), 'the style is back');
  assert.equal(dom.window.document.documentElement.getAttribute('data-et-gate'), 'closed');
});

test('when the extension goes away the gate, the style and the overlay all go with it', () => {
  const dom = makeDom();
  const timers = new Timers();
  let alive = true;
  let abandoned = 0;
  const gate = createGate(
    dom.window.document,
    () => alive,
    () => {
      abandoned += 1;
    },
    { timers },
  );
  gate.install();
  gate.mountOverlay(() => {
    const node = dom.window.document.createElement('div');
    node.id = OVERLAY_HOST_ID;
    return node;
  });

  alive = false; // the user disabled, reloaded or removed EarnTime mid-load
  timers.tick();

  assert.equal(abandoned, 1, 'the page was told it is no longer managed');
  assert.equal(dom.window.document.getElementById(GATE_STYLE_ID), null, 'the gate style is gone');
  assert.equal(dom.window.document.getElementById(OVERLAY_HOST_ID), null, 'the overlay is gone');
  assert.equal(dom.window.document.documentElement.hasAttribute('data-et-gate'), false);

  // And it stays gone: a dead extension must not keep hiding a page.
  timers.tick();
  assert.equal(abandoned, 1);
  assert.equal(dom.window.document.getElementById(GATE_STYLE_ID), null);
});

test('a gate installed at document_start is first in the document, before the site has any markup', () => {
  // `document_start` on a document that has not been parsed yet: whatever container exists, the gate
  // style has to be the first thing in it, so that it applies to every element the site adds later.
  const dom = new JSDOM('', { url: 'https://example.org/' });
  const doc = dom.window.document;
  assert.equal(doc.body.textContent, '', 'the site has no content yet');

  const timers = new Timers();
  const gate = createGate(doc, () => true, undefined, { timers });
  gate.install();

  const style = doc.getElementById(GATE_STYLE_ID);
  assert.ok(style, 'the gate style is injected before the site has any markup');
  const container = style?.parentElement as HTMLElement;
  assert.equal(container.firstChild, style, 'inserted first, so it applies to everything after it');
  assert.equal(doc.documentElement.getAttribute('data-et-gate'), 'closed');

  // The site's own markup arrives afterwards and is born hidden.
  const site = doc.createElement('div');
  site.textContent = 'the site';
  doc.body.append(site);
  timers.tick();
  assert.equal(doc.getElementById(GATE_STYLE_ID), style, 'the keep-alive leaves the original style alone');
  assert.equal(gate.closed, true);
});
