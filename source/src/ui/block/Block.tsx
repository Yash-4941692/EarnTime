import { useState } from 'react';
import { CHROME_LIMITATION_SENTENCE } from '../../core/constants';
import { ADULT_PAUSE_LINES, STUDY_LINES, pickMotivationLine, type MotivationLine } from '../../core/motivation';
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

/**
 * One line of encouragement where EarnTime stops you for time reasons. It is picked once per minute
 * and repeats, so the page does not change under the cursor while it is being read.
 */
function MotivationNote({ lines }: { lines: readonly MotivationLine[] }) {
  const [line] = useState(() => pickMotivationLine(lines, Date.now()));
  return (
    <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3" data-et-motivation="study">
      <p className="text-[12.5px] leading-snug text-emerald-100/90">
        <span className="font-semibold text-emerald-100">{line.title}</span> {line.text}
      </p>
    </div>
  );
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
      <MotivationNote lines={STUDY_LINES} />
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
      <MotivationNote lines={STUDY_LINES} />
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

/**
 * The motivational pause for the fixed adult-site focus guard. It says nothing about the site, the
 * reason, the balance or the debt: the point is the pause, and the wallet has nothing to do with it.
 * Rendered both by `block.html?reason=motivation` and by the dedicated `motivation.html` page the
 * declarativeNetRequest rule redirects to.
 */
function MotivationBlock() {
  const [line] = useState(() => pickMotivationLine(ADULT_PAUSE_LINES, Date.now()));
  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-5 text-center" data-et-motivation="pause">
      <p className="eyebrow">A MOMENT FOR YOURSELF</p>
      <h1 className="mt-3 text-[24px] font-semibold leading-snug text-slate-50">{line.title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-slate-300">{line.text}</p>
    </div>
  );
}

/**
 * True when the page is inside a frame. EarnTime never frames its own pages, so this only happens
 * when a website loads one of them — possible because the block pages have to be web-accessible for
 * the redirect rules to work. In that case nothing about the wallet is rendered.
 */
function useIsFramed(): boolean {
  const [framed] = useState(() => typeof window !== 'undefined' && window.top !== window);
  return framed;
}

export function Block({ reason, target }: { reason: string | null; target: string | null }) {
  const state = useStoredState();
  const framed = useIsFramed();
  const extensions = reason === 'extensions';
  const motivation = reason === 'motivation';
  const debt = state !== null && state.debtMs > 0;

  if (framed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
        <Card className="w-full space-y-2 p-6">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            EarnTime
          </div>
          <p className="text-[14px] leading-relaxed text-slate-300">EarnTime pages are not shown inside another site.</p>
        </Card>
      </div>
    );
  }

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
