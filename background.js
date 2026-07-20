let tickInterval = null;
let lastActiveNormalWindowId = null;

const DEFAULT_STATE = {
  wallet: {
    balance: 0.0, // Float minutes for high accuracy second-by-second ticks
    todayEarned: 0,
    todaySpent: 0.0,
    lifetimeSpent: 0.0,
    lifetimeEarned: 0,
    lifetimeStudy: 0,
    weeklyEarned: 0,
    monthlyEarned: 0
  },
  settings: {
    studyMinutes: 25,
    rewardMinutes: 1,
    dailyGoalHours: 1.0,
    theme: "dark",
    notifications: true
  },
  categories: {
    productive: [],
    halfUnproductive: [],
    unproductive: []
  },
  favorites: [],
  timer: {
    isActive: false,
    isPaused: false,
    currentSeconds: 0,
    targetSeconds: 1500,
    targetDomain: ""
  },
  nuclear: {
    isActive: false,
    endTime: 0,
    password: "",
    website: "",
    durationMinutes: 0
  },
  history: [],
  streaks: {
    current: 0,
    longest: 0,
    lastGoalMetDate: ""
  },
  dailyStudyHistory: {} // Date string (YYYY-MM-DD) -> Study seconds
};

// Setup background persistence and alarms
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (res) => {
    let update = {};
    for (let key in DEFAULT_STATE) {
      if (res[key] === undefined) {
        update[key] = DEFAULT_STATE[key];
      }
    }
    if (Object.keys(update).length > 0) {
      chrome.storage.local.set(update);
    }
  });
  
  // High reliability backup alarm to keep worker persistent
  chrome.alarms.create("dailyKeepAlive", { periodInMinutes: 1 });
});

// Track last focused normal browser window to avoid popup theft
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.windows.get(windowId, (win) => {
    if (win && win.type === 'normal') {
      lastActiveNormalWindowId = windowId;
    }
  });
});

// Resilient domain cleaner helper
function cleanDomain(urlOrHost) {
  try {
    let clean = urlOrHost.trim().toLowerCase();
    if (clean.includes("://")) {
      clean = new URL(clean).hostname;
    } else {
      clean = new URL("http://" + clean).hostname;
    }
    if (clean.startsWith("www.")) {
      clean = clean.substring(4);
    }
    return clean;
  } catch (e) {
    let clean = urlOrHost.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
    clean = clean.split("/")[0];
    return clean;
  }
}

// Check if domain matches (including subdomains)
function domainMatches(target, current) {
  const cleanTarget = cleanDomain(target);
  const cleanCurrent = cleanDomain(current);
  return cleanCurrent === cleanTarget || cleanCurrent.endsWith("." + cleanTarget);
}

// Keep service worker persistent via Port connections
let activePorts = new Set();
chrome.runtime.onConnect.addListener((port) => {
  activePorts.add(port);
  port.onDisconnect.addListener(() => {
    activePorts.delete(port);
  });
});

