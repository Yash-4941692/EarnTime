/**
 * "Was that study time?" — the question about estimated half-productive time.
 *
 * When EarnTime is not running, a half-productive site's mode cannot be verified, so the estimated
 * stretch is split down the middle: half credited as study, half charged as unproductive. This card
 * lets the user replace that default with the truth; anything they do not answer keeps the default.
 */

import { useState } from 'react';
import { MINUTE_MS } from '../core/constants';
import { creditFor } from '../core/engine';
import { formatDuration, formatMinutes } from '../core/time';
import { unresolvedReviews } from '../core/halfReview';
import type { Command } from '../core/commands';
import type { EarnState, HalfReview } from '../core/types';
import { Button, Card, Field, Notice } from './components';
import { runCommand } from './lib/extension';

const clock = (ms: number): string => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function lastModeHint(review: HalfReview): string {
  if (review.entry === 'www.youtube.com' || review.entry === 'youtube.com') {
    return review.lastMode === 'productive'
      ? 'Before this gap you last chose Productive Mode there, so study time is likely.'
      : review.lastMode === 'unproductive'
        ? 'Before this gap you last chose Unproductive Mode there. Answer honestly — this is a question, not a rule.'
        : 'EarnTime has no mode recorded for it from before the gap.';
  }
  return review.lastMode === 'productive'
    ? 'Before this gap you last chose Productive Mode there.'
    : review.lastMode === 'unproductive'
      ? 'Before this gap you last chose Unproductive Mode there.'
      : 'EarnTime has no mode recorded for it from before the gap.';
}

function ReviewRow({ state, review, onError }: { state: EarnState; review: HalfReview; onError: (message: string) => void }) {
  const totalMin = Math.max(1, Math.round(review.totalMs / MINUTE_MS));
  const [minutes, setMinutes] = useState<string>(String(Math.round(review.productiveMs / MINUTE_MS)));
  const [busy, setBusy] = useState(false);
  const parsed = Number(minutes);
  const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= totalMin;
  const plannedStudyMin = valid ? Math.round(parsed) : Math.round(review.productiveMs / MINUTE_MS);
  const plannedUnproductiveMin = Math.max(0, totalMin - plannedStudyMin);

  const send = async (command: Command) => {
    setBusy(true);
    const result = await runCommand(command);
    setBusy(false);
    if (!result.ok) onError(result.message ?? 'EarnTime could not record that answer.');
  };

  return (
    <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-950/20 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-slate-100">{review.entry}</span>
        <span className="text-[11.5px] tabular-nums text-slate-400">
          {formatDuration(review.totalMs)} · {clock(review.from)}–{clock(review.to)}
        </span>
      </div>
      <p className="text-[12.5px] leading-snug text-slate-300">
        EarnTime was not running. Half of this time ({formatMinutes(review.productiveMs)}) is already counted as study and{' '}
        {formatMinutes(review.chargedMs)} was charged as unproductive. {lastModeHint(review)}
      </p>
      <Field label="How many of those minutes were study?" hint="The rest is charged as unproductive. This is free — it only corrects the estimate.">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={totalMin}
            step={1}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            aria-label={`Study minutes out of ${totalMin} for ${review.entry}`}
            className="field w-24"
          />
          <span className="text-[12.5px] text-slate-400">of {totalMin} min study</span>
        </div>
      </Field>
      <p className="text-[12px] tabular-nums text-slate-400">
        That earns {formatDuration(creditFor(state, plannedStudyMin * MINUTE_MS))} of screen time ({state.settings.earnFromMin}:
        {state.settings.earnToMin}) and charges {plannedUnproductiveMin} min.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={busy || !valid}
          onClick={() => void send({ type: 'review.set', id: review.id, productiveMs: plannedStudyMin * MINUTE_MS })}
        >
          Save answer
        </Button>
        <Button disabled={busy} onClick={() => void send({ type: 'review.keep', id: review.id })}>
          Keep half &amp; half
        </Button>
      </div>
    </div>
  );
}

/**
 * The card shown in the popup and on the debt block page. Renders nothing when there is no question
 * waiting, so it can be dropped into any page that has the state.
 */
export function HalfReviewCard({ state, onError }: { state: EarnState; onError?: (message: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const reviews = unresolvedReviews(state);
  if (reviews.length === 0) return null;
  const report = (message: string) => {
    setError(message);
    onError?.(message);
  };
  return (
    <Card className="space-y-2.5 border-sky-500/40">
      <div className="flex items-center justify-between gap-2">
        <h2 className="eyebrow">Was that study time?</h2>
        <span className="text-[11.5px] text-slate-400">{reviews.length === 1 ? '1 estimate' : `${reviews.length} estimates`}</span>
      </div>
      {reviews.map((review) => (
        <ReviewRow key={review.id} state={state} review={review} onError={report} />
      ))}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <p className="text-[11.5px] leading-snug text-slate-500">
        Half-productive time during an interruption cannot be checked, so it is split half study / half unproductive until you
        answer. Unanswered questions keep the half &amp; half default.
      </p>
    </Card>
  );
}
