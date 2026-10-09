/**
 * User commands from the popup, settings and setup pages. Each command validates first, pays any
 * unlock cost second, and only then mutates state, so a rejected command never half-applies.
 */

import {
  MAX_EARN_FROM_MIN,
  MAX_LIST_ITEMS,
  MAX_SETUP_BALANCE_MIN,
  MAX_UNLOCK_COST_MIN,
  MINUTE_MS,
  SCHEMA_VERSION,
} from './constants';
import { cleanHostList, dedupeRules } from './state';
import { normalizeHostInput, listOfEntry } from './domains';
import { normalizeName } from './matchers';
import { payUnlock, ratioLoosens, siteChangeLoosens } from './protection';
import { newTaskId, toggleTask, validateTask } from './tasks';
import type { Checked, EarnState, ListName, RuleErrorCode, RuleResult, Settings, Task } from './types';
import { addLedger, pruneDays } from './wallet';

export interface SetupPayload {
  earnFromMin: number;
  earnToMin: number;
  unlockCostMin: number;
  initialBalanceMin: number;
  productive: string[];
  half: string[];
  unproductive: string[];
  youtubeKeywords: string[];
  tasks: Array<{ title: string; rewardMin: number; recurring: boolean }>;
}

/**
 * `confirm` is set by the UI when the user has already accepted a change that costs screen time.
 * Every command here is quoted first and charged only on the second, confirmed call.
 */
export type Command =
  | { type: 'setup.complete'; payload: SetupPayload }
  | { type: 'ratio.set'; earnFromMin: number; earnToMin: number; confirm?: boolean }
  | { type: 'unlock.set'; minutes: number; confirm?: boolean }
  | { type: 'site.add'; list: ListName; host: string; confirm?: boolean }
  | { type: 'site.remove'; host: string; confirm?: boolean }
  | { type: 'site.move'; host: string; to: ListName; confirm?: boolean }
  | { type: 'youtube.add'; keyword: string }
  | { type: 'youtube.remove'; keyword: string }
  | { type: 'task.add'; title: string; rewardMin: number; recurring: boolean; confirm?: boolean }
  | { type: 'task.update'; id: string; title?: string; rewardMin?: number; recurring?: boolean; confirm?: boolean }
  | { type: 'task.delete'; id: string }
  | { type: 'task.toggle'; id: string };

const LIST_LABEL: Record<ListName, string> = {
  productive: 'Productive',
  half: 'Half-productive',
  unproductive: 'Unproductive',
};

function fail(code: RuleErrorCode, message: string): RuleResult {
  return { ok: false, code, message };
}

function validEarn(from: unknown, to: unknown): Checked<{ earnFromMin: number; earnToMin: number }> {
  const f = typeof from === 'number' ? Math.round(from) : NaN;
  const t = typeof to === 'number' ? Math.round(to) : NaN;
  if (!Number.isFinite(f) || f < 1 || f > MAX_EARN_FROM_MIN) {
    return { ok: false, code: 'invalid', message: `Productive minutes must be between 1 and ${MAX_EARN_FROM_MIN}.` };
  }
  if (!Number.isFinite(t) || t < 1 || t > f) {
    return { ok: false, code: 'invalid', message: 'Earned minutes must be at least 1 and no more than the productive minutes.' };
  }
  return { ok: true, data: { earnFromMin: f, earnToMin: t } };
}

function findPlace(state: EarnState, host: string): ListName | null {
  return listOfEntry(host, state.rules);
}

/**
 * Charges a loosening change, but only once the user has confirmed the quoted price. `reason` goes
 * to the ledger; `label` is the sentence the confirmation prompt shows.
 */
function charge(
  state: EarnState,
  now: number,
  minutes: number,
  reason: string,
  label: string,
  confirmed: boolean | undefined,
): RuleResult {
  return payUnlock(state, minutes, now, reason, { label, confirmed: confirmed === true });
}

function applyRatio(state: EarnState, now: number, from: number, to: number, confirmed: boolean | undefined): RuleResult {
  const { earnFromMin: oldFrom, earnToMin: oldTo } = state.settings;
  if (state.setupDone && ratioLoosens(oldFrom, oldTo, from, to)) {
    const paid = charge(state, now, state.settings.unlockCostMin, 'earn ratio', `Raising the earn ratio to ${from}:${to}`, confirmed);
    if (!paid.ok) return paid;
  }
  state.settings.earnFromMin = from;
  state.settings.earnToMin = to;
  addLedger(state, 'rule', now, 0, `Earn rule set to ${from} productive min → ${to} min`);
  return { ok: true };
}

