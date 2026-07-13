import { StorageData, DEFAULT_SETTINGS, DEFAULT_WALLET, DEFAULT_TIMER, AppSettings, WalletState, TimerState } from '../types';

let state: StorageData = {
  settings: DEFAULT_SETTINGS,
  wallet: DEFAULT_WALLET,
  timer: DEFAULT_TIMER,
  lastResetDate: new Date().toISOString().split('T')[0]
};

let activeBlockedTabId: number | null = null;
let activeTabUrl: string | null = null;
let lastConsumptionTick = Date.now();

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(null) as Partial<StorageData>;
  state = {
    settings: stored.settings || DEFAULT_SETTINGS,
    wallet: stored.wallet || DEFAULT_WALLET,
    timer: stored.timer || DEFAULT_TIMER,
    lastResetDate: stored.lastResetDate || new Date().toISOString().split('T')[0]
  };
  await chrome.storage.local.set(state);
  setupAlarms();
});

// Load state into memory
const loadState = async () => {
  const stored = await chrome.storage.local.get(null) as Partial<StorageData>;
  if (stored.settings) state.settings = stored.settings;
  if (stored.wallet) state.wallet = stored.wallet;
  if (stored.timer) state.timer = stored.timer;
  if (stored.lastResetDate) state.lastResetDate = stored.lastResetDate;
  checkDailyReset();
};

const saveState = async () => {
  await chrome.storage.local.set(state);
};

const checkDailyReset = () => {
  const today = new Date().toISOString().split('T')[0];
  if (state.lastResetDate !== today) {
    state.wallet.todayEarnedSeconds = 0;
    state.wallet.todaySpentSeconds = 0;
    state.lastResetDate = today;
    saveState();
  }
};

const notify = (message: string) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'EarnTime',
    message
  });
};

const checkBlockedDomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return state.settings.blockedSites.some(site => hostname.includes(site));
  } catch {
    return false;
  }
};

const checkHalfUnproductiveDomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return state.settings.halfUnproductiveSites.some(site => hostname.includes(site));
  } catch {
    return false;
  }
};

const checkProductiveDomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return state.settings.productiveSites.some(site => hostname.includes(site));
  } catch {
    return false;
  }
};

const handleStudyTabStatus = () => {
  if (!state.timer.isStudying) {
    if (state.timer.activeProductiveTimestamp) {
       const elapsed = (Date.now() - state.timer.activeProductiveTimestamp) / 1000;
       state.timer.accumulatedSeconds += elapsed;
       state.timer.activeProductiveTimestamp = null;
    }
    return;
  }

  const currentlyOnProductive = activeTabUrl && checkProductiveDomain(activeTabUrl);

  if (currentlyOnProductive && !state.timer.activeProductiveTimestamp) {
     state.timer.activeProductiveTimestamp = Date.now();
  } else if (!currentlyOnProductive && state.timer.activeProductiveTimestamp) {
     const elapsed = (Date.now() - state.timer.activeProductiveTimestamp) / 1000;
     state.timer.accumulatedSeconds += elapsed;
     state.timer.activeProductiveTimestamp = null;
  }
};

