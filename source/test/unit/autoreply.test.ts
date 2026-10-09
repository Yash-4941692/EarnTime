import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describeRule,
  enqueueManual,
  enqueueTaskReplies,
  formatClock,
  inTimeWindow,
  incomingRulesFor,
  isAllowedChat,
  isGroupChat,
  logAutoReply,
  maySendTo,
  parseClock,
  planIncomingReplies,
  planWindowReplies,
  renderMessage,
  sentKey,
  takeQueue,
  validateAutoReply,
} from '../../src/core/autoreply';
import { AUTOREPLY_LOG_LIMIT } from '../../src/core/constants';
import type { AutoReplyRule, EarnState } from '../../src/core/types';
import { MIN, T0, freshState, localTime } from './helpers';

function rule(partial: Partial<AutoReplyRule> = {}): AutoReplyRule {
  const base: AutoReplyRule = {
    id: 'r1',
    name: 'Rule',
    enabled: true,
    trigger: 'incoming',
    targets: [],
    message: 'I am studying, back later.',
    taskTitles: [],
    from: '',
    to: '',
    cooldownMin: 0,
    repeat: 'every',
  };
  return { ...base, ...partial };
}

/** State with setup done and one allowed (Productive Mode) chat named "Mom". */
function autoState(rules: AutoReplyRule[] = []): EarnState {
  const state = freshState(true);
  state.settings.whatsappChats = ['Mom'];
  state.settings.whatsappGroups = ['Progress Check'];
  state.autoReplies = rules;
  return state;
}

// ------------------------------------------------------------------ clock helpers

test('parseClock and formatClock round-trip a 24-hour local time', () => {
  assert.equal(parseClock('09:05'), 9 * 60 + 5);
  assert.equal(parseClock('0:00'), 0);
  assert.equal(parseClock('23:59'), 23 * 60 + 59);
  assert.equal(parseClock(' 8:30 '), 8 * 60 + 30);
  assert.equal(parseClock('24:00'), null);
  assert.equal(parseClock('9:5'), null);
  assert.equal(parseClock('nine'), null);
  assert.equal(parseClock(''), null);
  assert.equal(formatClock(9 * 60 + 5), '09:05');
  assert.equal(formatClock(0), '00:00');
});

test('a time window is open inside its bounds, closed outside, and may cross midnight', () => {
  const morning = { from: '08:00', to: '10:00' };
  assert.equal(inTimeWindow(morning, localTime(2026, 10, 8, 9, 0)), true);
  assert.equal(inTimeWindow(morning, localTime(2026, 10, 8, 8, 0)), true, 'the start is inclusive');
  assert.equal(inTimeWindow(morning, localTime(2026, 10, 8, 10, 0)), false, 'the end is exclusive');
  assert.equal(inTimeWindow(morning, localTime(2026, 10, 8, 7, 59)), false);

  const night = { from: '22:00', to: '06:00' };
  assert.equal(inTimeWindow(night, localTime(2026, 10, 8, 23, 30)), true);
  assert.equal(inTimeWindow(night, localTime(2026, 10, 8, 2, 0)), true, 'after midnight still counts');
  assert.equal(inTimeWindow(night, localTime(2026, 10, 8, 12, 0)), false);

  assert.equal(inTimeWindow({ from: '', to: '' }, localTime(2026, 10, 8, 3, 0)), true, 'an empty window is always on');
});

// ------------------------------------------------------------------ validation

test('a rule needs a message, and a task or scheduled rule must name its chats', () => {
  assert.equal(validateAutoReply({ trigger: 'incoming', message: '' }).ok, false);
  assert.equal(validateAutoReply({ trigger: 'incoming', message: 'Hi' }).ok, true);

  const task = validateAutoReply({ trigger: 'task', message: 'Done', targets: [] });
  assert.equal(task.ok, false, 'a task rule with no named chats could message everyone');
  assert.equal(validateAutoReply({ trigger: 'task', message: 'Done', targets: ['Progress Check'] }).ok, true);
  assert.equal(validateAutoReply({ trigger: 'window', message: 'Done', targets: [] }).ok, false);
  assert.equal(validateAutoReply({ trigger: 'incoming', message: 'Hi', targets: [] }).ok, true, 'an incoming rule may fall back');
});

