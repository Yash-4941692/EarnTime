import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CHROME_LIMITATION_SENTENCE, MAX_EARN_FROM_MIN, MAX_UNLOCK_COST_MIN } from '../../core/constants';
import type { Command } from '../../core/commands';
import { matchingKeyword, channelAllowed } from '../../core/matchers';
import { normalizeHostInput } from '../../core/domains';
import { siteChangeLoosens, ratioLoosens } from '../../core/protection';
import { isDoneToday } from '../../core/tasks';
import { dayKey, formatDuration } from '../../core/time';
import { dashboardView } from '../../core/view';
import type { EarnState, LedgerEntry, ListName, Task } from '../../core/types';
import { Button, Card, Empty, Field, InlineCode, Notice } from '../components';
import { exportAudit, incognitoAllowed, runCommand, useNow, useStoredState } from '../lib/extension';

type SectionId = 'time' | 'websites' | 'youtube' | 'whatsapp' | 'tasks' | 'protection';

const SECTIONS: Array<{ id: SectionId; label: string; hint: string }> = [
  { id: 'time', label: 'Time rules', hint: 'Earn ratio, balance, unlock cost' },
  { id: 'websites', label: 'Websites', hint: 'Productive, half and unproductive lists' },
  { id: 'youtube', label: 'YouTube', hint: 'Channel keywords for Productive Mode' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Chats visible in Productive Mode' },
  { id: 'tasks', label: 'Daily tasks', hint: 'Goals that pay screen time' },
  { id: 'protection', label: 'Protection', hint: 'What is enforced and its limits' },
];

const LIST_LABEL: Record<ListName, string> = {
  productive: 'Productive',
  half: 'Half-productive',
  unproductive: 'Unproductive',
};

const LIST_HELP: Record<ListName, string> = {
  productive: 'Earns screen time while you use it. Always open.',
  half: 'Mixed sites. You choose Productive or Unproductive Mode each visit. YouTube and WhatsApp Web get filters.',
  unproductive: 'Spends your balance. Blocked when the balance is empty or you are in debt.',
};

function useAct(setNotice: (n: { tone: 'success' | 'error'; text: string } | null) => void) {
  return async (command: Command, success?: string): Promise<boolean> => {
    const result = await runCommand(command);
    if (result.ok) {
      setNotice(success ? { tone: 'success', text: success } : null);
      return true;
    }
    setNotice({ tone: 'error', text: result.message ?? 'That change was not saved.' });
    return false;
  };
}

function costText(minutes: number): string {
  return minutes > 0 ? `costs ${minutes} min` : 'free';
}

function TimeSection({ state, act }: { state: EarnState; act: ReturnType<typeof useAct> }) {
  const [from, setFrom] = useState(String(state.settings.earnFromMin));
  const [to, setTo] = useState(String(state.settings.earnToMin));
  const [cost, setCost] = useState(String(state.settings.unlockCostMin));
  const now = useNow(5000);
  const view = dashboardView(state, now);

  useEffect(() => {
    setFrom(String(state.settings.earnFromMin));
    setTo(String(state.settings.earnToMin));
    setCost(String(state.settings.unlockCostMin));
  }, [state.settings.earnFromMin, state.settings.earnToMin, state.settings.unlockCostMin]);

  const f = Number(from);
  const t = Number(to);
  const validRatio = Number.isInteger(f) && Number.isInteger(t) && f >= 1 && f <= MAX_EARN_FROM_MIN && t >= 1 && t <= f;
  const loosens = validRatio && state.setupDone && ratioLoosens(state.settings.earnFromMin, state.settings.earnToMin, f, t);
  const ratioCost = loosens ? state.settings.unlockCostMin : 0;

  return (
    <div className="space-y-5">
      <Card className="grid grid-cols-3 gap-3">
        <div>
          <div className="eyebrow">Remaining</div>
          <div className="mt-1 text-[20px] font-semibold tabular-nums">{formatDuration(view.balanceMs)}</div>
        </div>
        <div>
          <div className="eyebrow">Earned today</div>
          <div className="mt-1 text-[20px] font-semibold tabular-nums text-emerald-300">{formatDuration(view.earnedToday)}</div>
        </div>
        <div>
          <div className="eyebrow">Debt</div>
          <div className={`mt-1 text-[20px] font-semibold tabular-nums ${view.debtMs > 0 ? 'text-rose-300' : 'text-slate-400'}`}>
            {view.debtMs > 0 ? formatDuration(view.debtMs) : 'None'}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-50">Earn rule</h2>
          <p className="mt-1 text-[13px] leading-snug text-slate-400">
            Productive time earns screen time at this ratio. Only the active tab counts; background tabs, idle time and minimised windows do not.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Productive minutes" htmlFor="ratio-from">
            <input id="ratio-from" className="field" type="number" min={1} max={MAX_EARN_FROM_MIN} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Earned minutes" htmlFor="ratio-to">
            <input id="ratio-to" className="field" type="number" min={1} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <p className="text-[12.5px] text-slate-400" aria-live="polite">
          {validRatio
            ? `${f} productive minutes → ${t} minutes of screen time (1 : ${(f / t).toFixed(1)} studied per earned).`
            : 'Productive minutes must be 1 or more; earned minutes must be between 1 and the productive minutes.'}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-slate-500">
            {state.setupDone ? (loosens ? `Making earning easier ${costText(ratioCost)}.` : 'Making earning harder is free.') : 'Free until setup is complete.'}
          </span>
          <Button
            variant="primary"
            disabled={!validRatio}
            onClick={() => void act({ type: 'ratio.set', earnFromMin: f, earnToMin: t }, 'Earn rule saved.')}
          >
            Save earn rule
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-50">Unlock cost</h2>
          <p className="mt-1 text-[13px] leading-snug text-slate-400">
            After setup, any change that makes usage easier costs this many minutes from your balance. Lowering this value is charged at the current price.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <Field label="Minutes per loosening change" htmlFor="unlock-cost">
            <input id="unlock-cost" className="field w-40" type="number" min={0} max={MAX_UNLOCK_COST_MIN} value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Button
            onClick={() => void act({ type: 'unlock.set', minutes: Number(cost) }, 'Unlock cost saved.')}
            disabled={!Number.isInteger(Number(cost)) || Number(cost) < 0 || Number(cost) > MAX_UNLOCK_COST_MIN}
          >
            Save cost
          </Button>
        </div>
      </Card>
    </div>
  );
}

function WebsitesSection({ state, act }: { state: EarnState; act: ReturnType<typeof useAct> }) {
  const [draft, setDraft] = useState('');
  const [target, setTarget] = useState<ListName>('unproductive');
  const [filter, setFilter] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const unlock = state.settings.unlockCostMin;
  const setupDone = state.setupDone;

  const addSite = async (event: FormEvent) => {
    event.preventDefault();
    const host = normalizeHostInput(draft);
    if (!host) {
      setLocalError('Enter a website such as example.com.');
      return;
    }
    setLocalError(null);
    if (await act({ type: 'site.add', list: target, host: draft }, `${host} added to ${LIST_LABEL[target].toLowerCase()} sites.`)) setDraft('');
  };

  const matches = (host: string) => (filter ? host.includes(filter.trim().toLowerCase()) : true);

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <form onSubmit={addSite} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_180px_auto]">
          <Field label="Add a website" htmlFor="site-add" hint={localError ?? (setupDone ? 'Adding to Productive or Half-productive costs the unlock cost. Adding to Unproductive is free.' : 'Free until setup is complete.')}>
            <input id="site-add" className="field" placeholder="e.g. khanacademy.org" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </Field>
          <Field label="List" htmlFor="site-list">
            <select id="site-list" className="field" value={target} onChange={(e) => setTarget(e.target.value as ListName)}>
              <option value="productive">Productive</option>
              <option value="half">Half-productive</option>
              <option value="unproductive">Unproductive</option>
            </select>
          </Field>
          <div className="flex items-end">
            <Button variant="primary" type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
        <Field label="Filter lists" htmlFor="site-filter">
          <input id="site-filter" className="field" placeholder="Type to filter" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </Field>
      </Card>

      {(['productive', 'half', 'unproductive'] as ListName[]).map((list) => {
        const items = state.rules[list].filter(matches);
        return (
          <Card key={list} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-50">
                  {LIST_LABEL[list]} <span className="ml-1 text-[12px] font-normal text-slate-500">{state.rules[list].length}</span>
                </h2>
                <p className="mt-1 text-[12.5px] leading-snug text-slate-400">{LIST_HELP[list]}</p>
              </div>
            </div>
            {items.length === 0 ? (
              <Empty>{state.rules[list].length === 0 ? 'No sites yet.' : 'No sites match the filter.'}</Empty>
            ) : (
              <ul className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80">
                {items.map((host) => (
                  <li key={host} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-slate-100">{host}</span>
                    <label className="sr-only" htmlFor={`move-${host}`}>
                      Move {host}
                    </label>
                    <select
                      id={`move-${host}`}
                      className="field w-auto py-1.5 text-[12.5px]"
                      value={list}
                      onChange={(e) => {
                        const to = e.target.value as ListName;
                        if (to !== list) void act({ type: 'site.move', host, to }, `${host} moved to ${LIST_LABEL[to].toLowerCase()} sites.`);
                      }}
                    >
                      <option value="productive">Productive</option>
                      <option value="half">Half-productive</option>
                      <option value="unproductive">Unproductive</option>
                    </select>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-[12.5px]"
                      onClick={() => void act({ type: 'site.remove', host }, `${host} removed.`)}
                      aria-label={`Remove ${host}`}
                      title={
                        setupDone && siteChangeLoosens(list, 'neutral')
                          ? `Removing costs ${unlock} min`
                          : 'Removing is free'
                      }
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function YouTubeSection({ state, act }: { state: EarnState; act: ReturnType<typeof useAct> }) {
  const [keyword, setKeyword] = useState('');
  const [test, setTest] = useState('');
  const keywords = state.settings.youtubeKeywords;
  const testMatch = test.trim() ? matchingKeyword(test, keywords) : null;
  const testAllowed = test.trim() ? channelAllowed(test, keywords) : null;

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="text-[15px] font-semibold text-slate-50">Productive Mode on YouTube</h2>
        <ul className="list-disc space-y-1 pl-5 text-[13px] leading-snug text-slate-400">
          <li>The homepage is blank. Use study search or a keyword to find videos.</li>
          <li>Results and videos show only when the <strong className="text-slate-200">channel name</strong> contains one of these keywords (case-insensitive).</li>
          <li>If the channel name cannot be read, the item is hidden. Shorts, subscriptions and channel pages are closed.</li>
          <li>Matching is by substring: "pw" also matches "Upwork". Use longer keywords if that matters.</li>
        </ul>
      </Card>
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2" aria-label="YouTube keywords">
          {keywords.length === 0 ? <Empty>No keywords. Productive Mode will show no YouTube results.</Empty> : null}
          {keywords.map((kw) => (
            <span key={kw} className="chip">
              {kw}
              <button
                type="button"
                className="ml-1 rounded-full px-1 text-slate-400 hover:text-rose-300"
                aria-label={`Remove keyword ${kw}`}
                onClick={() => void act({ type: 'youtube.remove', keyword: kw }, `Removed "${kw}".`)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="grid grid-cols-[1fr_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (keyword.trim()) void act({ type: 'youtube.add', keyword }, `Added "${keyword.trim()}".`).then((ok) => ok && setKeyword(''));
          }}
        >
          <Field label="Add a keyword" htmlFor="yt-kw" hint={state.setupDone ? 'Adding costs the unlock cost.' : undefined}>
            <input id="yt-kw" className="field" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. Organic Chemistry" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="primary">Add</Button>
          </div>
        </form>
      </Card>
      <Card className="space-y-2">
        <Field label="Check a channel name" htmlFor="yt-test" hint="Shows how the filter reads a channel name. Nothing is saved.">
          <input id="yt-test" className="field" value={test} onChange={(e) => setTest(e.target.value)} placeholder="Type a channel name" />
        </Field>
        {testAllowed !== null ? (
          <p className={`text-[13px] ${testAllowed ? 'text-emerald-300' : 'text-amber-200'}`} aria-live="polite">
            {testAllowed ? `Allowed — matches "${testMatch}".` : 'Hidden — no keyword matches.'}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function WhatsAppSection({ state, act }: { state: EarnState; act: ReturnType<typeof useAct> }) {
  const [chat, setChat] = useState('');
  const chats = state.settings.whatsappChats;
  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="text-[15px] font-semibold text-slate-50">Productive Mode on WhatsApp Web</h2>
        <ul className="list-disc space-y-1 pl-5 text-[13px] leading-snug text-slate-400">
          <li>Only chats on this list appear in the chat list. Other chats are hidden.</li>
          <li>Names must match exactly, as WhatsApp shows them. Letter case and extra spaces are ignored.</li>
          <li>If WhatsApp changes its layout, the chat list is hidden and the time counts as unproductive until it works again.</li>
        </ul>
      </Card>
      <Card className="space-y-3">
        <ul className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80" aria-label="Allowed WhatsApp chats">
          {chats.length === 0 ? <li className="px-3 py-3 text-[13px] text-slate-500">No chats allowed yet.</li> : null}
          {chats.map((name) => (
            <li key={name} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="truncate text-[13.5px] text-slate-100">{name}</span>
              <Button variant="ghost" className="px-2 py-1 text-[12.5px]" onClick={() => void act({ type: 'whatsapp.remove', chat: name }, `Removed "${name}".`)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="grid grid-cols-[1fr_auto] gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (chat.trim()) void act({ type: 'whatsapp.add', chat }, `Added "${chat.trim()}".`).then((ok) => ok && setChat(''));
          }}
        >
          <Field label="Add a chat name" htmlFor="wa-chat" hint={state.setupDone ? 'Adding costs the unlock cost.' : undefined}>
            <input id="wa-chat" className="field" value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Exact name as shown in WhatsApp" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="primary">Add</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function TasksSection({ state, act }: { state: EarnState; act: ReturnType<typeof useAct> }) {
  const now = useNow(60_000);
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('5');
  const [recurring, setRecurring] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; reward: string; recurring: boolean } | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await act(
      { type: 'task.add', title, rewardMin: Number(reward), recurring },
      `Task "${title.trim()}" added.`,
    );
    if (ok) setTitle('');
  };

  const saveEdit = async (task: Task) => {
    if (!draft) return;
    const ok = await act(
      { type: 'task.update', id: task.id, title: draft.title, rewardMin: Number(draft.reward), recurring: draft.recurring },
      'Task saved.',
    );
    if (ok) {
      setEditing(null);
      setDraft(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-2 text-[13px] leading-snug text-slate-400">
        <h2 className="text-[15px] font-semibold text-slate-50">Daily tasks</h2>
        <p>Recurring tasks pay once each local day when ticked. One-off tasks pay once, ever. Un-ticking never takes back a reward, and ticking again the same day does not pay twice.</p>
      </Card>
      <Card className="space-y-3">
        <form onSubmit={add} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_auto]">
          <Field label="Task" htmlFor="task-title" hint={state.setupDone ? 'Adding a task costs the unlock cost.' : undefined}>
            <input id="task-title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20 mock questions" maxLength={80} />
          </Field>
          <Field label="Reward (min)" htmlFor="task-reward">
            <input id="task-reward" className="field" type="number" min={1} max={60} value={reward} onChange={(e) => setReward(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="primary" className="w-full">Add task</Button>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-300 sm:col-span-3">
            <input type="checkbox" className="h-4 w-4 accent-emerald-400" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            Repeats every day
          </label>
        </form>
      </Card>
      <Card className="space-y-2">
        {state.tasks.length === 0 ? <Empty>No tasks yet.</Empty> : null}
        <ul className="divide-y divide-slate-800/80">
          {state.tasks.map((task) => {
            const done = isDoneToday(task, now);
            return (
              <li key={task.id} className="py-3">
                {editing === task.id && draft ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_auto]">
                    <input className="field" aria-label="Task name" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    <input className="field" aria-label="Reward minutes" type="number" min={1} max={60} value={draft.reward} onChange={(e) => setDraft({ ...draft, reward: e.target.value })} />
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={() => void saveEdit(task)}>Save</Button>
                      <Button onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button>
                    </div>
                    <label className="flex items-center gap-2 text-[13px] text-slate-300 sm:col-span-3">
                      <input type="checkbox" className="h-4 w-4 accent-emerald-400" checked={draft.recurring} onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })} />
                      Repeats every day
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-400"
                      checked={done}
                      aria-label={`Mark "${task.title}" done today`}
                      onChange={() => void act({ type: 'task.toggle', id: task.id })}
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[13.5px] ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</div>
                      <div className="text-[11.5px] text-slate-500">
                        +{task.rewardMin} min · {task.recurring ? 'daily' : 'one-off'}
                        {task.rewardedOn === dayKey(now) ? ' · paid today' : ''}
                      </div>
                    </div>
                    <Button variant="ghost" className="px-2 py-1 text-[12.5px]" onClick={() => { setEditing(task.id); setDraft({ title: task.title, reward: String(task.rewardMin), recurring: task.recurring }); }}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="px-2 py-1 text-[12.5px]" onClick={() => void act({ type: 'task.delete', id: task.id }, 'Task deleted.')}>
                      Delete
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function ProtectionSection({ state }: { state: EarnState }) {
  const [incognito, setIncognito] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  useEffect(() => {
    void incognitoAllowed().then(setIncognito);
  }, []);

  const download = async () => {
    setExporting(true);
    setExportError(null);
    const data = await exportAudit();
    setExporting(false);
    if (!data) {
      setExportError('Export failed. EarnTime did not respond.');
      return;
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `earntime-audit-${dayKey(Date.now())}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const recent: LedgerEntry[] = state.ledger.slice(-15).reverse();
  const last = state.lastReconcile;

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="text-[15px] font-semibold text-slate-50">What EarnTime enforces</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-snug text-slate-300">
          <li>Unproductive sites are blocked while the balance is empty. Half-productive sites in Unproductive Mode are blocked too.</li>
          <li>
            Time is counted only for the focused window's active tab, while you are at the computer or media is playing. Idle time is not counted.
          </li>
          <li>
            If usage runs past the balance while EarnTime was not running (extension disabled, browser closed, computer asleep), the excess becomes{' '}
            <strong className="text-rose-200">debt</strong>. Only productive sites open until you study it off.
          </li>
          <li>
            After setup, any change that makes usage easier costs the unlock cost ({state.settings.unlockCostMin} min). Making things stricter is free.
          </li>
          <li>Setup runs once. Balance cannot be reset through settings.</li>
          <li>Every change, charge and debt is written to an audit log. Export it below.</li>
        </ul>
      </Card>

      <Card className="space-y-3 border-amber-500/30">
        <h2 className="text-[15px] font-semibold text-amber-100">Chrome limitation (chrome://extensions)</h2>
        <p className="text-[13px] leading-snug text-slate-200">
          <InlineCode text={CHROME_LIMITATION_SENTENCE} />
        </p>
        <div className="space-y-2 text-[13px] leading-snug text-slate-300">
          <p>
            <strong className="text-slate-100">Can be blocked:</strong> opening <span className="font-mono text-[12px]">chrome://extensions</span> or{' '}
            <span className="font-mono text-[12px]">chrome://settings/extensions</span> in a tab. EarnTime redirects that tab to its block page.
          </p>
          <p>
            <strong className="text-slate-100">API used:</strong> <span className="font-mono text-[12px]">chrome.tabs</span> events (onCreated, onUpdated) with{' '}
            <span className="font-mono text-[12px]">chrome.tabs.update</span>. No other technique is used.
          </p>
          <p>
            <strong className="text-slate-100">Remaining bypasses:</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5 text-slate-400">
            <li>Right-click the EarnTime icon and choose "Remove from Chrome". Chrome allows this without opening any extensions page.</li>
            <li>A tab may briefly show the extensions page before the redirect runs.</li>
            <li>Incognito windows are not tracked unless you allow EarnTime in incognito.</li>
            <li>Uninstalling EarnTime deletes its data. Chrome itself, safe mode or another browser profile can also bypass EarnTime.</li>
            <li>
              Chrome's own settings or policies may disable extensions. Those controls are outside EarnTime's reach.
            </li>
          </ul>
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-[15px] font-semibold text-slate-50">Status</h2>
        <div className="text-[13px] text-slate-300">
          Incognito access:{' '}
          {incognito === null ? 'checking…' : incognito ? <span className="text-emerald-300">allowed (tracked)</span> : <span className="text-amber-200">not allowed (not tracked)</span>}
        </div>
        <div className="text-[13px] text-slate-300">
          Last interruption check:{' '}
          {last ? `${new Date(last.at).toLocaleString()} — charged ${formatDuration(last.chargedMs)}, debt added ${formatDuration(last.debtAddedMs)}` : 'none yet'}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-50">Audit export</h2>
            <p className="text-[12.5px] text-slate-400">Settings, lists, daily totals and the ledger as JSON. Hosts only; no page addresses. Editing the file does not change EarnTime.</p>
          </div>
          <Button onClick={() => void download()} disabled={exporting}>
            {exporting ? 'Preparing…' : 'Download JSON'}
          </Button>
        </div>
        {exportError ? <Notice tone="error">{exportError}</Notice> : null}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-[15px] font-semibold text-slate-50">Recent activity</h2>
        {recent.length === 0 ? <Empty>Nothing recorded yet.</Empty> : null}
        <ul className="space-y-1.5 text-[12.5px]">
          {recent.map((entry) => (
            <li key={entry.id} className="flex gap-3 rounded-lg bg-slate-950/50 px-3 py-2">
              <span className="w-44 shrink-0 whitespace-nowrap font-mono text-[11px] text-slate-500">{new Date(entry.at).toLocaleString()}</span>
              <span className="min-w-0 flex-1 text-slate-300">{entry.note}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function Settings() {
  const state = useStoredState();
  const [section, setSection] = useState<SectionId>(() => {
    const hash = window.location.hash.replace('#', '') as SectionId;
    return SECTIONS.some((s) => s.id === hash) ? hash : 'time';
  });
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const act = useAct(setNotice);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '') as SectionId;
      if (SECTIONS.some((s) => s.id === hash)) setSection(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const body = useMemo(() => {
    if (!state) return null;
    switch (section) {
      case 'time':
        return <TimeSection state={state} act={act} />;
      case 'websites':
        return <WebsitesSection state={state} act={act} />;
      case 'youtube':
        return <YouTubeSection state={state} act={act} />;
      case 'whatsapp':
        return <WhatsAppSection state={state} act={act} />;
      case 'tasks':
        return <TasksSection state={state} act={act} />;
      case 'protection':
        return <ProtectionSection state={state} />;
    }
  }, [state, section, act]);

  return (
    <div className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 gap-6 px-5 py-8 md:grid-cols-[250px_1fr]">
      <aside className="space-y-4">
        <div>
          <div className="text-[18px] font-semibold text-slate-50">EarnTime settings</div>
          <div className="text-[12.5px] text-slate-500">Changes that loosen rules cost screen time.</div>
        </div>
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto md:flex-col">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => {
                setSection(s.id);
                setNotice(null);
              }}
              aria-current={section === s.id ? 'page' : undefined}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-[13.5px] transition ${
                section === s.id ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <span className="block font-medium">{s.label}</span>
              <span className="hidden text-[11.5px] leading-snug text-slate-500 md:block">{s.hint}</span>
            </a>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 space-y-4" aria-live="polite">
        {notice ? <Notice tone={notice.tone === 'error' ? 'error' : 'success'}>{notice.text}</Notice> : null}
        {state ? body : <p className="text-slate-500">Loading…</p>}
        {state && !state.setupDone ? (
          <Notice tone="warn">
            Setup isn't finished. Changes made now are free, but the guided setup sets your starting balance.{' '}
            <a className="underline" href="setup.html">
              Open setup
            </a>
          </Notice>
        ) : null}
      </main>
    </div>
  );
}
