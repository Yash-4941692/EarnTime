/**
 * WhatsApp auto-reply rules. Pure logic only: matching, time-of-day windows, rate limits, message
 * templates and the send queue. The service worker decides *what* to send from here; the WhatsApp
 * content script decides *whether* it could actually be delivered, because only the page can drive
 * the composer.
 *
 * Two rules govern who can be messaged, and they are deliberately hard to get wrong:
 *
 *  1. A rule that names chats sends to exactly those chats, group or personal.
 *  2. A rule with no named chats is a *fallback*: it answers personal chats only. It never sends to
 *     a group, and it never sends to a chat on the Productive Mode chat list. A chat that EarnTime
 *     cannot classify is treated as a group, so an unknown chat is skipped rather than messaged.
 *
 * Nothing is sent unless WhatsApp Web is open in a tab: the extension has no other channel to
 * WhatsApp, and it deliberately does not use one.
 */

import {
  AUTOREPLY_LOG_LIMIT,
  AUTOREPLY_TTL_MS,
  MAX_AUTOREPLY_COOLDOWN_MIN,
  MAX_AUTOREPLY_MESSAGE_LEN,
  MAX_LIST_ITEMS,
} from './constants';
import { normalizeName } from './matchers';
import { dayKey } from './time';
import type { AutoReplyJob, AutoReplyRepeat, AutoReplyRule, AutoReplyTrigger, Checked, EarnState } from './types';

export interface AutoReplyInput {
  name?: unknown;
  trigger?: unknown;
  targets?: unknown;
  message?: unknown;
  taskTitles?: unknown;
  from?: unknown;
  to?: unknown;
  cooldownMin?: unknown;
  repeat?: unknown;
  enabled?: unknown;
}

const TRIGGERS: AutoReplyTrigger[] = ['incoming', 'task', 'window'];
const REPEATS: AutoReplyRepeat[] = ['every', 'daily', 'once'];

/** Most messages one poll may hand to the page, so a busy chat list cannot machine-gun WhatsApp. */
export const MAX_JOBS_PER_CYCLE = 3;

export function newAutoReplyId(now: number, random: () => number = Math.random): string {
  return `r${now.toString(36)}${Math.floor(random() * 1_000_000).toString(36)}`;
}

/** Parses "HH:MM" (24-hour, local) into minutes since midnight, or null when it is not a clock time. */
export function parseClock(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  if (hours > 23) return null;
  return hours * 60 + Number(match[2]);
}

