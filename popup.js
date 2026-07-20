let activeTab = "home";
let currentCustomConfirmCallback = null;
let currentNuclearWizardStep = 1;

const dom = {
  tabs: document.querySelectorAll(".tab-btn"),
  sections: document.querySelectorAll(".tab-content"),
  walletTopBalance: document.getElementById("wallet-top-balance"),
  walletMainBalance: document.getElementById("wallet-main-balance"),
  walletTodayEarned: document.getElementById("wallet-today-earned"),
  walletTodaySpent: document.getElementById("wallet-today-spent"),
  walletLifetimeSpent: document.getElementById("wallet-lifetime-spent"),
  
  focusWebsiteSelect: document.getElementById("focus-website-select"),
  timerText: document.getElementById("timer-text"),
  timerProgressBar: document.getElementById("timer-progress-bar"),
  btnTimerStart: document.getElementById("btn-timer-start"),
  btnTimerStop: document.getElementById("btn-timer-stop"),
  
  btnTimerPause: document.getElementById("btn-timer-pause"),
  btnTimerResume: document.getElementById("btn-timer-resume"),
  btnTimerStopActive: document.getElementById("btn-timer-stop-active"),
  timerControlsDefault: document.getElementById("timer-controls-default"),
  timerControlsActive: document.getElementById("timer-controls-active"),
  
  homeDailyProgressText: document.getElementById("home-daily-progress-text"),
  homeDailyPct: document.getElementById("home-daily-pct"),
  homeDailyBar: document.getElementById("home-daily-bar"),
  
  addDomainInput: document.getElementById("add-domain-input"),
  addCategorySelect: document.getElementById("add-category-select"),
  btnAddWebsite: document.getElementById("btn-add-website"),
  searchFiltersInput: document.getElementById("search-filters-input"),
  filterListContainer: document.getElementById("filter-list-container"),
  
  settingsStudyInput: document.getElementById("settings-study-input"),
  settingsRewardInput: document.getElementById("settings-reward-input"),
  settingsGoalInput: document.getElementById("settings-goal-input"),
  btnExportData: document.getElementById("btn-export-data"),
  btnImportData: document.getElementById("btn-import-data"),
  btnFactoryReset: document.getElementById("btn-factory-reset"),
  
  nuclearSetupFlow: document.getElementById("nuclear-setup-flow"),
  nuclearStatusView: document.getElementById("nuclear-status-view"),
  nuclearSetupPassword: document.getElementById("nuclear-setup-password"),
  nuclearSetupDomain: document.getElementById("nuclear-setup-domain"),
  nuclearSetupDuration: document.getElementById("nuclear-setup-duration"),
  btnNuclearArm: document.getElementById("btn-nuclear-arm"),
  nuclearLockCountdown: document.getElementById("nuclear-lock-countdown"),
  nuclearLockDomain: document.getElementById("nuclear-lock-domain"),
  nuclearUnlockPassword: document.getElementById("nuclear-unlock-password"),
  btnNuclearUnlock: document.getElementById("btn-nuclear-unlock"),
  nuclearActiveBannerArea: document.getElementById("nuclear-active-banner-area"),
  nuclearProgressBar: document.getElementById("nuclear-progress-bar"),
  
  statsCurrentStreak: document.getElementById("stats-current-streak"),
  statsLongestStreak: document.getElementById("stats-longest-streak"),
  statsTotalStudy: document.getElementById("stats-total-study"),
  statsTotalEarned: document.getElementById("stats-total-earned"),
  achievementsBadgeGrid: document.getElementById("achievements-badge-grid"),
  svgWeeklyChart: document.getElementById("svg-weekly-chart"),
  
  customAlertModal: document.getElementById("custom-alert-modal"),
  customAlertTitle: document.getElementById("custom-alert-title"),
  customAlertBody: document.getElementById("custom-alert-body"),
  customAlertClose: document.getElementById("custom-alert-close"),
  
  customConfirmModal: document.getElementById("custom-confirm-modal"),
  customConfirmTitle: document.getElementById("custom-confirm-title"),
  customConfirmBody: document.getElementById("custom-confirm-body"),
  customConfirmCancel: document.getElementById("custom-confirm-cancel"),
  customConfirmOk: document.getElementById("custom-confirm-ok")
};

