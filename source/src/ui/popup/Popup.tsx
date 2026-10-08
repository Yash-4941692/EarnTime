import { useEffect, useState } from 'react';
import type { Command } from '../../core/commands';
import { isDoneToday } from '../../core/tasks';
import { dayKey, formatDuration } from '../../core/time';
import { dashboardView, type DashboardView, type ModeTone } from '../../core/view';
import type { EarnState, Task } from '../../core/types';
import { Button, Card, ModePill, Notice, ProgressBar, Stat, type Tone } from '../components';
import { incognitoAllowed, openExtensionPage, runCommand, useNow, useStoredState } from '../lib/extension';

const TONE: Record<ModeTone, Tone> = {
  productive: 'productive',
  unproductive: 'unproductive',
  half: 'half',
  debt: 'debt',
  neutral: 'neutral',
  paused: 'paused',
};

function DebtCard({ state, view }: { state: EarnState; view: DashboardView }) {
  const last = state.lastReconcile;
  return (
    <Card tone="debt" className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-rose-200">DEBT MODE</span>
        <span className="text-[12px] text-rose-200/80">Only productive sites are open</span>
      </div>
      <div>
        <div className="text-[12px] text-slate-400">You owe</div>
        <div className="text-[26px] font-semibold tabular-nums text-rose-200">{formatDuration(view.debtMs)}</div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[12px] text-slate-400">
          <span>
            Repaid {formatDuration(view.debtRepaidMs)} of {formatDuration(view.debtOriginMs)}
          </span>
          <span className="tabular-nums">{Math.round(view.debtRepaidRatio * 100)}%</span>
        </div>
        <ProgressBar value={view.debtRepaidRatio} tone="debt" label="Debt repaid" />
      </div>
      <p className="text-[12.5px] leading-snug text-slate-300">
        Study <strong className="text-rose-100">{formatDuration(view.requiredProductiveMs)}</strong> of productive time to clear it{' '}
        <span className="text-slate-500">
          ({state.settings.earnFromMin} productive min → {state.settings.earnToMin} earned)
        </span>
        .
      </p>
      {last ? (
        <details className="text-[12px] text-slate-400">
          <summary className="cursor-pointer select-none text-slate-300">Why this debt exists</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-slate-950/60 p-2.5 leading-snug">
            <div>
              Interruption from {new Date(last.from).toLocaleString()} to {new Date(last.to).toLocaleString()}.
            </div>
            <div>
              Charged {formatDuration(last.chargedMs)} of unproductive use; credited {formatDuration(last.productiveCreditMs)} of
              study.
            </div>
            <div>Debt added {formatDuration(last.debtAddedMs)}. Estimated from browser history; see the audit export in Settings.</div>
          </div>
        </details>
      ) : null}
    </Card>
  );
}

function TasksCard({ tasks, now, onError }: { tasks: Task[]; now: number; onError: (message: string) => void }) {
  const done = tasks.filter((t) => isDoneToday(t, now)).length;
  const toggle = async (id: string) => {
    const result = await runCommand({ type: 'task.toggle', id } as Command);
    if (!result.ok) onError(result.message ?? 'Could not update that task.');
  };
  return (
    <Card className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">Today's tasks</h2>
        {tasks.length > 0 ? <span className="text-[12px] tabular-nums text-slate-400">{done}/{tasks.length} done</span> : null}
      </div>
      {tasks.length === 0 ? (
        <p className="text-[12.5px] leading-snug text-slate-500">Add study goals in Settings → Daily tasks. Finishing one earns screen time.</p>
      ) : (
        <ul className="space-y-1">
          {tasks.map((task) => {
            const checked = isDoneToday(task, now);
            return (
              <li key={task.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-800/50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-400"
                    checked={checked}
                    onChange={() => void toggle(task.id)}
                    aria-label={`Mark "${task.title}" done`}
                  />
                  <span className={`flex-1 truncate text-[13px] ${checked ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</span>
                  <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-300">
                    +{task.rewardMin}m
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function Popup() {
  const state = useStoredState();
  const now = useNow(1000);
  const [incognito, setIncognito] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void incognitoAllowed().then(setIncognito);
  }, []);

  if (!state) return <div className="p-6 text-center text-[13px] text-slate-500">Loading…</div>;

  const view = dashboardView(state, now);

  return (
    <div className="flex min-h-[460px] flex-col gap-3 p-3.5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-400 text-emerald-950 shadow-[0_6px_20px_-6px_rgba(52,211,153,0.6)]" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M9 2h6" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-slate-50">EarnTime</div>
            <div className="text-[11px] text-slate-500">Study first, then spend</div>
          </div>
        </div>
        <Button variant="ghost" className="px-2 py-1.5" onClick={() => openExtensionPage('settings.html')} aria-label="Open settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
          </svg>
        </Button>
      </header>

      <div>
        <ModePill label={view.modeLabel} tone={TONE[view.modeTone]} />
      </div>

      {!state.setupDone ? (
        <Notice tone="warn">
          Setup isn't finished.{' '}
          <button className="font-semibold underline underline-offset-2" onClick={() => openExtensionPage('setup.html')}>
            Finish setup
          </button>
        </Notice>
      ) : null}

      {incognito === false && state.setupDone ? (
        <Notice tone="warn">
          Incognito windows aren't tracked. Allow EarnTime in incognito from <span className="font-mono text-[12px]">chrome://extensions</span> to count them.
        </Notice>
      ) : null}

      {view.debtMs > 0 ? (
        <DebtCard state={state} view={view} />
      ) : (
        <Card className="space-y-3 bg-gradient-to-b from-slate-900/80 to-slate-950/80">
          <div>
            <div className="eyebrow">Remaining</div>
            <div className="mt-1 text-[34px] font-semibold leading-none tabular-nums text-slate-50" aria-live="off">
              {formatDuration(view.balanceMs)}
            </div>
            <div className="mt-1.5 text-[11.5px] text-slate-500">{view.ratioLabel}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Earned" value={formatDuration(view.earnedToday)} tone="productive" hint="today" />
            <Stat label="Used" value={formatDuration(view.usedToday)} tone="unproductive" hint="today" />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat compact label="Productive" value={formatDuration(view.productiveToday)} tone="productive" hint="today" />
        <Stat compact label="Half-productive" value={formatDuration(view.halfToday)} tone="half" hint="today" />
        <Stat compact label="Unproductive" value={formatDuration(view.unproductiveToday)} tone="unproductive" hint="today" />
      </div>

      <TasksCard tasks={state.tasks} now={now} onError={setNotice} />

      {notice ? <Notice tone="error">{notice}</Notice> : null}

      <footer className="mt-auto flex items-center justify-between pt-1 text-[11px] text-slate-600">
        <span>Counted only while the tab is active.</span>
        <button className="text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline" onClick={() => openExtensionPage('settings.html#protection')}>
          Protection limits
        </button>
      </footer>
      <span className="sr-only">Today {dayKey(now)}</span>
    </div>
  );
}