function applySite(state: EarnState, now: number, cmd: Extract<Command, { type: 'site.add' | 'site.remove' | 'site.move' }>): RuleResult {
  if (cmd.type === 'site.add') {
    const host = normalizeHostInput(cmd.host);
    if (!host) return fail('invalid', 'Enter a website such as example.com.');
    const current = findPlace(state, host);
    if (current === cmd.list) return fail('duplicate', `${host} is already in ${LIST_LABEL[cmd.list].toLowerCase()} sites.`);
    if (current) return fail('duplicate', `${host} is already in ${LIST_LABEL[current].toLowerCase()} sites. Move it instead.`);
    if (state.rules[cmd.list].length >= MAX_LIST_ITEMS) return fail('limit', 'That list is full.');
    // A host that was on no list was already unrestricted, so listing it costs nothing.
    const cost = siteChangeLoosens('neutral', cmd.list) ? state.settings.unlockCostMin : 0;
    const paid = charge(
      state,
      now,
      cost,
      `add ${host} to ${cmd.list}`,
      `Adding ${host} to ${LIST_LABEL[cmd.list].toLowerCase()} sites`,
      cmd.confirm,
    );
    if (!paid.ok) return paid;
    state.rules[cmd.list].push(host);
    addLedger(state, 'rule', now, 0, `Added ${host} to ${LIST_LABEL[cmd.list].toLowerCase()} sites`, host);
    return { ok: true };
  }

  const host = normalizeHostInput(cmd.host);
  if (!host) return fail('invalid', 'Unknown website.');
  const current = findPlace(state, host);
  if (!current) return fail('not-found', `${host} is not on any list.`);

  if (cmd.type === 'site.remove') {
    const cost = siteChangeLoosens(current, 'neutral') ? state.settings.unlockCostMin : 0;
    const paid = charge(
      state,
      now,
      cost,
      `remove ${host}`,
      `Removing ${host} from ${LIST_LABEL[current].toLowerCase()} sites`,
      cmd.confirm,
    );
    if (!paid.ok) return paid;
    state.rules[current] = state.rules[current].filter((h) => h !== host);
    addLedger(state, 'rule', now, 0, `Removed ${host} from ${LIST_LABEL[current].toLowerCase()} sites`, host);
    return { ok: true };
  }

  // site.move
  if (current === cmd.to) return { ok: true };
  if (state.rules[cmd.to].length >= MAX_LIST_ITEMS) return fail('limit', 'That list is full.');
  const cost = siteChangeLoosens(current, cmd.to) ? state.settings.unlockCostMin : 0;
  const paid = charge(
    state,
    now,
    cost,
    `move ${host} to ${cmd.to}`,
    `Moving ${host} to ${LIST_LABEL[cmd.to].toLowerCase()} sites`,
    cmd.confirm,
  );
  if (!paid.ok) return paid;
  state.rules[current] = state.rules[current].filter((h) => h !== host);
  state.rules[cmd.to].push(host);
  addLedger(state, 'rule', now, 0, `Moved ${host} to ${LIST_LABEL[cmd.to].toLowerCase()} sites`, host);
  return { ok: true };
}

function applyYouTubeKeyword(state: EarnState, now: number, value: string, add: boolean): RuleResult {
  const list = state.settings.youtubeKeywords;
  const label = 'YouTube keyword';
  const trimmed = value.trim();
  if (!trimmed) return fail('invalid', 'Enter a YouTube keyword.');
  if (trimmed.length > 80) return fail('invalid', 'YouTube keyword names can be at most 80 characters.');
  const key = normalizeName(trimmed);
  const index = list.findIndex((item) => normalizeName(item) === key);

  if (!add) {
    if (index < 0) return fail('not-found', 'That YouTube keyword is not in the list.');
    list.splice(index, 1);
    addLedger(state, 'rule', now, 0, `Removed ${label.toLowerCase()} "${trimmed}"`);
    return { ok: true };
  }

  if (index >= 0) return fail('duplicate', `That ${label.toLowerCase()} is already in the list.`);
  if (list.length >= MAX_LIST_ITEMS) return fail('limit', 'That list is full.');
  // Free: keywords only decide what counts as study inside a mode the user already chose.
  list.push(trimmed);
  addLedger(state, 'rule', now, 0, `Added ${label.toLowerCase()} "${trimmed}"`);
  return { ok: true };
}

