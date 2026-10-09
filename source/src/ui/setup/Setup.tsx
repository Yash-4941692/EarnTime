import { useState, type FormEvent, type ReactNode } from 'react';
import {
  DEFAULT_EARN_FROM_MIN,
  DEFAULT_EARN_TO_MIN,
  DEFAULT_HALF_SITES,
  DEFAULT_UNLOCK_COST_MIN,
  DEFAULT_YOUTUBE_KEYWORDS,
  SUGGESTED_PRODUCTIVE_SITES,
  SUGGESTED_UNPRODUCTIVE_SITES,
  MAX_SETUP_BALANCE_MIN,
  MAX_UNLOCK_COST_MIN,
} from '../../core/constants';
import type { SetupPayload } from '../../core/commands';
import { normalizeHostInput } from '../../core/domains';
import { Button, Card, Field, Notice } from '../components';
import { runCommand, useStoredState } from '../lib/extension';

const STEPS = ['Welcome', 'Earn rule', 'Starting balance', 'Websites', 'YouTube', 'WhatsApp', 'Daily tasks', 'Review'] as const;

interface Draft {
  earnFrom: string;
  earnTo: string;
  unlockCost: string;
  initial: string;
  productive: string[];
  half: string[];
  unproductive: string[];
  keywords: string[];
  chats: string[];
  groups: string[];
  tasks: Array<{ title: string; rewardMin: number; recurring: boolean }>;
}

const INITIAL: Draft = {
  earnFrom: String(DEFAULT_EARN_FROM_MIN),
  earnTo: String(DEFAULT_EARN_TO_MIN),
  unlockCost: String(DEFAULT_UNLOCK_COST_MIN),
  initial: '0',
  productive: [...SUGGESTED_PRODUCTIVE_SITES],
  half: [...DEFAULT_HALF_SITES],
  unproductive: [...SUGGESTED_UNPRODUCTIVE_SITES],
  keywords: [...DEFAULT_YOUTUBE_KEYWORDS],
  chats: [],
  groups: [],
  tasks: [],
};