test('validation rejects a half-written window, a zero-length window and an unknown trigger', () => {
  assert.equal(validateAutoReply({ trigger: 'incoming', message: 'Hi', from: '09:00', to: '' }).ok, false);
  assert.equal(validateAutoReply({ trigger: 'incoming', message: 'Hi', from: '09:00', to: '09:00' }).ok, false);
  assert.equal(validateAutoReply({ trigger: 'incoming', message: 'Hi', from: '09:00', to: '17:00' }).ok, true);
  assert.equal(validateAutoReply({ trigger: 'carrier-pigeon', message: 'Hi' }).ok, false);
  assert.equal(validateAutoReply({ trigger: 'incoming', message: 'x'.repeat(701) }).ok, false);
});

test('an unknown repeat falls back to once a day, and targets are de-duplicated case-insensitively', () => {
  const valid = validateAutoReply({ trigger: 'incoming', message: 'Hi', repeat: 'sometimes', targets: ['Mom', 'mom ', 'Dad'] });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.repeat, 'daily');
    assert.deepEqual(valid.data.targets, ['Mom', 'Dad']);
  }
});

test('{task} and {time} are filled into the message', () => {
  assert.equal(renderMessage("Yash Boss completed his today's {task}", { task: 'Chemistry Lecture' }), "Yash Boss completed his today's Chemistry Lecture");
  assert.equal(renderMessage('Done at {time}', { time: '9:05 pm' }), 'Done at 9:05 pm');
  assert.equal(renderMessage('{task}   {task}', { task: 'DPP' }), 'DPP DPP');
  assert.equal(renderMessage('No placeholders', {}), 'No placeholders');
});

// ------------------------------------------------------------------ who may be messaged

test('a fallback rule reaches personal chats only: never a group, never an allowed chat', () => {
  const fallback = rule({ id: 'f', targets: [] });
  const state = autoState([fallback]);

  assert.deepEqual(incomingRulesFor(state, 'Rahul', T0), [fallback], 'an ordinary personal chat is answered');
  assert.deepEqual(incomingRulesFor(state, 'Progress Check', T0), [], 'a listed group is never answered by a fallback');
  assert.deepEqual(incomingRulesFor(state, 'Mom', T0), [], 'a Productive Mode chat is left alone');
  assert.deepEqual(
    incomingRulesFor(state, 'Unknown Group', T0, ['Unknown Group']),
    [],
    'a chat the page identifies as a group is skipped',
  );
});

test('a rule that names a group does reach that group, and only it', () => {
  const state = autoState([rule({ id: 'g', targets: ['Progress Check'] })]);
  assert.equal(incomingRulesFor(state, 'Progress Check', T0).length, 1);
  assert.deepEqual(incomingRulesFor(state, 'Some Other Group', T0, ['Some Other Group']), []);
  assert.deepEqual(incomingRulesFor(state, 'Rahul', T0), [], 'a named rule is not a fallback');
});

test('named rules claim a chat, so fallbacks do not also fire for it', () => {
  const state = autoState([
    rule({ id: 'named', targets: ['Rahul'], message: 'personal' }),
    rule({ id: 'fallback', targets: [], message: 'generic' }),
  ]);
  assert.deepEqual(incomingRulesFor(state, 'Rahul', T0).map((r) => r.id), ['named']);
  assert.deepEqual(incomingRulesFor(state, 'Anyone Else', T0).map((r) => r.id), ['fallback']);
});

