import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type Tone = 'productive' | 'unproductive' | 'half' | 'debt' | 'neutral' | 'paused' | 'info';

const TONE_TEXT: Record<Tone, string> = {
  productive: 'text-emerald-300',
  unproductive: 'text-amber-300',
  half: 'text-sky-300',
  debt: 'text-rose-300',
  neutral: 'text-slate-300',
  paused: 'text-slate-400',
  info: 'text-slate-200',
};

const TONE_DOT: Record<Tone, string> = {
  productive: 'bg-emerald-400',
  unproductive: 'bg-amber-400',
  half: 'bg-sky-400',
  debt: 'bg-rose-400',
  neutral: 'bg-slate-400',
  paused: 'bg-slate-500',
  info: 'bg-slate-300',
};

const TONE_BAR: Record<Tone, string> = {
  productive: 'bg-emerald-400',
  unproductive: 'bg-amber-400',
  half: 'bg-sky-400',
  debt: 'bg-rose-400',
  neutral: 'bg-slate-500',
  paused: 'bg-slate-500',
  info: 'bg-slate-300',
};

export function Card({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: 'debt' }) {
  const debt = tone === 'debt' ? 'border-rose-500/40 bg-rose-950/30' : '';
  return <section className={`card ${debt} ${className}`}>{children}</section>;
}

export function ModePill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-[12px] font-medium">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]} shadow-[0_0_10px_currentColor]`} aria-hidden="true" />
      <span className={`truncate ${TONE_TEXT[tone]}`}>{label}</span>
    </span>
  );
}

export function ProgressBar({ value, tone = 'productive', label }: { value: number; tone?: Tone; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full transition-[width] duration-700 ${TONE_BAR[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = 'info',
  hint,
  compact = false,
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-slate-800/80 bg-slate-950/50 ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className={`flex items-center gap-1.5 whitespace-nowrap font-medium text-slate-400 ${compact ? 'text-[10.5px]' : 'text-[11px]'}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className={`mt-1 font-semibold tabular-nums ${compact ? 'text-[16px]' : 'text-[17px]'} ${TONE_TEXT[tone]}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

/** Renders text where `backticks` mark inline code. The text content stays exact. */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split('`');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-slate-800/80 px-1 py-px font-mono text-[0.92em] text-slate-100">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];
  return <button type="button" {...props} className={`btn ${variantClass} ${className}`} />;
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-slate-200">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12px] leading-snug text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success' | 'warn'; children: ReactNode }) {
  const styles = {
    info: 'border-slate-700 bg-slate-900 text-slate-200',
    error: 'border-rose-500/40 bg-rose-950/40 text-rose-100',
    success: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100',
    warn: 'border-amber-500/40 bg-amber-950/30 text-amber-100',
  }[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-3 py-2.5 text-[13px] leading-snug ${styles}`}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-800 px-3 py-4 text-center text-[12.5px] text-slate-500">{children}</p>;
}