// Start keep alive runtime connection to back engine
try {
  chrome.runtime.connect({ name: "earntime-popup" });
} catch (e) {}

document.addEventListener("DOMContentLoaded", () => {
  // Realtime storage updates instantly update the UI without needing focus toggles
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      syncUIData();
    }
  });

  setupNuclearWizardNavigation();
  syncUIData();
});

function triggerAlert(title, message) {
  dom.customAlertTitle.textContent = title;
  dom.customAlertBody.textContent = message;
  dom.customAlertModal.style.display = "flex";
}

dom.customAlertClose.addEventListener("click", () => {
  dom.customAlertModal.style.display = "none";
});

function triggerConfirm(title, message, onConfirm) {
  dom.customConfirmTitle.textContent = title;
  dom.customConfirmBody.textContent = message;
  currentCustomConfirmCallback = onConfirm;
  dom.customConfirmModal.style.display = "flex";
}

dom.customConfirmCancel.addEventListener("click", () => {
  dom.customConfirmModal.style.display = "none";
  currentCustomConfirmCallback = null;
});

dom.customConfirmOk.addEventListener("click", () => {
  dom.customConfirmModal.style.display = "none";
  if (currentCustomConfirmCallback) currentCustomConfirmCallback();
  currentCustomConfirmCallback = null;
});

dom.tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    chrome.storage.local.get(["nuclear"], (res) => {
      const isNuclear = res.nuclear && res.nuclear.isActive;
      const target = tab.getAttribute("data-tab");
      
      if (isNuclear && (target === "settings" || target === "websites")) {
        triggerAlert("Settings Locked", "Filters, ratios, and profile settings are locked under Nuclear Mode.");
        return;
      }
      
      dom.tabs.forEach(t => t.classList.remove("active"));
      dom.sections.forEach(s => s.classList.remove("active"));
      
      tab.classList.add("active");
      document.getElementById(`tab-${target}`).classList.add("active");
      activeTab = target;
      
      syncUIData();
    });
  });
});

function setupNuclearWizardNavigation() {
  document.getElementById("btn-step-1-next").addEventListener("click", () => {
    if (!dom.nuclearSetupPassword.value.trim()) {
      triggerAlert("Empty Password", "Please configure a valid lock bypass password.");
      return;
    }
    setStep(2);
  });

  document.getElementById("btn-step-2-next").addEventListener("click", () => {
    if (!dom.nuclearSetupDomain.value) {
      triggerAlert("Missing Domain", "Configure productive domains under the Websites tab first.");
      return;
    }
    setStep(3);
  });

  document.getElementById("btn-step-2-back").addEventListener("click", () => {
    setStep(1);
  });

  document.getElementById("btn-step-3-back").addEventListener("click", () => {
    setStep(2);
  });
}

function setStep(stepNum) {
  currentNuclearWizardStep = stepNum;
  document.querySelectorAll(".step-panel").forEach(panel => panel.style.display = "none");
  document.querySelectorAll(".step-dot").forEach(dot => {
    dot.classList.remove("active", "completed");
    const dVal = parseInt(dot.textContent);
    if (dVal < stepNum) dot.classList.add("completed");
    if (dVal === stepNum) dot.classList.add("active");
  });
  document.getElementById(`step-panel-${stepNum}`).style.display = "block";
}

