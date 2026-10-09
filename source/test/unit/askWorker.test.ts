/**
 * The `page.init` retry. A page that loaded while the service worker was still starting used to get
 * no answer and silently do nothing, so it stayed open with no chooser and no session. These tests
 * cover the retry that closes most of that gap, and the budget that bounds it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askWorker, DEFAULT_BUDGET_MS, RETRY_PAUSES_MS } from '../../src/content/askWorker';

interface Recorder {
  /** Number of times the page has asked the worker. */
  attempts: number;
  /** Pauses used, in order. */
  pauses: number[];
}

/**
 * Stands in for the worker behind a clock this test controls, so the pause schedule and the budget
 * can be exercised without real time passing.
 *
 * The first `missing` attempts do not answer at all — the worker is not there yet — and every
 * attempt after that replies with `answer`. `costPerAttemptMs` is how long one round trip takes,
 * which is what eats into the budget.
 */
function harness(opts: { missing?: number; answer?: unknown; costPerAttemptMs?: number } = {}) {
  const missing = opts.missing ?? 0;
  const cost = opts.costPerAttemptMs ?? 0;
  const recorded: Recorder = { attempts: 0, pauses: [] };
  let clock = 0;

  return {
    recorded,
    send: async (): Promise<unknown> => {
      recorded.attempts += 1;
      clock += cost;
      return recorded.attempts <= missing ? undefined : opts.answer;
    },
    options: {
      sleep: async (ms: number) => {
        recorded.pauses.push(ms);
        clock += ms;
      },
      now: () => clock,
    },
  };
}

test('an answer on the first attempt is used immediately, with no retry and no pause', async () => {
  const h = harness({ answer: { ok: true } });
  const reply = await askWorker({ type: 'page.init' }, h.send, h.options);
  assert.deepEqual(reply, { ok: true });
  assert.equal(h.recorded.attempts, 1);
  assert.deepEqual(h.recorded.pauses, []);
});

test('a page that loads while the worker is still starting is answered once the worker is up', async () => {
  const h = harness({ missing: 2, answer: { ok: true, directive: { kind: 'choose' } } });
  const reply = await askWorker({ type: 'page.init' }, h.send, h.options);
  assert.deepEqual(reply, { ok: true, directive: { kind: 'choose' } });
  assert.equal(h.recorded.attempts, 3, 'it kept asking until the worker answered');
  assert.deepEqual(h.recorded.pauses, RETRY_PAUSES_MS.slice(0, 2), 'the pause grows between attempts');
});

test('a refusal is an answer and is not retried', async () => {
  const h = harness({ answer: { ok: false, error: { code: 'unavailable', message: 'nope' } } });
  const reply = await askWorker({ type: 'page.init' }, h.send, h.options);
  assert.equal((reply as { ok: boolean }).ok, false, 'the refusal is handed back to the page');
  assert.equal(h.recorded.attempts, 1, 'only a missing answer is worth retrying');
});

test('it gives up within the budget instead of asking forever', async () => {
  // The worker never comes up and each round trip is slow, so the budget runs out mid-schedule.
  const h = harness({ missing: Number.POSITIVE_INFINITY, costPerAttemptMs: 4000 });
  const reply = await askWorker({ type: 'page.init' }, h.send, { ...h.options, budgetMs: 15_000 });
  assert.equal(reply, undefined, 'the page is told there is no answer');
  assert.ok(
    h.recorded.attempts < RETRY_PAUSES_MS.length + 1,
    `it stopped before the schedule ran out (${h.recorded.attempts} attempts)`,
  );
  assert.ok(h.recorded.attempts > 1, 'but it did retry the first failure');
});



test('a tight budget stops the retrying at once', async () => {
  const h = harness({ missing: Number.POSITIVE_INFINITY });
  const reply = await askWorker({ type: 'page.init' }, h.send, { ...h.options, budgetMs: 0 });
  assert.equal(reply, undefined);
  assert.equal(h.recorded.attempts, 1, 'nothing was retried');
  assert.deepEqual(h.recorded.pauses, []);
});

test('the whole pause schedule fits inside the default budget', () => {
  const total = RETRY_PAUSES_MS.reduce((sum, ms) => sum + ms, 0);
  assert.ok(
    total < DEFAULT_BUDGET_MS,
    `every scheduled retry fits (${total}ms of pauses, ${DEFAULT_BUDGET_MS}ms budget)`,
  );
});

test('a worker that never comes up grows the pause, then repeats the last one until the budget', async () => {
  const h = harness({ missing: Number.POSITIVE_INFINITY });
  const reply = await askWorker({ type: 'page.init' }, h.send, h.options);
  assert.equal(reply, undefined);
  const pauses = h.recorded.pauses;
  assert.deepEqual(pauses.slice(0, RETRY_PAUSES_MS.length), RETRY_PAUSES_MS, 'the pause grows through the schedule first');
  assert.ok(pauses.length > RETRY_PAUSES_MS.length, 'it kept asking past the schedule (no reload needed)');
  const last = RETRY_PAUSES_MS[RETRY_PAUSES_MS.length - 1];
  assert.ok(pauses.slice(RETRY_PAUSES_MS.length).every((ms) => ms === last), 'the final pause repeats');
  const total = pauses.reduce((sum, ms) => sum + ms, 0);
  assert.ok(total <= DEFAULT_BUDGET_MS, `retries stay inside the budget (${total}ms)`);
});
