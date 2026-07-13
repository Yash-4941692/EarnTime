import React, { useState, useEffect } from 'react';
import './Popup.css';

export interface AppSettings {
  studyMinutes: number;
  rewardMinutes: number;
  blockedSites: string[];
  halfUnproductiveSites: string[];
  productiveSites: string[];
  dailyGoalHours: number;
}

export interface WalletState {
  balanceSeconds: number;
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
  lastResetDate: string;
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

const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

const formatDigitalTimer = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'study' | 'stats' | 'settings'>('study');
  const [data, setData] = useState<StorageData>({
    settings: DEFAULT_SETTINGS,
    wallet: DEFAULT_WALLET,
    timer: DEFAULT_TIMER,
    lastResetDate: ''
  });
  
  const [currentElapsed, setCurrentElapsed] = useState(0);
  const [newSite, setNewSite] = useState('');
  const [newHalfSite, setNewHalfSite] = useState('');
  const [newProductiveSite, setNewProductiveSite] = useState('');
  const [showProductiveSelect, setShowProductiveSelect] = useState(false);

  // Sync state from storage
  useEffect(() => {
    const load = () => {
      chrome.storage.local.get(null, (stored) => {
        setData(prev => {
          const newData = {
            settings: stored?.settings || prev.settings,
            wallet: stored?.wallet || prev.wallet,
            timer: stored?.timer || prev.timer,
            lastResetDate: stored?.lastResetDate || prev.lastResetDate
          };
          
          // Calculate precise elapsed time for UI
          const t = newData.timer;
          if (t.isStudying && t.activeProductiveTimestamp) {
            const elapsedSinceStart = Math.floor((Date.now() - t.activeProductiveTimestamp) / 1000);
            setCurrentElapsed(t.accumulatedSeconds + elapsedSinceStart);
          } else {
            setCurrentElapsed(t.accumulatedSeconds);
          }
          
          return newData;
        });
      });
    };
    
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStudyAction = (action: 'START_STUDY' | 'PAUSE_STUDY' | 'RESUME_STUDY' | 'STOP_STUDY') => {
    chrome.runtime.sendMessage({ type: action }, () => {
      // Optimistic update
      if (action === 'STOP_STUDY') setCurrentElapsed(0);
    });
  };

  const updateSettings = async (newSettings: Partial<StorageData['settings']>) => {
    const updated = { ...data.settings, ...newSettings };
    await chrome.storage.local.set({ settings: updated });
    setData(prev => ({ ...prev, settings: updated }));
  };

  const addSite = () => {
    if (newSite && !data.settings.blockedSites.includes(newSite)) {
      updateSettings({ blockedSites: [...data.settings.blockedSites, newSite.toLowerCase()] });
      setNewSite('');
    }
  };

  const removeSite = (site: string) => {
    if (data.wallet.balanceSeconds < 3000) {
      alert('You need at least 50 minutes of balance to remove a blocked site.');
      return;
    }
    updateSettings({ blockedSites: data.settings.blockedSites.filter(s => s !== site) });
  };

  const addHalfSite = () => {
    if (newHalfSite && !data.settings.halfUnproductiveSites.includes(newHalfSite)) {
      updateSettings({ halfUnproductiveSites: [...(data.settings.halfUnproductiveSites || []), newHalfSite.toLowerCase()] });
      setNewHalfSite('');
    }
  };

  const removeHalfSite = (site: string) => {
    updateSettings({ halfUnproductiveSites: data.settings.halfUnproductiveSites.filter(s => s !== site) });
  };

  const addProductiveSite = () => {
    if (newProductiveSite && !data.settings.productiveSites.includes(newProductiveSite)) {
      updateSettings({ productiveSites: [...(data.settings.productiveSites || []), newProductiveSite.toLowerCase()] });
      setNewProductiveSite('');
    }
  };

  const removeProductiveSite = (site: string) => {
    updateSettings({ productiveSites: data.settings.productiveSites.filter(s => s !== site) });
  };

  const initiateStudy = () => {
    if (!data.settings.productiveSites || data.settings.productiveSites.length === 0) {
      alert('Please add at least one productive website in the Settings tab first!');
      return;
    }
    setShowProductiveSelect(true);
  };

  const startStudyWithSite = (site: string) => {
    chrome.tabs.create({ url: `https://${site}` });
    handleStudyAction('START_STUDY');
    setShowProductiveSelect(false);
  };

  const progressPct = Math.min(100, ((currentElapsed - (data.timer?.lastRewardMilestoneSeconds || 0)) / ((data.settings?.studyMinutes || 25) * 60)) * 100) || 0;

  return (
    <div className="flex flex-col h-[500px] bg-slate-900 text-slate-100 overflow-hidden">
      {/* Header */}
      <header className="px-5 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">EarnTime</h1>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Balance</div>
          <div className="text-lg font-bold text-emerald-400">
            {formatTime(data.wallet.balanceSeconds)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar">
        {activeTab === 'study' && (
          <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Circular Progress */}
              <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full -rotate-90 transform">
                <circle cx="96" cy="96" r="88" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle cx="96" cy="96" r="88" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 88}`}
                  strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPct / 100)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="text-center z-10 flex flex-col items-center">
                <span className="text-5xl font-bold tracking-tighter tabular-nums text-white">
                  {formatDigitalTimer(currentElapsed)}
                </span>
                <span className="text-sm text-slate-400 mt-1">
                  Next reward in {Math.ceil((data.settings.studyMinutes * 60 - (currentElapsed - data.timer.lastRewardMilestoneSeconds)) / 60)}m
                </span>
              </div>
            </div>
            
            {data.timer.isStudying && !data.timer.activeProductiveTimestamp && (
              <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full font-medium">
                Timer paused. Open a productive site.
              </div>
            )}

            {showProductiveSelect ? (
              <div className="w-full max-w-[280px] bg-slate-800 rounded-xl border border-slate-700 p-3 shadow-xl">
                <div className="text-xs text-slate-400 mb-2 font-medium">Select a site to start:</div>
                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {data.settings.productiveSites.map(site => (
                    <button key={site} onClick={() => startStudyWithSite(site)} className="text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition">
                      {site}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowProductiveSelect(false)} className="mt-3 text-xs text-slate-500 hover:text-slate-300 w-full text-center">Cancel</button>
              </div>
            ) : (
              <div className="flex gap-3 w-full max-w-[280px]">
                {!data.timer.isStudying && currentElapsed === 0 ? (
                  <button onClick={initiateStudy} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20 active:scale-95">
                    Start Focus
                  </button>
                ) : (
                <>
                  {!data.timer.isStudying ? (
                    <button onClick={() => handleStudyAction('RESUME_STUDY')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20 active:scale-95">
                      Resume
                    </button>
                  ) : (
                    <button onClick={() => handleStudyAction('PAUSE_STUDY')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold transition shadow-lg shadow-amber-500/20 active:scale-95">
                      Pause
                    </button>
                  )}
                  <button onClick={() => handleStudyAction('STOP_STUDY')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition active:scale-95">
                    Finish
                  </button>
                </>
              )}
              </div>
            )}
            
            <div className="text-center bg-slate-800/50 rounded-lg py-2 px-4 border border-slate-700/50 w-full max-w-[280px]">
              <div className="text-xs text-slate-400">Current Rate</div>
              <div className="text-sm font-medium text-slate-200">
                {data.settings.studyMinutes}m study = {data.settings.rewardMinutes}m reward
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4 animate-fade-in w-full min-w-0">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Activity</h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full min-w-0">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Earned</div>
                <div className="text-xl font-bold truncate text-white">{formatTime(data.wallet.todayEarnedSeconds)}</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full min-w-0">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> Spent</div>
                <div className="text-xl font-bold truncate text-white">{formatTime(data.wallet.todaySpentSeconds)}</div>
              </div>
            </div>

            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">Lifetime Statistics</h2>
            <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700/50 w-full">
              <div className="flex justify-between items-center p-4">
                <span className="text-slate-300">Total Study Time</span>
                <span className="font-bold text-white">{formatTime(data.wallet.lifetimeStudySeconds)}</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-slate-300">Total Earned Time</span>
                <span className="font-bold text-emerald-400">{formatTime(data.wallet.lifetimeEarnedSeconds)}</span>
              </div>
            </div>
            
            {/* Daily Goal Progress */}
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Daily Goal Progress</span>
                <span className="text-slate-300 font-medium">
                  {Math.floor(data.wallet.lifetimeStudySeconds / 3600)} / {data.settings.dailyGoalHours}h
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden w-full">
                <div 
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${Math.min(100, (data.wallet.lifetimeStudySeconds / (data.settings.dailyGoalHours * 3600)) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in w-full pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Conversion Rate</h2>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-4 w-full">
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-slate-400 block mb-1">Study (min)</label>
                  <input type="number" min="1" 
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                    value={data.settings.studyMinutes}
                    onChange={e => updateSettings({ studyMinutes: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="text-slate-500 pt-5">→</div>
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-slate-400 block mb-1">Reward (min)</label>
                  <input type="number" min="1"
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                    value={data.settings.rewardMinutes}
                    onChange={e => updateSettings({ rewardMinutes: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>

            <div className="w-full">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Blocked Websites (Costs 50m to remove)</h2>
              <div className="flex gap-2 w-full">
                <input 
                  type="text" 
                  placeholder="e.g. netflix.com" 
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                  value={newSite}
                  onChange={e => setNewSite(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSite()}
                />
                <button onClick={addSite} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg text-sm font-semibold transition shrink-0">Add</button>
              </div>
              
              <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden w-full max-h-[120px] overflow-y-auto custom-scrollbar">
                {data.settings.blockedSites.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No sites blocked.</div>
                ) : (
                  <ul className="divide-y divide-slate-700/50 w-full">
                    {data.settings.blockedSites.map(site => (
                      <li key={site} className="flex justify-between items-center p-2 px-3 hover:bg-slate-750 transition w-full">
                        <span className="text-sm truncate text-slate-300 max-w-[80%]">{site}</span>
                        <button onClick={() => removeSite(site)} className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="w-full">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Productive Websites</h2>
              <div className="flex gap-2 w-full">
                <input 
                  type="text" 
                  placeholder="e.g. coursera.org" 
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                  value={newProductiveSite}
                  onChange={e => setNewProductiveSite(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addProductiveSite()}
                />
                <button onClick={addProductiveSite} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg text-sm font-semibold transition shrink-0">Add</button>
              </div>
              
              <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden w-full max-h-[120px] overflow-y-auto custom-scrollbar">
                {(!data.settings.productiveSites || data.settings.productiveSites.length === 0) ? (
                  <div className="p-4 text-center text-sm text-slate-500">Add sites to earn time here.</div>
                ) : (
                  <ul className="divide-y divide-slate-700/50 w-full">
                    {data.settings.productiveSites.map(site => (
                      <li key={site} className="flex justify-between items-center p-2 px-3 hover:bg-slate-750 transition w-full">
                        <span className="text-sm truncate text-emerald-300 max-w-[80%]">{site}</span>
                        <button onClick={() => removeProductiveSite(site)} className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="w-full">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Half Unproductive (Grayscale)</h2>
              <div className="flex gap-2 w-full">
                <input 
                  type="text" 
                  placeholder="e.g. wikipedia.org" 
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition text-white"
                  value={newHalfSite}
                  onChange={e => setNewHalfSite(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addHalfSite()}
                />
                <button onClick={addHalfSite} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-lg text-sm font-semibold transition shrink-0">Add</button>
              </div>
              
              <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden w-full max-h-[120px] overflow-y-auto custom-scrollbar">
                {(!data.settings.halfUnproductiveSites || data.settings.halfUnproductiveSites.length === 0) ? (
                  <div className="p-4 text-center text-sm text-slate-500">No sites added.</div>
                ) : (
                  <ul className="divide-y divide-slate-700/50 w-full">
                    {data.settings.halfUnproductiveSites.map(site => (
                      <li key={site} className="flex justify-between items-center p-2 px-3 hover:bg-slate-750 transition w-full">
                        <span className="text-sm truncate text-slate-400 max-w-[80%]">{site}</span>
                        <button onClick={() => removeHalfSite(site)} className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Tab Navigation */}
      <nav className="flex border-t border-slate-800 bg-slate-900 shrink-0 w-full">
        {[
          { id: 'study', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Timer' },
          { id: 'stats', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Stats' },
          { id: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 transition min-w-0 ${activeTab === tab.id ? 'text-emerald-400 bg-slate-800/50 border-t-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 border-t-2 border-transparent'}`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="text-[10px] font-medium uppercase tracking-wider truncate px-1 w-full text-center">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Popup;