// Core Engine Loop
const tick = async () => {
  await loadState();
  const now = Date.now();
  let stateChanged = false;

  // Process Study Time
  if (state.timer.isStudying && state.timer.activeProductiveTimestamp) {
    const elapsedSinceStart = (now - state.timer.activeProductiveTimestamp) / 1000;
    const totalElapsed = state.timer.accumulatedSeconds + elapsedSinceStart;
    
    // Check for rewards
    const requiredSeconds = state.settings.studyMinutes * 60;
    const rewardSeconds = state.settings.rewardMinutes * 60;
    
    if (totalElapsed - state.timer.lastRewardMilestoneSeconds >= requiredSeconds) {
      state.wallet.balanceSeconds += rewardSeconds;
      state.wallet.todayEarnedSeconds += rewardSeconds;
      state.wallet.lifetimeEarnedSeconds += rewardSeconds;
      
      // Roll over active timestamp so we don't double count
      state.timer.accumulatedSeconds += elapsedSinceStart;
      state.timer.activeProductiveTimestamp = now;
      state.timer.lastRewardMilestoneSeconds += requiredSeconds;
      
      stateChanged = true;
      notify(`Congratulations! You studied for ${state.settings.studyMinutes}m and earned ${state.settings.rewardMinutes}m of screen time.`);
    }
  }

  // Process Consumption
  if (activeBlockedTabId !== null) {
    const deltaSeconds = (now - lastConsumptionTick) / 1000;
    if (deltaSeconds > 0 && state.wallet.balanceSeconds > 0) {
      const consumed = Math.min(state.wallet.balanceSeconds, deltaSeconds);
      state.wallet.balanceSeconds -= consumed;
      state.wallet.todaySpentSeconds += consumed;
      stateChanged = true;

      if (state.wallet.balanceSeconds <= 0) {
        state.wallet.balanceSeconds = 0;
        notify('Screen time exhausted. Time to study!');
        // Tell content script to block immediately
        chrome.tabs.sendMessage(activeBlockedTabId, { type: 'BLOCK_NOW' }).catch(() => {});
      } else if (Math.floor(state.wallet.balanceSeconds) === 120 && Math.floor(state.wallet.balanceSeconds + consumed) > 120) {
        notify('Only 2 minutes of screen time remaining.');
      }
    }
  }
  
  lastConsumptionTick = now;

  if (stateChanged) {
    await saveState();
  }
};

const setupAlarms = () => {
  chrome.alarms.create('tick', { periodInMinutes: 1/60 }); // Roughly every 1s
};

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tick') tick();
});

// Tab Tracking
const updateActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id && tab.url) {
    activeTabUrl = tab.url;
    if (checkBlockedDomain(tab.url)) {
      activeBlockedTabId = tab.id;
      lastConsumptionTick = Date.now();
    } else {
      activeBlockedTabId = null;
    }
  } else {
    activeTabUrl = null;
    activeBlockedTabId = null;
  }
  
  handleStudyTabStatus();
  saveState();
};

chrome.tabs.onActivated.addListener(updateActiveTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active) updateActiveTab();
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    activeBlockedTabId = null; // Browser minimized
  } else {
    updateActiveTab();
  }
});

// Messages from Popup/Content
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  loadState().then(async () => {
    if (msg.type === 'START_STUDY') {
      if (!state.timer.isStudying) {
        state.timer.isStudying = true;
        handleStudyTabStatus();
        await saveState();
      }
      sendResponse({ success: true });
    } 
    else if (msg.type === 'STOP_STUDY') {
      if (state.timer.isStudying) {
        if (state.timer.activeProductiveTimestamp) {
          const elapsed = (Date.now() - state.timer.activeProductiveTimestamp) / 1000;
          state.timer.accumulatedSeconds += elapsed;
          state.timer.activeProductiveTimestamp = null;
        }
        state.wallet.lifetimeStudySeconds += state.timer.accumulatedSeconds; // Save to lifetime on stop
        state.timer.isStudying = false;
        state.timer.accumulatedSeconds = 0;
        state.timer.lastRewardMilestoneSeconds = 0;
        await saveState();
      }
      sendResponse({ success: true });
    }
    else if (msg.type === 'PAUSE_STUDY') {
      if (state.timer.isStudying) {
        if (state.timer.activeProductiveTimestamp) {
          const elapsed = (Date.now() - state.timer.activeProductiveTimestamp) / 1000;
          state.timer.accumulatedSeconds += elapsed;
          state.timer.activeProductiveTimestamp = null;
        }
        state.timer.isStudying = false;
        await saveState();
      }
      sendResponse({ success: true });
    }
    else if (msg.type === 'RESUME_STUDY') {
       if (!state.timer.isStudying) {
        state.timer.isStudying = true;
        handleStudyTabStatus();
        await saveState();
       }
       sendResponse({ success: true });
    }
    else if (msg.type === 'CHECK_ACCESS') {
      const url = sender.tab?.url || '';
      const isBlocked = checkBlockedDomain(url);
      const isHalfUnproductive = checkHalfUnproductiveDomain(url);
      
      sendResponse({ 
        blocked: isBlocked && state.wallet.balanceSeconds <= 0, 
        balance: state.wallet.balanceSeconds,
        halfUnproductive: isHalfUnproductive
      });
    }
  });
  return true; 
});