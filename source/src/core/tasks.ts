/** Daily to-do items that reward screen time. Each task pays at most once per local day (recurring) or once ever (one-off). */

import { MAX_TASK_REWARD_MIN, MAX_TITLE_LEN, MINUTE_MS } from './constants';
import { dayKey } from './time';
import type { Checked, EarnState, RuleResult, Task } from './types';
import { addLedger, creditEarned, statsFor } from './wallet';

export interface TaskInput {
  title: string;
  rewardMin: number;
  recurring: boolean;
}

export function validateTask(input: { title?: unknown; rewardMin?: unknown; recurring?: unknown }): Checked<TaskInput> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) return { ok: false, code: 'invalid', message: 'Give the task a name.' };
  if (title.length > MAX_TITLE_LEN) {
    return { ok: false, code: 'invalid', message: `Task names can be at most ${MAX_TITLE_LEN} characters.` };
  }
  const reward = typeof input.rewardMin === 'number' ? Math.round(input.rewardMin) : NaN;
  if (!Number.isFinite(reward) || reward < 1 || reward > MAX_TASK_REWARD_MIN) {
    return { ok: false, code: 'invalid', message: `Reward must be between 1 and ${MAX_TASK_REWARD_MIN} minutes.` };
  }
  return { ok: true, data: { title, rewardMin: reward, recurring: input.recurring === true } };
}

export function isDoneToday(task: Task, now: number): boolean {
  return task.recurring ? task.completedOn === dayKey(now) : task.completedOn !== null;
}

export function newTaskId(now: number, random: () => number = Math.random): string {
  return `t${now.toString(36)}${Math.floor(random() * 1_000_000).toString(36)}`;
}

/**
 * Toggles completion. Completing pays the reward once: recurring tasks once per local day,
 * one-off tasks once ever. Un-ticking never revokes a reward, and ticking again the same day
 * does not pay twice.
 */
export function toggleTask(state: EarnState, id: string, now: number): RuleResult<{ completed: boolean; rewardedMs: number }> {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return { ok: false, code: 'not-found', message: 'That task no longer exists.' };
  const today = dayKey(now);

  if (isDoneToday(task, now)) {
    task.completedOn = null;
    return { ok: true, data: { completed: false, rewardedMs: 0 } };
  }

  task.completedOn = today;
  const alreadyRewarded = task.recurring ? task.rewardedOn === today : task.rewardedOn !== null;
  let rewardedMs = 0;
  if (!alreadyRewarded) {
    rewardedMs = task.rewardMin * MINUTE_MS;
    task.rewardedOn = today;
    const { repaidMs } = creditEarned(state, rewardedMs, now, `task "${task.title}"`);
    const stats = statsFor(state, today);
    stats.earnedMs += rewardedMs;
    stats.taskMs += rewardedMs;
    stats.repaidMs += repaidMs;
    addLedger(state, 'task', now, rewardedMs, `Task completed: ${task.title}`);
  }
  return { ok: true, data: { completed: true, rewardedMs } };
}
