import { createInitialState } from '../../src/core/state';
import type { EarnState, Observation } from '../../src/core/types';

export const MIN = 60_000;
export const SEC = 1000;

/** Local-time instant (tests run with TZ=Asia/Kolkata). */
export function localTime(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number {
  return new Date(y, mo - 1, d, h, mi, s).getTime();
}

export const T0 = localTime(2026, 10, 8, 9, 0, 0);

export function freshState(setupDone = true): EarnState {
  const state = createInitialState(T0);
  state.setupDone = setupDone;
  state.settings.earnFromMin = 60;
  state.settings.earnToMin = 5;
  state.settings.unlockCostMin = 10;
  state.rules = {
    productive: ['khanacademy.org'],
    half: ['youtube.com'],
    unproductive: ['instagram.com'],
  };
  return state;
}

export function obs(partial: Partial<Observation> & { at: number }): Observation {
  return {
    tabId: 1,
    windowId: 1,
    host: 'khanacademy.org',
    internalPage: false,
    focused: true,
    tabActive: true,
    idle: 'active',
    audible: false,
    incognito: false,
    filterState: 'n/a',
    ...partial,
  };
}