// Format fractional balance down to the second
function formatBalanceWithSeconds(minutesFloat) {
  const totalSecs = Math.max(0, Math.ceil(minutesFloat * 60));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

function syncUIData() {
  chrome.storage.local.get(null, (res) => {
    const wallet = res.wallet || { balance: 0.0, todayEarned: 0, todaySpent: 0.0, lifetimeSpent: 0.0, lifetimeEarned: 0, lifetimeStudy: 0 };
    const settings = res.settings || { studyMinutes: 25, rewardMinutes: 1, dailyGoalHours: 1.0 };
    const categories = res.categories || { productive: [], halfUnproductive: [], unproductive: [] };
    const timer = res.timer || { isActive: false, isPaused: false, currentSeconds: 0, targetSeconds: 1500, targetDomain: "" };
    const nuclear = res.nuclear || { isActive: false, endTime: 0, website: "", durationMinutes: 0 };
    let streaks = res.streaks || { current: 0, longest: 0, lastGoalMetDate: "" };
    
    // Auto-align streaks on reload
    streaks = validateStreaks(res.dailyStudyHistory || {}, settings, streaks);
    
    // Header & Balance (Syncs precisely down to the second in real time)
    const balanceStr = formatBalanceWithSeconds(wallet.balance);
    dom.walletTopBalance.textContent = balanceStr;
    dom.walletMainBalance.textContent = balanceStr;
    
    dom.walletTodayEarned.textContent = "+" + wallet.todayEarned + " min";
    dom.walletTodaySpent.textContent = "-" + formatBalanceWithSeconds(wallet.todaySpent);
    dom.walletLifetimeSpent.textContent = formatBalanceWithSeconds(wallet.lifetimeSpent);
    
    updateTimerWidget(timer, settings, nuclear);
    populateWebsitesSelector(categories.productive);
    
    // Daily progress tracking
    const todayStr = getTodayDateString();
    const todayStudySec = (res.dailyStudyHistory && res.dailyStudyHistory[todayStr]) || 0;
    const targetSec = settings.dailyGoalHours * 3600;
    const todayStudyMin = Math.floor(todayStudySec / 60);
    const targetMin = Math.floor(targetSec / 60);
    
    dom.homeDailyProgressText.textContent = `${todayStudyMin}m / ${targetMin}m`;
    const progressPct = Math.min(100, Math.floor((todayStudySec / targetSec) * 100));
    dom.homeDailyPct.textContent = `${progressPct}%`;
    dom.homeDailyBar.style.width = `${progressPct}%`;
    
    if (document.activeElement !== dom.settingsStudyInput) dom.settingsStudyInput.value = settings.studyMinutes;
    if (document.activeElement !== dom.settingsRewardInput) dom.settingsRewardInput.value = settings.rewardMinutes;
    if (document.activeElement !== dom.settingsGoalInput) dom.settingsGoalInput.value = settings.dailyGoalHours;
    
    if (nuclear.isActive) {
      dom.nuclearSetupFlow.style.display = "none";
      dom.nuclearStatusView.style.display = "block";
      dom.nuclearActiveBannerArea.style.display = "block";
      dom.nuclearLockDomain.textContent = nuclear.website;
      updateNuclearProgress(nuclear);
    } else {
      dom.nuclearSetupFlow.style.display = "block";
      dom.nuclearStatusView.style.display = "none";
      dom.nuclearActiveBannerArea.style.display = "none";
      populateNuclearWebsites(categories.productive);
    }
    
    renderFilterLists(categories, dom.searchFiltersInput.value);
    syncStreakMetrics(streaks, wallet);
    renderMilestoneBadges(wallet, streaks);
    renderDynamicSVGChart(res.dailyStudyHistory || {});
  });
}

function validateStreaks(dailyStudyHistory, settings, streaks) {
  const todayStr = getTodayDateString();
  const yesterdayStr = getYesterdayDateString();
  const lastMet = streaks.lastGoalMetDate;
  if (lastMet && lastMet !== todayStr && lastMet !== yesterdayStr) {
    streaks.current = 0;
  }
  return streaks;
}

function updateTimerWidget(timer, settings, nuclear) {
  const circ = 2 * Math.PI * 70;
  
  if (timer.isActive) {
    const elapsed = timer.currentSeconds;
    const total = timer.targetSeconds;
    const remainingSec = Math.max(0, total - elapsed);
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    
    dom.timerText.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const offset = Math.max(0, Math.min(circ, circ - (elapsed / total) * circ));
    dom.timerProgressBar.style.strokeDashoffset = offset;
    
    dom.timerControlsDefault.style.display = "none";
    dom.timerControlsActive.style.display = "flex";
    
    if (timer.isPaused) {
      dom.btnTimerPause.style.display = "none";
      dom.btnTimerResume.style.display = "inline-flex";
      dom.timerText.style.color = "var(--warning)";
    } else {
      dom.btnTimerPause.style.display = "inline-flex";
      dom.btnTimerResume.style.display = "none";
      dom.timerText.style.color = "var(--text-main)";
    }
  } else {
    const displayMins = nuclear.isActive ? nuclear.durationMinutes : settings.studyMinutes;
    dom.timerText.textContent = `${String(displayMins).padStart(2, "0")}:00`;
    dom.timerProgressBar.style.strokeDashoffset = circ;
    dom.timerText.style.color = "var(--text-main)";
    
    dom.timerControlsDefault.style.display = "flex";
    dom.timerControlsActive.style.display = "none";
  }
}

function updateNuclearProgress(nuclear) {
  const totalMs = nuclear.durationMinutes * 60000;
  const remainingMs = Math.max(0, nuclear.endTime - Date.now());
  const elapsedMs = totalMs - remainingMs;
  
  const circ = 2 * Math.PI * 70;
  const offset = Math.max(0, Math.min(circ, circ - (elapsedMs / totalMs) * circ));
  dom.nuclearProgressBar.style.strokeDashoffset = offset;
  
  const totalSecs = Math.floor(remainingMs / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  dom.nuclearLockCountdown.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function populateWebsitesSelector(productiveList) {
  dom.focusWebsiteSelect.innerHTML = "";
  if (!productiveList || productiveList.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Setup Productive Domains First --";
    dom.focusWebsiteSelect.appendChild(opt);
    return;
  }
  productiveList.forEach(domain => {
    const opt = document.createElement("option");
    opt.value = domain;
    opt.textContent = domain;
    dom.focusWebsiteSelect.appendChild(opt);
  });
}

function populateNuclearWebsites(productiveList) {
  dom.nuclearSetupDomain.innerHTML = "";
  if (!productiveList || productiveList.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Add Productive Websites First --";
    dom.nuclearSetupDomain.appendChild(opt);
    return;
  }
  productiveList.forEach(domain => {
    const opt = document.createElement("option");
    opt.value = domain;
    opt.textContent = domain;
    dom.nuclearSetupDomain.appendChild(opt);
  });
}

function cleanDomainInput(val) {
  try {
    let clean = val.trim().toLowerCase();
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
    return val.trim().toLowerCase();
  }
}

function domainMatches(target, current) {
  const cleanTarget = cleanDomainInput(target);
  const cleanCurrent = cleanDomainInput(current);
  return cleanCurrent === cleanTarget || cleanCurrent.endsWith("." + cleanTarget);
}

dom.btnAddWebsite.addEventListener("click", () => {
  const rawInput = dom.addDomainInput.value;
  if (!rawInput) {
    triggerAlert("Empty Domain", "Please enter a clean target website domain name.");
    return;
  }
  
  const domain = cleanDomainInput(rawInput);
  const targetCategory = dom.addCategorySelect.value;
  
  chrome.storage.local.get(["categories", "wallet", "nuclear"], (res) => {
    const isNuclear = res.nuclear && res.nuclear.isActive;
    if (isNuclear) {
      triggerAlert("Settings Locked", "Filters cannot be customized while extreme restrictions are armed.");
      return;
    }
    
    let categories = res.categories || { productive: [], halfUnproductive: [], unproductive: [] };
    
    const alreadyRegistered = 
      categories.productive.includes(domain) ||
      categories.halfUnproductive.includes(domain) ||
      categories.unproductive.includes(domain);
      
    if (alreadyRegistered) {
      triggerAlert("Duplicate Domain", "This website filter has already been added.");
      return;
    }
    
    categories[targetCategory].push(domain);
    chrome.storage.local.set({ categories }, () => {
      dom.addDomainInput.value = "";
      syncUIData();
      triggerAlert("Filter Saved", `${domain} added successfully.`);
    });
  });
});

function renderFilterLists(categories, filterQuery) {
  dom.filterListContainer.innerHTML = "";
  const query = filterQuery ? filterQuery.toLowerCase().trim() : "";
  
  const sections = [
    { list: categories.productive, name: "productive", label: "Prod", badge: "badge-productive" },
    { list: categories.halfUnproductive, name: "halfUnproductive", label: "Half", badge: "badge-half" },
    { list: categories.unproductive, name: "unproductive", label: "Unprod", badge: "badge-unproductive" }
  ];
  
  sections.forEach(sec => {
    sec.list.forEach(domain => {
      if (query && !domain.includes(query)) return;
      
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <div>
          <span class="badge ${sec.badge}">${sec.label}</span>
          <span style="margin-left: 8px;">${domain}</span>
        </div>
        <div>
          ${sec.name !== "productive" ? `<button class="icon-btn move-btn" data-domain="${domain}" data-from="${sec.name}" data-to="productive" title="Promote to Productive">▲</button>` : ""}
          <button class="icon-btn delete-btn" data-domain="${domain}" data-from="${sec.name}" title="Remove Filter" style="color:var(--danger); margin-left: 4px;">✕</button>
        </div>
      `;
      dom.filterListContainer.appendChild(row);
    });
  });
  
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const domain = btn.getAttribute("data-domain");
      const fromCategory = btn.getAttribute("data-from");
      handleFilterRemoval(domain, fromCategory);
    });
  });
  
  document.querySelectorAll(".move-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const domain = btn.getAttribute("data-domain");
      const fromCategory = btn.getAttribute("data-from");
      const toCategory = btn.getAttribute("data-to");
      handleFilterMove(domain, fromCategory, toCategory);
    });
  });
}

dom.searchFiltersInput.addEventListener("input", () => {
  chrome.storage.local.get(["categories"], (res) => {
    renderFilterLists(res.categories || { productive: [], halfUnproductive: [], unproductive: [] }, dom.searchFiltersInput.value);
  });
});

function handleFilterRemoval(domain, category) {
  chrome.storage.local.get(["categories", "wallet", "nuclear"], (res) => {
    if (res.nuclear && res.nuclear.isActive) {
      triggerAlert("Settings Locked", "Filters cannot be customized while extreme restrictions are armed.");
      return;
    }
    
    let categories = res.categories;
    let wallet = res.wallet || { balance: 0.0 };
    
    if (category === "unproductive") {
      if (wallet.balance < 50.0) {
        triggerAlert("Balance Insufficient", "Changing an Unproductive website costs 50 earned minutes.");
        return;
      }
      
      triggerConfirm("Acknowledge Cost", `Are you sure you want to remove ${domain}? This will deduct 50 earned focus minutes from your balance.`, () => {
        wallet.balance -= 50.0;
        wallet.lifetimeSpent += 50.0;
        categories.unproductive = categories.unproductive.filter(d => d !== domain);
        
        chrome.storage.local.set({ categories, wallet }, () => {
          syncUIData();
          triggerAlert("Action Confirmed", "Successfully removed unproductive website restriction. Deducted 50 minutes.");
        });
      });
    } else {
      categories[category] = categories[category].filter(d => d !== domain);
      chrome.storage.local.set({ categories }, syncUIData);
    }
  });
}

function handleFilterMove(domain, fromCat, toCat) {
  chrome.storage.local.get(["categories", "wallet", "nuclear"], (res) => {
    if (res.nuclear && res.nuclear.isActive) {
      triggerAlert("Settings Locked", "Filters cannot be customized while extreme restrictions are armed.");
      return;
    }
    
    let categories = res.categories;
    let wallet = res.wallet || { balance: 0.0 };
    
    if (fromCat === "unproductive" && (toCat === "productive" || toCat === "halfUnproductive")) {
      if (wallet.balance < 50.0) {
        triggerAlert("Balance Insufficient", "Changing an Unproductive website costs 50 earned minutes.");
        return;
      }
      
      triggerConfirm("Acknowledge Balance Cost", "Promoting this Unproductive blocker back into productive categories costs 50 minutes. Proceed?", () => {
        wallet.balance -= 50.0;
        wallet.lifetimeSpent += 50.0;
        
        categories.unproductive = categories.unproductive.filter(d => d !== domain);
        if (!categories[toCat].includes(domain)) {
          categories[toCat].push(domain);
        }
        
        chrome.storage.local.set({ categories, wallet }, () => {
          syncUIData();
          triggerAlert("Action Confirmed", "Successfully promoted site filter. Deducted 50 minutes.");
        });
      });
    } else {
      categories[fromCat] = categories[fromCat].filter(d => d !== domain);
      if (!categories[toCat].includes(domain)) {
        categories[toCat].push(domain);
      }
      chrome.storage.local.set({ categories }, syncUIData);
    }
  });
}

// TIMER ACTIONS
dom.btnTimerStart.addEventListener("click", () => {
  chrome.storage.local.get(["timer"], (res) => {
    const timer = res.timer || {};
    if (timer.isActive) {
      triggerAlert("Focus Session Live", "Your focus tracking is actively running.");
      return;
    }
    
    const domain = dom.focusWebsiteSelect.value;
    if (!domain) {
      triggerAlert("Target Missing", "Please select a Focus target website first.");
      return;
    }
    
    chrome.runtime.sendMessage({ action: "startFocusSession", domain: domain });
  });
});

dom.btnTimerPause.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "pauseFocusSession" });
});

dom.btnTimerResume.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "resumeFocusSession" });
});

dom.btnTimerStopActive.addEventListener("click", () => {
  chrome.storage.local.get(["nuclear"], (res) => {
    if (res.nuclear && res.nuclear.isActive) {
      triggerAlert("Locked Operation", "The study tracker cannot be manually stopped during active Nuclear focus sessions.");
      return;
    }
    chrome.runtime.sendMessage({ action: "stopFocusSession" });
  });
});

dom.btnNuclearArm.addEventListener("click", () => {
  const password = dom.nuclearSetupPassword.value.trim();
  const domain = dom.nuclearSetupDomain.value;
  const duration = parseInt(dom.nuclearSetupDuration.value);
  
  if (!password) {
    triggerAlert("Password Required", "A bypass password is required to arm Nuclear mode.");
    return;
  }
  if (!domain) {
    triggerAlert("Select Focus Website", "You must configure and choose a focus target website first.");
    return;
  }
  
  triggerConfirm("WARNING: EXTREME LOCK", `Nuclear Mode locks configuration edits, and blocks settings for the next ${duration} minutes. Bypass password is required to cancel. Confirm?`, () => {
    const endTime = Date.now() + (duration * 60000);
    const nuclearState = {
      isActive: true,
      endTime: endTime,
      password: password,
      website: domain,
      durationMinutes: duration
    };
    
    // Automatically redirect and trigger the focus timer maps instantly
    chrome.storage.local.set({ nuclear: nuclearState }, () => {
      dom.nuclearSetupPassword.value = "";
      setStep(1);
      
      chrome.runtime.sendMessage({ action: "startFocusSession", domain: domain }, () => {
        syncUIData();
      });
    });
  });
});

dom.btnNuclearUnlock.addEventListener("click", () => {
  const attempt = dom.nuclearUnlockPassword.value.trim();
  chrome.storage.local.get(["nuclear"], (res) => {
    const nuclear = res.nuclear || {};
    if (attempt === nuclear.password) {
      nuclear.isActive = false;
      chrome.storage.local.set({ nuclear }, () => {
        dom.nuclearUnlockPassword.value = "";
        syncUIData();
        triggerAlert("System Unlocked", "Nuclear session cleared successfully.");
      });
    } else {
      triggerAlert("Incorrect Password", "Authentication failed. Nuclear lock remains active.");
    }
  });
});

function syncStreakMetrics(streaks, wallet) {
  dom.statsCurrentStreak.textContent = streaks.current || 0;
  dom.statsLongestStreak.textContent = streaks.longest || 0;
  
  const hoursStudy = (wallet.lifetimeStudy || 0) / 3600;
  dom.statsTotalStudy.textContent = hoursStudy.toFixed(1) + "h";
  dom.statsTotalEarned.textContent = (wallet.lifetimeEarned || 0) + "m";
}

const BADGE_LIST = [
  { id: "b1", title: "First Session", desc: "Accumulate 25 total study minutes.", check: (w) => w.lifetimeStudy >= 1500 },
  { id: "b2", title: "Deep Focus", desc: "Accumulate 10 total study hours.", check: (w) => w.lifetimeStudy >= 36000 },
  { id: "b3", title: "Study Master", desc: "Accumulate 50 total study hours.", check: (w) => w.lifetimeStudy >= 180000 },
  { id: "b4", title: "Grand Streak", desc: "Reach a 7-day goal streak.", check: (w, s) => s.longest >= 7 },
  { id: "b5", title: "Elite Scholar", desc: "Reach a 30-day goal streak.", check: (w, s) => s.longest >= 30 }
];

function renderMilestoneBadges(wallet, streaks) {
  dom.achievementsBadgeGrid.innerHTML = "";
  BADGE_LIST.forEach(b => {
    const isUnlocked = b.check(wallet, streaks);
    const badgeColor = isUnlocked ? "var(--warning)" : "var(--text-muted)";
    const badgeBg = isUnlocked ? "rgba(245, 158, 11, 0.1)" : "rgba(255,255,255,0.02)";
    const opacity = isUnlocked ? "1" : "0.4";
    
    const div = document.createElement("div");
    div.className = "card";
    div.style.background = badgeBg;
    div.style.opacity = opacity;
    div.style.textAlign = "center";
    div.style.padding = "10px 6px";
    div.style.borderColor = isUnlocked ? "var(--warning)" : "var(--card-border)";
    div.style.margin = "0";
    div.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${badgeColor}" stroke-width="2.5" style="margin: 0 auto 6px auto;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
      <div style="font-size:10px; font-weight:800; color:white;">${b.title}</div>
      <div style="font-size:8px; color:var(--text-muted); margin-top:3px; line-height: 1.2;">${b.desc}</div>
    `;
    dom.achievementsBadgeGrid.appendChild(div);
  });
}

function renderDynamicSVGChart(dailyHistory) {
  const svg = dom.svgWeeklyChart;
  svg.innerHTML = "";
  
  const data = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const seconds = dailyHistory[key] || 0;
    data.push(Math.round(seconds / 60));
    labels.push(d.toLocaleDateString(undefined, { weekday: "short" }).substring(0, 1));
  }
  
  const width = 350;
  const height = 120;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 20;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxVal = Math.max(10, ...data);
  
  for (let step = 0; step <= 4; step++) {
    const yVal = Math.round((maxVal / 4) * step);
    const yPos = height - paddingBottom - (chartHeight * (step / 4));
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", paddingLeft);
    line.setAttribute("y1", yPos);
    line.setAttribute("x2", width - paddingRight);
    line.setAttribute("y2", yPos);
    line.setAttribute("stroke", "rgba(255, 255, 255, 0.08)");
    line.setAttribute("stroke-dasharray", "2,2");
    svg.appendChild(line);
    
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", paddingLeft - 6);
    text.setAttribute("y", yPos + 3);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("font-size", "8px");
    text.setAttribute("fill", "var(--text-muted)");
    text.textContent = yVal;
    svg.appendChild(text);
  }
  
  let pathD = "";
  const points = [];
  
  data.forEach((val, index) => {
    const xPos = paddingLeft + (chartWidth * (index / (data.length - 1)));
    const yPos = height - paddingBottom - (chartHeight * (val / maxVal));
    points.push({ x: xPos, y: yPos });
    
    if (index === 0) {
      pathD += `M ${xPos} ${yPos}`;
    } else {
      pathD += ` L ${xPos} ${yPos}`;
    }
  });
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "var(--primary)");
  path.setAttribute("stroke-width", "2.5");
  svg.appendChild(path);
  
  points.forEach((pt, index) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pt.x);
    circle.setAttribute("cy", pt.y);
    circle.setAttribute("r", "4");
    circle.setAttribute("fill", "var(--accent)");
    circle.setAttribute("stroke", "rgba(5, 8, 15, 0.9)");
    circle.setAttribute("stroke-width", "1.5");
    svg.appendChild(circle);
    
    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", pt.x);
    txt.setAttribute("y", height - 5);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-size", "9px");
    txt.setAttribute("font-weight", "bold");
    txt.setAttribute("fill", "var(--text-muted)");
    txt.textContent = labels[index];
    svg.appendChild(txt);
  });
}

function saveGlobalSettings() {
  chrome.storage.local.get(["settings", "nuclear"], (res) => {
    if (res.nuclear && res.nuclear.isActive) return;
    
    const study = Math.max(1, parseInt(dom.settingsStudyInput.value) || 25);
    const reward = Math.max(1, parseInt(dom.settingsRewardInput.value) || 1);
    const goal = Math.max(0.1, parseFloat(dom.settingsGoalInput.value) || 1.0);
    
    const settings = {
      studyMinutes: study,
      rewardMinutes: reward,
      dailyGoalHours: goal,
      theme: "dark",
      notifications: true
    };
    
    chrome.storage.local.set({ settings }, syncUIData);
  });
}

dom.settingsStudyInput.addEventListener("change", saveGlobalSettings);
dom.settingsRewardInput.addEventListener("change", saveGlobalSettings);
dom.settingsGoalInput.addEventListener("change", saveGlobalSettings);

dom.btnExportData.addEventListener("click", () => {
  chrome.storage.local.get(null, (res) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "earntime_profile_backup.json");
    dlAnchor.click();
  });
});