/** Formats minutes since midnight back to "HH:MM". */
export function formatClock(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function minutesOfDay(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * True when `now` falls inside the rule's daily window. An empty window (both ends blank) is always
 * on. A window whose end is earlier than its start crosses midnight, e.g. 22:00–06:00.
 */
export function inTimeWindow(rule: Pick<AutoReplyRule, 'from' | 'to'>, now: number): boolean {
  const from = parseClock(rule.from);
  const to = parseClock(rule.to);
  if (from === null || to === null) return true;
  const m = minutesOfDay(now);
  return from <= to ? m >= from && m < to : m >= from || m < to;
}

function cleanNames(value: unknown, limit = MAX_LIST_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (out.some((existing) => normalizeName(existing) === normalizeName(trimmed))) continue;
    out.push(trimmed.slice(0, 80));
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Fills the placeholders a message may use. `{task}` is the task that was just ticked off and
 * `{time}` the local clock time, so one rule can announce every task:
 * "Yash Boss completed his today's {task}".
 */
export function renderMessage(template: string, vars: { task?: string; time?: string }): string {
  return template
    .replace(/\{task\}/gi, vars.task ?? '')
    .replace(/\{time\}/gi, vars.time ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function localTimeLabel(now: number): string {
  return new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export interface ValidAutoReply {
  name: string;
  trigger: AutoReplyTrigger;
  targets: string[];
  message: string;
  taskTitles: string[];
  from: string;
  to: string;
  cooldownMin: number;
  repeat: AutoReplyRepeat;
  enabled: boolean;
}

export function validateAutoReply(input: AutoReplyInput): Checked<ValidAutoReply> {
  const trigger = typeof input.trigger === 'string' ? input.trigger : 'incoming';
  if (!TRIGGERS.includes(trigger as AutoReplyTrigger)) {
    return { ok: false, code: 'invalid', message: 'Unknown auto-reply trigger.' };
  }
  const message = typeof input.message === 'string' ? input.message.replace(/\s+$/, '') : '';
  if (!message.trim()) return { ok: false, code: 'invalid', message: 'Write the message to send.' };
  if (message.length > MAX_AUTOREPLY_MESSAGE_LEN) {
    return { ok: false, code: 'invalid', message: `Messages can be at most ${MAX_AUTOREPLY_MESSAGE_LEN} characters.` };
  }
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length > 60) return { ok: false, code: 'invalid', message: 'Rule names can be at most 60 characters.' };

  const targets = cleanNames(input.targets);
  if (trigger !== 'incoming' && targets.length === 0) {
    return {
      ok: false,
      code: 'invalid',
      message: 'A task or scheduled reply must name at least one chat, so it can never message your whole contact list.',
    };
  }
  const taskTitles = cleanNames(input.taskTitles, 50);

  const fromRaw = typeof input.from === 'string' ? input.from.trim() : '';
  const toRaw = typeof input.to === 'string' ? input.to.trim() : '';
  const from = parseClock(fromRaw);
  const to = parseClock(toRaw);
  if ((fromRaw === '') !== (toRaw === '')) {
    return { ok: false, code: 'invalid', message: 'Set both ends of the time window, or leave both empty for “always”.' };
  }
  if (from !== null && to !== null && from === to) {
    return { ok: false, code: 'invalid', message: 'The window start and end cannot be the same time.' };
  }

  const cooldownRaw = typeof input.cooldownMin === 'number' ? Math.round(input.cooldownMin) : 0;
  const cooldownMin = Number.isFinite(cooldownRaw) ? Math.min(MAX_AUTOREPLY_COOLDOWN_MIN, Math.max(0, cooldownRaw)) : 0;
  const repeat = typeof input.repeat === 'string' && REPEATS.includes(input.repeat as AutoReplyRepeat)
    ? (input.repeat as AutoReplyRepeat)
    : 'daily';

  return {
    ok: true,
    data: {
      name: name || defaultMessageName(trigger as AutoReplyTrigger),
      trigger: trigger as AutoReplyTrigger,
      targets,
      message,
      taskTitles,
      from: from === null ? '' : formatClock(from),
      to: to === null ? '' : formatClock(to),
      cooldownMin,
      repeat,
      enabled: input.enabled !== false,
    },
  };
}

export function defaultMessageName(trigger: AutoReplyTrigger): string {
  if (trigger === 'task') return 'Task finished';
  if (trigger === 'window') return 'Scheduled message';
  return 'Auto-reply';
}

/** Key used for per-chat rate limiting. */
export function sentKey(ruleId: string, chat: string): string {
  return `${ruleId}|${normalizeName(chat)}`;
}

/**
 * True when this rule may send to `chat` again right now. `daily` overrides the rule's own setting:
 * scheduled rules are always once a day, because their trigger ("WhatsApp is open during the
 * window") is true on every poll.
 */
export function maySendTo(state: EarnState, rule: AutoReplyRule, chat: string, now: number, daily = false): boolean {
  const previous = state.autoReplySent[sentKey(rule.id, chat)];
  if (!previous) return true;
  if (rule.repeat === 'once') return false;
  if ((rule.repeat === 'daily' || daily) && previous.day === dayKey(now)) return false;
  if (rule.cooldownMin > 0 && now - previous.at < rule.cooldownMin * 60_000) return false;
  return true;
}

function noteSent(state: EarnState, rule: AutoReplyRule, chat: string, now: number): void {
  state.autoReplySent[sentKey(rule.id, chat)] = { at: now, day: dayKey(now) };
  // Keep the map from growing without bound when chats are renamed or rules deleted.
  const keys = Object.keys(state.autoReplySent);
  if (keys.length > 500) {
    for (const key of keys.slice(0, keys.length - 500)) delete state.autoReplySent[key];
  }
}

/** True when `chat` is a group: named on the groups list, or classified as one by the page. */
export function isGroupChat(state: EarnState, chat: string, detected?: string[] | null): boolean {
  const name = normalizeName(chat);
  if (!name) return true;
  if (state.settings.whatsappGroups.some((group) => normalizeName(group) === name)) return true;
  if (detected && detected.some((group) => normalizeName(group) === name)) return true;
  return false;
}

/** True when the chat is on the Productive Mode chat list, which fallbacks always skip. */
export function isAllowedChat(state: EarnState, chat: string): boolean {
  const name = normalizeName(chat);
  return state.settings.whatsappChats.some((allowed) => normalizeName(allowed) === name);
}

/**
 * Every enabled `incoming` rule that answers `chat`. Named rules claim the chat; fallbacks (no named
 * chats) apply only when nothing named it, and only to personal chats that are not on the
 * Productive Mode list. All rules that apply fire, in list order, so a one-time introduction and a
 * standing reply can both be sent.
 *
 * `detectedGroups` carries the group names the page could identify, so a fallback can stay away from
 * groups even when the user has not listed them.
 */
export function incomingRulesFor(
  state: EarnState,
  chat: string,
  now: number,
  detectedGroups?: string[] | null,
): AutoReplyRule[] {
  const name = normalizeName(chat);
  if (!name) return [];
  const named: AutoReplyRule[] = [];
  const fallbacks: AutoReplyRule[] = [];
  for (const rule of state.autoReplies) {
    if (!rule.enabled || rule.trigger !== 'incoming') continue;
    if (!inTimeWindow(rule, now)) continue;
    if (rule.targets.length === 0) {
      fallbacks.push(rule);
      continue;
    }
    if (rule.targets.some((target) => normalizeName(target) === name)) named.push(rule);
  }
  const applicable = named.length > 0 ? named : fallbacks;
  if (named.length > 0) return applicable;
  // Fallbacks never reach a group, an unknown chat, or a chat you kept for Productive Mode.
  if (isGroupChat(state, chat, detectedGroups)) return [];
  if (isAllowedChat(state, chat)) return [];
  return applicable;
}

function makeJob(state: EarnState, rule: AutoReplyRule, chat: string, message: string, now: number): AutoReplyJob {
  const job: AutoReplyJob = {
    id: `j${now.toString(36)}${state.autoReplyQueue.length}${Math.floor(Math.random() * 1_000_000).toString(36)}`,
    ruleId: rule.id,
    chat,
    message,
    trigger: rule.trigger,
    createdAt: now,
    expiresAt: now + AUTOREPLY_TTL_MS,
  };
  state.autoReplyQueue.push(job);
  if (state.autoReplyQueue.length > 100) state.autoReplyQueue.splice(0, state.autoReplyQueue.length - 100);
  noteSent(state, rule, chat, now);
  return job;
}

/**
 * Queues one message for a specific chat, ignoring rate limits. Used by the "Send a test message"
 * button, so a test never consumes a real send slot.
 */
export function enqueueManual(state: EarnState, rule: AutoReplyRule, chat: string, now: number): AutoReplyJob {
  const job: AutoReplyJob = {
    id: `j${now.toString(36)}${state.autoReplyQueue.length}${Math.floor(Math.random() * 1_000_000).toString(36)}`,
    ruleId: rule.id,
    chat,
    message: renderMessage(rule.message, { time: localTimeLabel(now) }),
    trigger: rule.trigger,
    createdAt: now,
    expiresAt: now + AUTOREPLY_TTL_MS,
  };
  state.autoReplyQueue.push(job);
  return job;
}

/**
 * Plans the replies to a newly received message in `chat`. Returns the jobs queued (possibly none).
 */
export function planIncomingReplies(
  state: EarnState,
  chat: string,
  now: number,
  detectedGroups?: string[] | null,
): AutoReplyJob[] {
  if (!state.setupDone) return [];
  const jobs: AutoReplyJob[] = [];
  for (const rule of incomingRulesFor(state, chat, now, detectedGroups)) {
    if (!maySendTo(state, rule, chat, now)) continue;
    jobs.push(makeJob(state, rule, chat, renderMessage(rule.message, { time: localTimeLabel(now) }), now));
  }
  return jobs;
}

/**
 * Plans every scheduled ("window") reply that is due: the rule's window is open, WhatsApp Web is
 * being polled, and the chat has not been messaged by that rule today.
 */
export function planWindowReplies(state: EarnState, now: number): AutoReplyJob[] {
  if (!state.setupDone) return [];
  const jobs: AutoReplyJob[] = [];
  for (const rule of state.autoReplies) {
    if (!rule.enabled || rule.trigger !== 'window') continue;
    if (!inTimeWindow(rule, now)) continue;
    for (const chat of rule.targets) {
      // Scheduled rules fire once per local day per chat, whatever the rule's own repeat says.
      if (!maySendTo(state, rule, chat, now, true)) continue;
      jobs.push(makeJob(state, rule, chat, renderMessage(rule.message, { time: localTimeLabel(now) }), now));
    }
  }
  return jobs;
}

/** Queues the messages that announce a completed task, with `{task}` filled in. */
export function enqueueTaskReplies(state: EarnState, taskTitle: string, now: number): AutoReplyJob[] {
  if (!state.setupDone) return [];
  const jobs: AutoReplyJob[] = [];
  for (const rule of state.autoReplies) {
    if (!rule.enabled || rule.trigger !== 'task') continue;
    if (!inTimeWindow(rule, now)) continue;
    if (rule.taskTitles.length > 0 && !rule.taskTitles.some((t) => normalizeName(t) === normalizeName(taskTitle))) continue;
    for (const chat of rule.targets) {
      if (!maySendTo(state, rule, chat, now)) continue;
      const message = renderMessage(rule.message, { task: taskTitle, time: localTimeLabel(now) });
      jobs.push(makeJob(state, rule, chat, message, now));
    }
  }
  return jobs;
}

/**
 * Removes expired jobs and hands over at most `limit` of the rest, so a long queue is delivered a
 * few messages at a time instead of all at once.
 */
export function takeQueue(state: EarnState, now: number, limit = MAX_JOBS_PER_CYCLE): AutoReplyJob[] {
  const live = state.autoReplyQueue.filter((job) => job.expiresAt > now);
  state.autoReplyQueue = live.slice(limit);
  return live.slice(0, limit);
}

export function logAutoReply(
  state: EarnState,
  entry: { chat: string; ruleId: string; ok: boolean; detail: string },
  now: number,
): void {
  state.autoReplyLog.push({ id: state.nextAutoReplyLogId, at: now, ...entry });
  state.nextAutoReplyLogId += 1;
  if (state.autoReplyLog.length > AUTOREPLY_LOG_LIMIT) {
    state.autoReplyLog.splice(0, state.autoReplyLog.length - AUTOREPLY_LOG_LIMIT);
  }
}

/** Drops queue entries and send history belonging to rules that no longer exist. */
export function pruneAutoReplyState(state: EarnState, ruleIds: Iterable<string>): void {
  const live = new Set(ruleIds);
  state.autoReplyQueue = state.autoReplyQueue.filter((job) => live.has(job.ruleId));
  for (const key of Object.keys(state.autoReplySent)) {
    if (!live.has(key.split('|')[0])) delete state.autoReplySent[key];
  }
}

const REPEAT_LABEL: Record<AutoReplyRepeat, string> = {
  every: 'every time',
  daily: 'once a day per chat',
  once: 'once ever per chat',
};

/** Human-readable summary of a rule, used in the settings list. */
export function describeRule(rule: AutoReplyRule): string {
  const when =
    rule.trigger === 'task'
      ? rule.taskTitles.length > 0
        ? `when ${rule.taskTitles.join(', ')} is ticked off`
        : 'when any task is ticked off'
      : rule.trigger === 'window'
        ? 'on a schedule'
        : 'when they message you';
  const who = rule.targets.length > 0 ? rule.targets.join(', ') : 'personal chats (never groups)';
  const window = rule.from && rule.to ? ` · ${rule.from}–${rule.to}` : '';
  return `${when} → ${who} · ${REPEAT_LABEL[rule.repeat]}${window}`;
}
