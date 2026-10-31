import { useState } from 'react';
import { CHROME_LIMITATION_SENTENCE } from '../../core/constants';
import { isGuardedUrl } from '../../core/roles';
import { unresolvedReviews } from '../../core/halfReview';
import { dashboardView } from '../../core/view';
import { formatDuration } from '../../core/time';
import { Button, Card, InlineCode, Notice, ProgressBar } from '../components';
import { HalfReviewCard } from '../halfReview';
import { continueToGuardedPage, useNow, useStoredState } from '../lib/extension';
import type { EarnState } from '../../core/types';

function studyTarget(state: EarnState | null): string {
  const first = state?.rules.productive[0];
  return first ? `https://${first}/` : 'chrome://newtab/';
}

function DebtBlock({ state }: { state: EarnState }) {
  const now = useNow(1000);
  const view = dashboardView(state, now);
  const last = state.lastReconcile;
  const [error, setError] = useState<string | null>(null);
  const waiting = unresolvedReviews(state);
  return (
    <>
      <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-rose-200">DEBT MODE</span>
      <h1 className="mt-3 text-[24px] font-semibold text-slate-50">You owe {formatDuration(view.debtMs)}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
        Only productive sites are open until the debt is repaid. Study{' '}
        <strong className="text-rose-100">{formatDuration(view.requiredProductiveMs)}</strong> of productive time to clear it.
      </p>
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[12px] text-slate-400">
          <span>Repaid {formatDuration(view.debtRepaidMs)} of {formatDuration(view.debtOriginMs)}</span>
          <span className="tabular-nums">{Math.round(view.debtRepaidRatio * 100)}%</span>
        </div>
        <ProgressBar value={view.debtRepaidRatio} tone="debt" label="Debt repaid" />
      </div>
      {last ? (
        <p className="mt-4 rounded-xl bg-slate-950/60 p-3 text-[12.5px] leading-snug text-slate-400">
          Why: unproductive use of {formatDuration(last.chargedMs)} during an interruption, with a balance that could cover less. Study credit that day was {formatDuration(last.productiveCreditMs)}.
        </p>
      ) : null}
      {waiting.length > 0 ? (
        <div className="mt-4 space-y-3 text-left">
          <p className="text-[12.5px] leading-snug text-sky-100/90">
            Part of this debt is estimated half-productive time ({waiting.length === 1 ? waiting[0].entry : `${waiting.length} sites`}). Half of it already
            counts as study and half as unproductive. Answer below to change that.
          </p>
          <HalfReviewCard state={state} onError={setError} />
          {error ? <Notice tone="error">{error}</Notice> : null}
        </div>
      ) : null}
    </>
  );
}

function ExhaustedBlock({ state }: { state: EarnState }) {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-slate-50">Screen time used up</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
        Unproductive sites are blocked until you earn more time. Study on a productive site, then come back.
      </p>
      <p className="mt-3 text-[12.5px] text-slate-500">
        Earn rule: {state.settings.earnFromMin} productive minutes → {state.settings.earnToMin} minutes.
      </p>
    </>
  );
}

function ExtensionsBlock({ target }: { target: string | null }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canContinue = target !== null && isGuardedUrl(target);

  const continueToChrome = async () => {
    if (!target || !canContinue) return;
    setBusy(true);
    setError(null);
    const result = await continueToGuardedPage(target);
    setBusy(false);
    if (!result.ok) setError(result.message ?? 'Chrome could not open its extension settings.');
  };

  return (
    <>
      <h1 className="text-[24px] font-semibold text-slate-50">Extension settings are protected</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
        Before opening Chrome's extension controls, pause and remember why you started. Would you still like to continue? You can change EarnTime's rules in its settings page.
      </p>
      <p className="mt-3 rounded-xl bg-amber-950/30 p-3 text-[12.5px] leading-snug text-amber-100/90">
        <InlineCode text={CHROME_LIMITATION_SENTENCE} />
      </p>
      {canContinue ? (
        <div className="space-y-2">
          <Button variant="danger" onClick={() => void continueToChrome()} disabled={busy}>
            {busy ? 'Opening Chrome settings…' : 'Continue to Chrome settings'}
          </Button>
          {error ? <Notice tone="error">{error}</Notice> : null}
        </div>
      ) : null}
    </>
  );
}

const MOTIVATION_LINES = [
  {
    title: "Bro/Sis, don't lose to lust.",
    text: 'Remember why you started. One small choice now protects the future you are working for.',
  },
  {
    title: 'Did you forget why you started?',
    text: "Don't trade your goal for a passing urge. Take a breath, close this tab, and choose your next step.",
  },
  {
    title: "Time can't be bought this cheap.",
    text: 'Every distraction is paid back with interest called regret. Spend this moment on the life you want.',
  },
  {
    title: 'Your future self is counting on you.',
    text: 'Pause, reset, and put your attention where you meant it to go.',
  },
] as const;

function MotivationBlock() {
  const [line] = useState(() => MOTIVATION_LINES[Math.floor(Date.now() / 60_000) % MOTIVATION_LINES.length]);
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 text-center">
      <p className="eyebrow">A MOMENT FOR YOURSELF</p>
      <h1 className="mt-3 text-[24px] font-semibold leading-snug text-slate-50">{line.title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-300">{line.text}</p>
    </div>
  );
}

export function Block({ reason, target }: { reason: string | null; target: string | null }) {
  const state = useStoredState();
  const extensions = reason === 'extensions';
  const motivation = reason === 'motivation';
  const debt = state !== null && state.debtMs > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
      <Card className="w-full space-y-4 p-6">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          EarnTime
        </div>
        {extensions ? (
          <ExtensionsBlock target={target} />
        ) : motivation ? (
          <MotivationBlock />
        ) : state === null ? (
          <p className="text-slate-500">Loading…</p>
        ) : debt ? (
          <DebtBlock state={state} />
        ) : (
          <ExhaustedBlock state={state} />
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <a className="btn btn-primary" href={extensions ? 'settings.html' : studyTarget(state)}>
            {extensions ? 'Open EarnTime settings' : motivation ? 'Back to my goal' : 'Study now'}
          </a>
          <Button variant="secondary" onClick={() => (history.length > 1 ? history.back() : undefined)}>
            Go back
          </Button>
        </div>
        {state && !motivation ? (
          <p className="text-[12px] text-slate-500">
            Balance {formatDuration(state.balanceMs)}
            {state.debtMs > 0 ? ` · debt ${formatDuration(state.debtMs)}` : ''}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