dom.btnImportData.addEventListener("click", () => {
  chrome.storage.local.get(["nuclear"], (res) => {
    if (res.nuclear && res.nuclear.isActive) {
      triggerAlert("Settings Locked", "Data importing is locked during Nuclear focus cycles.");
      return;
    }
    
    const fileSelector = document.createElement("input");
    fileSelector.type = "file";
    fileSelector.accept = ".json";
    fileSelector.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedObj = JSON.parse(event.target.result);
          
          triggerConfirm("Verify Import Action", "Choose Acknowledge to replace your existing database profile with this backup configuration.", () => {
            chrome.storage.local.clear(() => {
              chrome.storage.local.set(importedObj, () => {
                syncUIData();
                triggerAlert("Profile Updated", "Backup package configured successfully.");
              });
            });
          });
        } catch (err) {
          triggerAlert("Import Failed", "The file profile selected does not match proper formats.");
        }
      };
      reader.readAsText(file);
    };
    fileSelector.click();
  });
});

dom.btnFactoryReset.addEventListener("click", () => {
  chrome.storage.local.get(["nuclear"], (res) => {
    if (res.nuclear && res.nuclear.isActive) {
      triggerAlert("Locked Operation", "Wipes are locked during active restrictions.");
      return;
    }
    
    triggerConfirm("Wipe System Records", "This action completely purges configurations and balances back to defaults. Confirm?", () => {
      chrome.storage.local.clear(() => {
        chrome.storage.local.set(DEFAULT_STATE, () => {
          syncUIData();
          triggerAlert("System Reset Completed", "Default profile state configured.");
        });
      });
    });
  });
});