test('every matching fallback fires in list order, so an intro and a standing reply can both go', () => {
  const state = autoState([
    rule({ id: 'intro', targets: [], repeat: 'once', message: 'I am Jarvis.' }),
    rule({ id: 'standing', targets: [], repeat: 'daily', message: 'Studying right now.' }),
  ]);
  assert.deepEqual(incomingRulesFor(state, 'Rahul', T0).map((r) => r.id), ['intro', 'standing']);
});

test('disabled rules and rules outside their time window never fire', () => {
  const state = autoState([
    rule({ id: 'off', targets: [], enabled: false }),
    rule({ id: 'later', targets: [], from: '22:00', to: '23:00' }),
  ]);
  assert.deepEqual(incomingRulesFor(state, 'Rahul', T0), [], 'T0 is 09:00, outside 22:00–23:00');
  assert.equal(incomingRulesFor(state, 'Rahul', localTime(2026, 10, 8, 22, 30)).length, 1);
});

test('group and allowed-chat classification is by exact, case-insensitive name', () => {
  const state = autoState([]);
  assert.equal(isGroupChat(state, 'progress check'), true);
  assert.equal(isGroupChat(state, 'Rahul'), false);
  assert.equal(isGroupChat(state, 'Rahul', ['Rahul']), true, 'page detection counts too');
  assert.equal(isGroupChat(state, ''), true, 'an unreadable name is treated as a group');
  assert.equal(isAllowedChat(state, ' mom '), true);
  assert.equal(isAllowedChat(state, 'Dad'), false);
});

// ------------------------------------------------------------------ rate limits

test('repeat modes: every, once a local day, once ever', () => {
  const state = autoState([]);
  const every = rule({ id: 'a', repeat: 'every' });
  const daily = rule({ id: 'b', repeat: 'daily' });
  const once = rule({ id: 'c', repeat: 'once' });

  for (const r of [every, daily, once]) {
    assert.equal(maySendTo(state, r, 'Rahul', T0), true, `${r.id} has never sent`);
    state.autoReplySent[sentKey(r.id, 'Rahul')] = { at: T0, day: '2026-10-08' };
  }
  assert.equal(maySendTo(state, every, 'Rahul', T0 + 1000), true);
  assert.equal(maySendTo(state, daily, 'Rahul', T0 + 1000), false, 'same local day');
  assert.equal(maySendTo(state, daily, 'Rahul', localTime(2026, 10, 9, 9, 0)), true, 'next local day');
  assert.equal(maySendTo(state, once, 'Rahul', localTime(2027, 1, 1, 9, 0)), false, 'once means once');
});

test('a cooldown blocks a second send until it has elapsed', () => {
  const state = autoState([]);
  const r = rule({ id: 'a', repeat: 'every', cooldownMin: 30 });
  state.autoReplySent[sentKey('a', 'Rahul')] = { at: T0, day: '2026-10-08' };
  assert.equal(maySendTo(state, r, 'Rahul', T0 + 29 * MIN), false);
  assert.equal(maySendTo(state, r, 'Rahul', T0 + 31 * MIN), true);
});

// ------------------------------------------------------------------ planning

test('an incoming message queues one job per applicable rule and records the send', () => {
  const state = autoState([rule({ id: 'f', targets: [], repeat: 'daily' })]);
  const jobs = planIncomingReplies(state, 'Rahul', T0);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].chat, 'Rahul');
  assert.equal(jobs[0].ruleId, 'f');
  assert.equal(state.autoReplyQueue.length, 1);
  assert.deepEqual(planIncomingReplies(state, 'Rahul', T0), [], 'once a day per chat');
});

test('no auto-reply is planned before setup is complete', () => {
  const state = autoState([rule({ id: 'f', targets: [] })]);
  state.setupDone = false;
  assert.deepEqual(planIncomingReplies(state, 'Rahul', T0), []);
  assert.deepEqual(planWindowReplies(state, T0), []);
  assert.deepEqual(enqueueTaskReplies(state, 'DPP', T0), []);
});

