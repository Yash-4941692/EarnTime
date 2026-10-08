import { CHROME_LIMITATION_SENTENCE } from '../../core/constants';
import { dashboardView } from '../../core/view';
import { formatDuration } from '../../core/time';
import { Button, Card, InlineCode, ProgressBar } from '../components';
import { useNow, useStoredState } from '../lib/extension';
import type { EarnState } from '../../core/types';

function studyTarget(state: EarnState | null): string {
  const first = state?.rules.productive[0];
  return first ? `https://${first}/` : 'chrome://newtab/';
}

function DebtBlock({ state }: { state: EarnState }) {
  const now = useNow(1000);
  const view = dashboardView(state, now);
  const last = state.lastReconcile;
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

function ExtensionsBlock() {
  return (
    <>
      <h1 className="text-[24px] font-semibold text-slate-50">Extension settings are protected</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
        EarnTime sends extension management pages here so changes are not made in the middle of a study session. Use EarnTime's settings page to change rules.
      </p>
      <p className="mt-3 rounded-xl bg-amber-950/30 p-3 text-[12.5px] leading-snug text-amber-100/90">
        <InlineCode text={CHROME_LIMITATION_SENTENCE} />
      </p>
    </>
  );
}

export function Block({ reason }: { reason: string | null }) {
  const state = useStoredState();
  const extensions = reason === 'extensions';
  const debt = state !== null && state.debtMs > 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
      <Card className="w-full space-y-4 p-6">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          EarnTime
        </div>
        {extensions ? (
          <ExtensionsBlock />
        ) : state === null ? (
          <p className="text-slate-500">Loading…</p>
        ) : debt ? (
          <DebtBlock state={state} />
        ) : (
          <ExhaustedBlock state={state} />
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <a className="btn btn-primary" href={extensions ? 'settings.html' : studyTarget(state)}>
            {extensions ? 'Open EarnTime settings' : 'Study now'}
          </a>
          <Button variant="secondary" onClick={() => (history.length > 1 ? history.back() : undefined)}>
            Go back
          </Button>
        </div>
        {state ? (
          <p className="text-[12px] text-slate-500">
            Balance {formatDuration(state.balanceMs)}
            {state.debtMs > 0 ? ` · debt ${formatDuration(state.debtMs)}` : ''}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