function applyTaskCommand(state: EarnState, now: number, cmd: Extract<Command, { type: `task.${string}` }>): RuleResult {
  switch (cmd.type) {
    case 'task.add': {
      const valid = validateTask(cmd);
      if (!valid.ok) return valid;
      const paid = charge(
        state,
        now,
        state.settings.unlockCostMin,
        `new task "${valid.data.title}"`,
        `Adding the task "${valid.data.title}"`,
        cmd.confirm,
      );
      if (!paid.ok) return paid;
      const task: Task = {
        id: newTaskId(now),
        title: valid.data.title,
        rewardMin: valid.data.rewardMin,
        recurring: valid.data.recurring,
        createdAt: now,
        completedOn: null,
        rewardedOn: null,
      };
      state.tasks.push(task);
      addLedger(state, 'rule', now, 0, `Task added: ${task.title} (+${task.rewardMin} min)`);
      return { ok: true, data: task.id };
    }
    case 'task.update': {
      const task = state.tasks.find((t) => t.id === cmd.id);
      if (!task) return fail('not-found', 'That task no longer exists.');
      const next = validateTask({
        title: cmd.title ?? task.title,
        rewardMin: cmd.rewardMin ?? task.rewardMin,
        recurring: cmd.recurring ?? task.recurring,
      });
      if (!next.ok) return next;
      const rewardUp = next.data.rewardMin > task.rewardMin;
      const becameRecurring = next.data.recurring && !task.recurring;
      if (rewardUp || becameRecurring) {
        const paid = charge(
          state,
          now,
          state.settings.unlockCostMin,
          `change task "${task.title}"`,
          `Changing the task "${task.title}"`,
          cmd.confirm,
        );
        if (!paid.ok) return paid;
      }
      task.title = next.data.title;
      task.rewardMin = next.data.rewardMin;
      task.recurring = next.data.recurring;
      addLedger(state, 'rule', now, 0, `Task updated: ${task.title} (+${task.rewardMin} min)`);
      return { ok: true };
    }
    case 'task.delete': {
      const before = state.tasks.length;
      state.tasks = state.tasks.filter((t) => t.id !== cmd.id);
      if (state.tasks.length === before) return fail('not-found', 'That task no longer exists.');
      addLedger(state, 'rule', now, 0, 'Task deleted');
      return { ok: true };
    }
    case 'task.toggle':
      return toggleTask(state, cmd.id, now);
  }
  return fail('invalid', 'Unknown task command.');
}