// Handle incoming control signals
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startFocusSession") {
    const domain = cleanDomain(request.domain);
    const targetUrl = "https://" + domain;
    
    chrome.storage.local.get(["timer", "settings", "nuclear"], (res) => {
      let timer = res.timer || {};
      let settings = res.settings || { studyMinutes: 25 };
      let nuclear = res.nuclear || { isActive: false };
      
      timer.isActive = true;
      timer.isPaused = false;
      timer.targetDomain = domain;
      timer.currentSeconds = 0;
      
      if (nuclear.isActive) {
        timer.targetSeconds = nuclear.durationMinutes * 60;
      } else {
        timer.targetSeconds = settings.studyMinutes * 60;
      }
      
      chrome.storage.local.set({ timer }, () => {
        // Open productive link inside a fresh tab to maintain workspace
        chrome.tabs.create({ url: targetUrl, active: true }, () => {
          sendResponse({ success: true });
        });
      });
    });
    return true; 
  }
  
  if (request.action === "stopFocusSession") {
    chrome.storage.local.get(["timer"], (res) => {
      let timer = res.timer || {};
      timer.isActive = false;
      timer.isPaused = false;
      chrome.storage.local.set({ timer }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === "pauseFocusSession") {
    chrome.storage.local.get(["timer"], (res) => {
      let timer = res.timer || {};
      timer.isPaused = true;
      chrome.storage.local.set({ timer }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === "resumeFocusSession") {
    chrome.storage.local.get(["timer"], (res) => {
      let timer = res.timer || {};
      timer.isPaused = false;
      chrome.storage.local.set({ timer }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

function runCentralizedTickingEngine() {
  chrome.windows.getAll({ populate: false }, (windows) => {
    if (!windows || windows.length === 0) return;
    
    // Fallback: locate normal window ID if popup took active focus
    let normalWindows = windows.filter(w => w.type === 'normal');
    if (normalWindows.length === 0) return;
    
    let targetWin = normalWindows.find(w => w.id === lastActiveNormalWindowId) || 
                    normalWindows.find(w => w.focused) || 
                    normalWindows[0];
                    
    chrome.windows.get(targetWin.id, { populate: true }, (winDetails) => {
      if (!winDetails || !winDetails.tabs) return;
      
      const activeTab = winDetails.tabs.find(t => t.active);
      if (!activeTab || !activeTab.url) return;
      
      const activeDomain = cleanDomain(activeTab.url);

      chrome.storage.local.get(null, (res) => {
        let timer = res.timer || { isActive: false, isPaused: false, currentSeconds: 0, targetSeconds: 1500 };
        let wallet = res.wallet || { balance: 0.0 };
        let categories = res.categories || { productive: [], halfUnproductive: [], unproductive: [] };
        let settings = res.settings || { studyMinutes: 25, rewardMinutes: 1 };
        let nuclear = res.nuclear || { isActive: false };
        let streaks = res.streaks || { current: 0, longest: 0 };
        let dailyStudyHistory = res.dailyStudyHistory || {};
        let history = res.history || [];

        let changed = false;

        // Auto collapse expired nuclear locks
        if (nuclear.isActive && Date.now() >= nuclear.endTime) {
          nuclear.isActive = false;
          changed = true;
          showNotification("Nuclear Focus Completed!", "Extreme lock has lifted successfully.");
        }

        // 1. Evaluate Study Tracking (Productive Sites matches)
        if (timer.isActive && !timer.isPaused) {
          const isAnyProductiveMatch = (categories.productive || []).some(d => domainMatches(d, activeDomain));
          if (isAnyProductiveMatch) {
            timer.currentSeconds += 1;
            changed = true;

            const todayStr = getTodayDateString();
            dailyStudyHistory[todayStr] = (dailyStudyHistory[todayStr] || 0) + 1;
            wallet.lifetimeStudy = (wallet.lifetimeStudy || 0) + 1;

            if (timer.currentSeconds >= timer.targetSeconds) {
              timer.isActive = false;
              
              let rewardMinutes = settings.rewardMinutes || 1;
              if (nuclear.isActive) {
                const ratio = nuclear.durationMinutes / (settings.studyMinutes || 25);
                rewardMinutes = Math.max(1, Math.round(ratio * (settings.rewardMinutes || 1)));
              }
              
              wallet.balance += rewardMinutes;
              wallet.todayEarned += rewardMinutes;
              wallet.lifetimeEarned += rewardMinutes;
              wallet.weeklyEarned = (wallet.weeklyEarned || 0) + rewardMinutes;
              wallet.monthlyEarned = (wallet.monthlyEarned || 0) + rewardMinutes;

              history.unshift({
                date: todayStr,
                startTime: new Date(Date.now() - (timer.targetSeconds * 1000)).toLocaleTimeString(),
                endTime: new Date().toLocaleTimeString(),
                duration: Math.round(timer.targetSeconds / 60),
                reward: rewardMinutes,
                website: activeDomain,
                status: "Completed"
              });

              showNotification("Focus Achieved! 🎉", `Awesome job! You earned ${rewardMinutes} minute(s) of screen time.`);
              checkDailyGoalProgress(dailyStudyHistory, settings, streaks);
            }
          }
        }

        // 2. Evaluate Unproductive Screen-Time Deductions (Subtracting second-by-second)
        const isUnproductive = (categories.unproductive || []).some(d => domainMatches(d, activeDomain));
        if (isUnproductive && !timer.isActive) {
          if (wallet.balance > 0) {
            const secondCost = 1.0 / 60.0;
            wallet.balance = Math.max(0, wallet.balance - secondCost);
            wallet.todaySpent += secondCost;
            wallet.lifetimeSpent += secondCost;
            changed = true;

            if (wallet.balance <= 0) {
              chrome.tabs.update(activeTab.id, { url: chrome.runtime.getURL("block.html") });
              showNotification("Out of Screen Time!", "Your recreational limits have expired. Study to resume.");
            }
          } else {
            chrome.tabs.update(activeTab.id, { url: chrome.runtime.getURL("block.html") });
          }
        }

        if (changed) {
          chrome.storage.local.set({ timer, wallet, dailyStudyHistory, streaks, history, nuclear });
        }
      });
    });
  });
}

// Fire the continuous evaluation interval
if (tickInterval) clearInterval(tickInterval);
tickInterval = setInterval(runCentralizedTickingEngine, 1000);

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function checkDailyGoalProgress(dHistory, settings, streaks) {
  const todayStr = getTodayDateString();
  const todaySeconds = dHistory[todayStr] || 0;
  const targetSeconds = (settings.dailyGoalHours || 1.0) * 3600;
  
  if (todaySeconds >= targetSeconds && streaks.lastGoalMetDate !== todayStr) {
    if (streaks.lastGoalMetDate === getYesterdayDateString()) {
      streaks.current += 1;
    } else {
      streaks.current = 1;
    }
    if (streaks.current > streaks.longest) {
      streaks.longest = streaks.current;
    }
    streaks.lastGoalMetDate = todayStr;
    chrome.storage.local.set({ streaks });
    showNotification("Daily Goal Met! 🎉", `Target of ${settings.dailyGoalHours} hour(s) reached!`);
  }
}

// Intercept immediate tabs loading to block unproductive sites if wallet balance is empty
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  chrome.storage.local.get(["wallet", "categories"], (res) => {
    const wallet = res.wallet || { balance: 0.0 };
    const categories = res.categories || { unproductive: [] };
    const domain = cleanDomain(details.url);
    
    const isUnproductive = categories.unproductive.some(d => domainMatches(d, domain));
    if (isUnproductive && wallet.balance <= 0) {
      chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("block.html") });
    }
  });
});

function showNotification(title, message) {
  chrome.storage.local.get(["settings"], (res) => {
    const settings = res.settings || {};
    if (settings.notifications !== false) {
      chrome.notifications?.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: title,
        message: message,
        priority: 2
      });
    }
  });
}
