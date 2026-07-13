export interface AppSettings {
  studyMinutes: number;
  rewardMinutes: number;
  blockedSites: string[];
  halfUnproductiveSites: string[];
  productiveSites: string[];
  dailyGoalHours: number;
}

export interface WalletState {
  balanceSeconds: number; // Stored in seconds for precision
  todayEarnedSeconds: number;
  todaySpentSeconds: number;
  lifetimeEarnedSeconds: number;
  lifetimeStudySeconds: number;
}

export interface TimerState {
  isStudying: boolean;
  activeProductiveTimestamp: number | null;
  accumulatedSeconds: number;
  lastRewardMilestoneSeconds: number;
}

export interface StorageData {
  settings: AppSettings;
  wallet: WalletState;
  timer: TimerState;
  lastResetDate: string; // YYYY-MM-DD
}

export const DEFAULT_SETTINGS: AppSettings = {
  studyMinutes: 25,
  rewardMinutes: 5,
  blockedSites: [],
  halfUnproductiveSites: [],
  productiveSites: [],
  dailyGoalHours: 4,
};

export const DEFAULT_WALLET: WalletState = {
  balanceSeconds: 0,
  todayEarnedSeconds: 0,
  todaySpentSeconds: 0,
  lifetimeEarnedSeconds: 0,
  lifetimeStudySeconds: 0,
};

export const DEFAULT_TIMER: TimerState = {
  isStudying: false,
  activeProductiveTimestamp: null,
  accumulatedSeconds: 0,
  lastRewardMilestoneSeconds: 0,
};