test('a task rule announces the ticked task, filtered by task name and rendered with {task}', () => {
  const state = autoState([
    rule({ id: 'any', trigger: 'task', targets: ['Progress Check'], message: "Yash Boss completed his today's {task}", repeat: 'daily' }),
    rule({ id: 'dpp', trigger: 'task', targets: ['Progress Check'], taskTitles: ['DPP'], message: 'DPP done', repeat: 'daily' }),
  ]);
  const jobs = enqueueTaskReplies(state, 'DPP', T0);
  assert.deepEqual(jobs.map((j) => j.ruleId).sort(), ['any', 'dpp']);
  assert.equal(jobs.find((j) => j.ruleId === 'any')?.message, "Yash Boss completed his today's DPP");

  const other = enqueueTaskReplies(state, 'Chemistry Lecture', localTime(2026, 10, 9, 9, 0));
  assert.deepEqual(other.map((j) => j.ruleId), ['any'], 'the DPP-only rule does not fire for another task');
  assert.equal(other[0].message, "Yash Boss completed his today's Chemistry Lecture");
  assert.deepEqual(
    enqueueTaskReplies(state, 'Chemistry Lecture', localTime(2026, 10, 9, 9, 0)),
    [],
    'the daily limit still applies to the generic rule',
  );
});

test('a scheduled rule sends once per day per chat, and only inside its window', () => {
  const state = autoState([rule({ id: 'w', trigger: 'window', targets: ['Progress Check'], from: '08:00', to: '10:00', repeat: 'every' })]);
  assert.equal(planWindowReplies(state, localTime(2026, 10, 8, 7, 0)).length, 0, 'before the window');
  assert.equal(planWindowReplies(state, T0).length, 1, 'inside the window');
  assert.equal(planWindowReplies(state, T0 + 1000).length, 0, 'already sent today, even with repeat "every"');
  assert.equal(planWindowReplies(state, localTime(2026, 10, 9, 9, 0)).length, 1, 'next day');
});

test('the queue hands over a few jobs at a time and drops expired ones', () => {
  const state = autoState([rule({ id: 'f', targets: [] })]);
  for (const chat of ['A', 'B', 'C', 'D', 'E']) planIncomingReplies(state, chat, T0);
  assert.equal(state.autoReplyQueue.length, 5);
  assert.equal(takeQueue(state, T0, 3).length, 3, 'a burst is spread over several cycles');
  assert.equal(state.autoReplyQueue.length, 2);
  assert.deepEqual(takeQueue(state, T0 + 7 * 60 * MIN), [], 'the rest expired before WhatsApp was opened');
});

test('a manual test send bypasses the rate limits but does not consume a send slot', () => {
  const state = autoState([rule({ id: 'f', targets: ['Progress Check'], repeat: 'once' })]);
  const r = state.autoReplies[0];
  const job = enqueueManual(state, r, 'Progress Check', T0);
  assert.equal(job.chat, 'Progress Check');
  assert.equal(state.autoReplySent[sentKey('f', 'Progress Check')], undefined, 'a test does not use up the once-ever slot');
  assert.equal(maySendTo(state, r, 'Progress Check', T0), true);
});

test('the activity log is capped', () => {
  const state = autoState([]);
  for (let i = 0; i < AUTOREPLY_LOG_LIMIT + 20; i += 1) {
    logAutoReply(state, { chat: `Chat ${i}`, ruleId: 'r', ok: true, detail: 'Sent' }, T0 + i);
  }
  assert.equal(state.autoReplyLog.length, AUTOREPLY_LOG_LIMIT);
  assert.equal(state.autoReplyLog[state.autoReplyLog.length - 1].chat, `Chat ${AUTOREPLY_LOG_LIMIT + 19}`);
});

test('describeRule says who, when and how often', () => {
  const text = describeRule(rule({ trigger: 'task', targets: ['Progress Check'], repeat: 'daily' }));
  assert.ok(text.includes('Progress Check'), text);
  assert.ok(text.includes('once a day per chat'), text);
  assert.ok(describeRule(rule({ targets: [] })).includes('never groups'));
});