/** Applies a setup payload exactly once. Re-running setup would be a way to reset the balance, so it is refused. */
export function applySetup(state: EarnState, payload: SetupPayload, now: number): RuleResult {
  if (state.setupDone) return fail('invalid', 'Setup is already complete.');
  const ratio = validEarn(payload.earnFromMin, payload.earnToMin);
  if (!ratio.ok) return ratio;
  const cost = Math.round(payload.unlockCostMin);
  if (!Number.isFinite(cost) || cost < 0 || cost > MAX_UNLOCK_COST_MIN) {
    return fail('invalid', `Unlock cost must be between 0 and ${MAX_UNLOCK_COST_MIN} minutes.`);
  }
  const initial = Math.round(payload.initialBalanceMin);
  if (!Number.isFinite(initial) || initial < 0 || initial > MAX_SETUP_BALANCE_MIN) {
    return fail('invalid', `Starting balance must be between 0 and ${MAX_SETUP_BALANCE_MIN} minutes.`);
  }

  const cleaned = {
    productive: cleanHostList(payload.productive),
    half: cleanHostList(payload.half),
    unproductive: cleanHostList(payload.unproductive),
  };
  const deduped = dedupeRules(cleaned);
  const totalInput = cleaned.productive.length + cleaned.half.length + cleaned.unproductive.length;
  const totalKept = deduped.productive.length + deduped.half.length + deduped.unproductive.length;
  if (totalInput !== totalKept) return fail('duplicate', 'A website can be on only one list. Remove the duplicate and try again.');
  for (const raw of [...payload.productive, ...payload.half, ...payload.unproductive]) {
    if (typeof raw === 'string' && raw.trim() && !normalizeHostInput(raw)) {
      return fail('invalid', `"${raw}" is not a website EarnTime can use.`);
    }
  }

  const tasks: Task[] = [];
  for (const draft of payload.tasks) {
    const valid = validateTask(draft);
    if (!valid.ok) return valid;
    tasks.push({
      id: newTaskId(now + tasks.length),
      title: valid.data.title,
      rewardMin: valid.data.rewardMin,
      recurring: valid.data.recurring,
      createdAt: now,
      completedOn: null,
      rewardedOn: null,
    });
  }

  const settings: Settings = {
    earnFromMin: ratio.data.earnFromMin,
    earnToMin: ratio.data.earnToMin,
    unlockCostMin: cost,
    youtubeKeywords: payload.youtubeKeywords.map((k) => k.trim()).filter(Boolean).slice(0, 60),
  };
  state.settings = settings;
  state.rules = { productive: deduped.productive, half: deduped.half, unproductive: deduped.unproductive };
  state.balanceMs = initial * MINUTE_MS;
  state.tasks = tasks;
  state.setupDone = true;
  addLedger(
    state,
    'setup',
    now,
    state.balanceMs,
    `Setup complete: ${settings.earnFromMin}:${settings.earnToMin} rule, ${initial} min starting balance, ${totalKept} sites`,
  );
  return { ok: true };
}

export function applyCommand(state: EarnState, cmd: Command, now: number): RuleResult {
  switch (cmd.type) {
    case 'setup.complete':
      return applySetup(state, cmd.payload, now);
    case 'ratio.set': {
      const ratio = validEarn(cmd.earnFromMin, cmd.earnToMin);
      if (!ratio.ok) return ratio;
      return applyRatio(state, now, ratio.data.earnFromMin, ratio.data.earnToMin, cmd.confirm);
    }
    case 'unlock.set': {
      const minutes = Math.round(cmd.minutes);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_UNLOCK_COST_MIN) {
        return fail('invalid', `Unlock cost must be between 0 and ${MAX_UNLOCK_COST_MIN} minutes.`);
      }
      const old = state.settings.unlockCostMin;
      if (minutes < old) {
        // Lowering the cost of changes is itself a loosening, so it costs the current price.
        const paid = charge(state, now, old, 'lower unlock cost', `Lowering the unlock cost to ${minutes} min`, cmd.confirm);
        if (!paid.ok) return paid;
      }
      state.settings.unlockCostMin = minutes;
      addLedger(state, 'rule', now, 0, `Unlock cost set to ${minutes} min`);
      return { ok: true };
    }
    case 'site.add':
    case 'site.remove':
    case 'site.move':
      return applySite(state, now, cmd);
    case 'youtube.add':
      return applyYouTubeKeyword(state, now, cmd.keyword, true);
    case 'youtube.remove':
      return applyYouTubeKeyword(state, now, cmd.keyword, false);
    case 'task.add':
    case 'task.update':
    case 'task.delete':
    case 'task.toggle':
      return applyTaskCommand(state, now, cmd);
  }
  return fail('invalid', 'Unknown command.');
}

/** Read-only audit export. Hosts only: no page URLs, titles or search terms are included. */
export function auditExport(state: EarnState, now: number): Record<string, unknown> {
  pruneDays(state);
  return {
    exportedAt: new Date(now).toISOString(),
    schema: SCHEMA_VERSION,
    note: 'Read-only audit export. Editing this file does not change EarnTime.',
    settings: state.settings,
    rules: state.rules,
    balanceMinutes: +(state.balanceMs / MINUTE_MS).toFixed(2),
    debtMinutes: +(state.debtMs / MINUTE_MS).toFixed(2),
    debtOriginMinutes: +(state.debtOriginMs / MINUTE_MS).toFixed(2),
    lastReconcile: state.lastReconcile,
    days: state.days,
    ledger: state.ledger.map((e) => ({
      at: new Date(e.at).toISOString(),
      kind: e.kind,
      minutes: +(e.ms / MINUTE_MS).toFixed(2),
      host: e.host ?? null,
      note: e.note,
    })),
    tasks: state.tasks,
  };
}