function ChipInput({
  id,
  label,
  values,
  onChange,
  placeholder,
  hint,
  suggestions,
  normalize,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  hint?: string;
  suggestions?: readonly string[];
  normalize?: (value: string) => string | null;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = (raw: string) => {
    const value = normalize ? normalize(raw) : raw.trim();
    if (!value) {
      setError(normalize ? 'Enter a website such as example.com.' : 'Enter a name.');
      return;
    }
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setError('Already in the list.');
      return;
    }
    setError(null);
    onChange([...values, value]);
    setDraft('');
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add(draft);
  };
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-slate-200">
        {label}
      </label>
      <form onSubmit={submit} className="flex gap-2">
        <input id={id} className="field min-w-0 flex-1" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <Button type="submit" className="shrink-0">
          Add
        </Button>
      </form>
      {error || hint ? <p className={`text-[12px] leading-snug ${error ? 'text-rose-300' : 'text-slate-500'}`}>{error ?? hint}</p> : null}
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label={`${label} list`}>
          {values.map((v) => (
            <span key={v} className="chip">
              {v}
              <button type="button" className="ml-1 px-1 text-slate-400 hover:text-rose-300" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {suggestions && suggestions.some((s) => !values.includes(s)) ? (
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
          <span>Suggestions:</span>
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <button key={s} type="button" className="rounded-full border border-dashed border-slate-700 px-2.5 py-0.5 text-slate-300 hover:border-emerald-400/60" onClick={() => onChange([...values, s])}>
                + {s}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function Setup() {
  const state = useStoredState();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (state?.setupDone && !done) {
    return (
      <Shell>
        <Card className="space-y-3">
          <h1 className="text-[20px] font-semibold text-slate-50">Setup is already complete</h1>
          <p className="text-[14px] text-slate-400">Your rules are in Settings. Setup runs once so that the starting balance cannot be reset.</p>
          <a className="btn btn-primary inline-flex" href="settings.html">Open settings</a>
        </Card>
      </Shell>
    );
  }

  const ratioFrom = Number(draft.earnFrom);
  const ratioTo = Number(draft.earnTo);
  const ratioValid = Number.isInteger(ratioFrom) && Number.isInteger(ratioTo) && ratioFrom >= 1 && ratioTo >= 1 && ratioTo <= ratioFrom;

  const validate = (): string | null => {
    if (step === 1 && !ratioValid) return 'Productive minutes must be at least 1, and earned minutes must be between 1 and the productive minutes.';
    if (step === 1) {
      const cost = Number(draft.unlockCost);
      if (!Number.isInteger(cost) || cost < 0 || cost > MAX_UNLOCK_COST_MIN) return `The unlock cost must be between 0 and ${MAX_UNLOCK_COST_MIN} minutes.`;
    }
    if (step === 2) {
      const init = Number(draft.initial);
      if (!Number.isInteger(init) || init < 0 || init > MAX_SETUP_BALANCE_MIN) {
        return `Starting balance must be between 0 and ${MAX_SETUP_BALANCE_MIN} minutes.`;
      }
    }
    if (step === 3) {
      const all = [...draft.productive, ...draft.half, ...draft.unproductive];
      const hosts = all.map((h) => normalizeHostInput(h));
      if (hosts.some((h) => h === null)) return 'One of the websites is not valid. Remove it or correct it.';
      if (new Set(hosts).size !== hosts.length) return 'A website can be on only one list.';
    }
    return null;
  };

  const next = () => {
    const problem = validate();
    setError(problem);
    if (!problem) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    const payload: SetupPayload = {
      earnFromMin: ratioFrom,
      earnToMin: ratioTo,
      unlockCostMin: Number(draft.unlockCost),
      initialBalanceMin: Number(draft.initial),
      productive: draft.productive,
      half: draft.half,
      unproductive: draft.unproductive,
      youtubeKeywords: draft.keywords,
      whatsappChats: draft.chats,
      whatsappGroups: draft.groups,
      tasks: draft.tasks,
    };
    const result = await runCommand({ type: 'setup.complete', payload });
    setSaving(false);
    if (result.ok) setDone(true);
    else setError(result.message ?? 'Setup could not be saved.');
  };

  if (done) {
    return (
      <Shell>
        <Card className="space-y-4">
          <h1 className="text-[22px] font-semibold text-slate-50">You're set</h1>
          <p className="text-[14px] leading-relaxed text-slate-300">
            Study on a productive site and time will build up. Unproductive sites spend it. If you run out, you can repay debt by studying.
          </p>
          <div className="flex gap-2">
            <a className="btn btn-primary" href="settings.html">Open settings</a>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card className="space-y-5">
        <ol className="flex flex-wrap gap-1.5" aria-label="Setup progress">
          {STEPS.map((label, i) => (
            <li key={label} className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${i === step ? 'bg-emerald-400 text-emerald-950' : i < step ? 'bg-emerald-400/15 text-emerald-200' : 'bg-slate-800 text-slate-500'}`} aria-current={i === step ? 'step' : undefined}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="space-y-3">
            <h1 className="text-[22px] font-semibold text-slate-50">Study first, then spend</h1>
            <p className="text-[14px] leading-relaxed text-slate-300">EarnTime turns study time into screen time.</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-slate-300">
              <li><strong>Study</strong> on productive sites. Only the active tab counts.</li>
              <li><strong>Earn</strong> screen time at your ratio.</li>
              <li><strong>Use</strong> unproductive sites until the balance is spent.</li>
              <li><strong>Overspend</strong> and you are in debt: only productive sites open.</li>
              <li><strong>Repay</strong> the debt by studying.</li>
            </ol>
            <p className="text-[12.5px] text-slate-500">
              EarnTime is a self-discipline tool, not a lock. Chrome limits what an extension can control. See Settings → Protection.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-slate-50">Earn rule</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Productive minutes" htmlFor="s-from">
                <input id="s-from" className="field" type="number" min={1} value={draft.earnFrom} onChange={(e) => setDraft({ ...draft, earnFrom: e.target.value })} />
              </Field>
              <Field label="Earned minutes" htmlFor="s-to">
                <input id="s-to" className="field" type="number" min={1} value={draft.earnTo} onChange={(e) => setDraft({ ...draft, earnTo: e.target.value })} />
              </Field>
            </div>
            <p className="text-[13px] text-slate-400" aria-live="polite">
              {ratioValid ? `${ratioFrom} productive minutes earn ${ratioTo} minutes of screen time.` : 'Enter a valid ratio.'}
            </p>
            <Field label="Unlock cost (minutes)" htmlFor="s-cost" hint="After setup, making any rule easier costs this many minutes. Making rules stricter is free.">
              <input id="s-cost" className="field w-40" type="number" min={0} max={MAX_UNLOCK_COST_MIN} value={draft.unlockCost} onChange={(e) => setDraft({ ...draft, unlockCost: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-slate-50">Starting balance</h2>
            <p className="text-[13.5px] leading-relaxed text-slate-400">
              Most people start at zero and earn their first minutes. Add a starting balance only if you want some free time now.
            </p>
            <Field label="Starting balance (minutes)" htmlFor="s-init" hint={`Set once during setup, up to ${MAX_SETUP_BALANCE_MIN} minutes. It cannot be changed later through settings.`}>
              <input id="s-init" className="field w-40" type="number" min={0} max={MAX_SETUP_BALANCE_MIN} value={draft.initial} onChange={(e) => setDraft({ ...draft, initial: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-[18px] font-semibold text-slate-50">Websites</h2>
              <p className="mt-1 text-[13px] text-slate-400">Pick the sites that matter. You can change these later in Settings.</p>
            </div>
            <div className="space-y-2">
              <h3 className="eyebrow">Productive: earns time</h3>
              <ChipInput id="s-prod" label="Productive site" values={draft.productive} onChange={(productive) => setDraft({ ...draft, productive })} placeholder="e.g. nptel.ac.in" normalize={normalizeHostInput} suggestions={SUGGESTED_PRODUCTIVE_SITES} hint="Add search engines or documentation you need to study. Unlisted sites are blocked while in debt." />
            </div>
            <div className="space-y-2">
              <h3 className="eyebrow">Half-productive: you choose the mode each visit</h3>
              <ChipInput id="s-half" label="Half-productive site" values={draft.half} onChange={(half) => setDraft({ ...draft, half })} placeholder="e.g. reddit.com" normalize={normalizeHostInput} hint="YouTube and WhatsApp Web have study filters. Other sites are trusted in Productive Mode." />
            </div>
            <div className="space-y-2">
              <h3 className="eyebrow">Unproductive: spends time</h3>
              <ChipInput id="s-unprod" label="Unproductive site" values={draft.unproductive} onChange={(unproductive) => setDraft({ ...draft, unproductive })} placeholder="e.g. instagram.com" normalize={normalizeHostInput} suggestions={SUGGESTED_UNPRODUCTIVE_SITES} />
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-slate-50">YouTube keywords</h2>
            <p className="text-[13.5px] leading-relaxed text-slate-400">
              In Productive Mode, YouTube shows only channels whose <strong className="text-slate-200">name</strong> contains one of these keywords.
            </p>
            <ChipInput id="s-kw" label="Keyword" values={draft.keywords} onChange={(keywords) => setDraft({ ...draft, keywords })} placeholder="e.g. Physics" />
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-slate-50">WhatsApp chats</h2>
            <p className="text-[13.5px] leading-relaxed text-slate-400">
              In Productive Mode only these chats are visible. Use the exact name WhatsApp shows. You can leave this empty and add chats later.
            </p>
            <ChipInput id="s-chat" label="Chat name" values={draft.chats} onChange={(chats) => setDraft({ ...draft, chats })} placeholder="Exact chat name" />
            <ChipInput
              id="s-group"
              label="Group names"
              values={draft.groups}
              onChange={(groups) => setDraft({ ...draft, groups })}
              placeholder="e.g. Progress Check"
              hint="Optional. Auto-reply never messages a group unless a rule names it, and this list is how EarnTime tells groups from personal chats."
            />
          </div>
        ) : null}

        {step === 6 ? (
          <TasksStep tasks={draft.tasks} onChange={(tasks) => setDraft({ ...draft, tasks })} />
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-slate-50">Review</h2>
            <dl className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-[13.5px]">
              <dt className="text-slate-500">Earn rule</dt>
              <dd>{ratioFrom} productive min → {ratioTo} min</dd>
              <dt className="text-slate-500">Unlock cost</dt>
              <dd>{draft.unlockCost} min per loosening change</dd>
              <dt className="text-slate-500">Starting balance</dt>
              <dd>{draft.initial} min</dd>
              <dt className="text-slate-500">Productive</dt>
              <dd className="break-words">{draft.productive.join(', ') || 'none'}</dd>
              <dt className="text-slate-500">Half-productive</dt>
              <dd className="break-words">{draft.half.join(', ') || 'none'}</dd>
              <dt className="text-slate-500">Unproductive</dt>
              <dd className="break-words">{draft.unproductive.join(', ') || 'none'}</dd>
              <dt className="text-slate-500">YouTube keywords</dt>
              <dd className="break-words">{draft.keywords.join(', ') || 'none'}</dd>
              <dt className="text-slate-500">WhatsApp chats</dt>
              <dd className="break-words">{draft.chats.join(', ') || 'none'}</dd>
              <dt className="text-slate-500">WhatsApp groups</dt>
              <dd className="break-words">{draft.groups.join(', ') || 'none'}</dd>
              <dt className="text-slate-500">Tasks</dt>
              <dd>{draft.tasks.length}</dd>
            </dl>
            <Notice tone="warn">Setup can be completed once. After this, the starting balance and earn rule can only change by the rules in Settings → Protection.</Notice>
          </div>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}

        <div className="flex items-center justify-between gap-3 pt-1">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" onClick={() => void finish()} disabled={saving}>
              {saving ? 'Saving…' : 'Finish setup'}
            </Button>
          )}
        </div>
      </Card>
    </Shell>
  );
}

function TasksStep({ tasks, onChange }: { tasks: Draft['tasks']; onChange: (tasks: Draft['tasks']) => void }) {
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('5');
  const [recurring, setRecurring] = useState(true);
  const add = (event: FormEvent) => {
    event.preventDefault();
    const r = Number(reward);
    if (!title.trim() || !Number.isInteger(r) || r < 1 || r > 60) return;
    onChange([...tasks, { title: title.trim(), rewardMin: r, recurring }]);
    setTitle('');
  };
  return (
    <div className="space-y-4">
      <h2 className="text-[18px] font-semibold text-slate-50">Daily tasks (optional)</h2>
      <p className="text-[13.5px] leading-relaxed text-slate-400">Finishing a task earns screen time. Each task pays once per day (recurring) or once ever (one-off).</p>
      <form onSubmit={add} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_auto]">
        <Field label="Task" htmlFor="s-task">
          <input id="s-task" className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20 mock questions" maxLength={80} />
        </Field>
        <Field label="Reward (min)" htmlFor="s-reward">
          <input id="s-reward" className="field" type="number" min={1} max={60} value={reward} onChange={(e) => setReward(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit">Add</Button>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-300 sm:col-span-3">
          <input type="checkbox" className="h-4 w-4 accent-emerald-400" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Repeats every day
        </label>
      </form>
      <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800">
        {tasks.length === 0 ? <li className="px-3 py-3 text-[13px] text-slate-500">No tasks added.</li> : null}
        {tasks.map((t, i) => (
          <li key={`${t.title}-${i}`} className="flex items-center justify-between px-3 py-2.5 text-[13.5px]">
            <span>{t.title} <span className="text-slate-500">· +{t.rewardMin} min · {t.recurring ? 'daily' : 'one-off'}</span></span>
            <button type="button" className="text-[12.5px] text-slate-400 hover:text-rose-300" onClick={() => onChange(tasks.filter((_, j) => j !== i))}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl px-5 py-10">{children}</div>;
}
