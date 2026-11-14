import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

/** Extract a readable message from an unknown thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** "12 Nov 2026, 3:40 PM" style date used across the company workspace. */
export function formatDate(value?: string | null): string {
  return value
    ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
}

/** Date only, for table columns. */
export function formatDay(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

/** Taka amount as shown elsewhere in the product. */
export function formatTaka(value: number | string | null | undefined): string {
  return `৳${Number(value) || 0}`;
}

/** Small secondary text under a table cell / list entry. */
export const cellNoteClass = 'mt-0.5 block text-xs text-slate-500';

/** Field label rendered on a span inside a wrapping label. */
export const fieldLabelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

/** Helper text under a field or block. */
export const hintClass = 'mt-2 text-xs leading-relaxed text-slate-500';

/** Small buttons used inside table rows. */
export const rowButtonClass = 'px-3 py-1.5 text-xs';

/** Checkbox used in tables and pickers. */
export const checkboxClass = 'size-4 cursor-pointer rounded border-slate-300 accent-brand-600 disabled:cursor-not-allowed disabled:opacity-40';

/** Thin progress line with a label, e.g. profile completion or setup progress. */
export function ProgressLine({ value, label, className }: { value: number; label?: ReactNode; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-xs text-slate-500">{label}</p>}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={width}>
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/** Round check mark used in checklists and step indicators. */
export function CheckDot({ done, children, className }: { done: boolean; children?: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
        done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-500',
        className,
      )}
    >
      {done ? (
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 10.5 3.2 3L15 7" /></svg>
      ) : children}
    </span>
  );
}

/** Numbered step indicator used in multi-step dialogs. */
export function StepIndicator({ steps, current }: { steps: ReadonlyArray<string>; current: number }) {
  return (
    <ol className="flex items-center gap-3 border-b border-slate-100 pb-5">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = number === current;
        const done = number < current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-3" aria-current={active ? 'step' : undefined}>
            <CheckDot done={done} className={active ? 'border-brand-600 text-brand-700' : undefined}>{number}</CheckDot>
            <span className={cx('truncate text-sm', active ? 'font-semibold text-navy-900' : done ? 'text-slate-700' : 'text-slate-500')}>{label}</span>
            {number < steps.length && <span aria-hidden="true" className="h-px flex-1 bg-slate-200 max-sm:hidden" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Calm notice card (amber for "waiting", red for "needs attention"). */
export function NoticeCard({ tone, title, children, action }: { tone: 'amber' | 'red'; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="status"
      className={cx(
        'flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between',
        tone === 'amber' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50',
      )}
    >
      <div className="flex gap-3">
        <span aria-hidden="true" className={cx('mt-1.5 size-2 shrink-0 rounded-full', tone === 'amber' ? 'bg-amber-500' : 'bg-red-500')} />
        <div>
          <p className={cx('text-sm font-semibold', tone === 'amber' ? 'text-amber-900' : 'text-red-900')}>{title}</p>
          {children && <p className={cx('mt-0.5 text-sm leading-relaxed', tone === 'amber' ? 'text-amber-800' : 'text-red-800')}>{children}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Label / value row inside a definition list card. */
export function DetailRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-navy-900">{children}</dd>
    </div>
  );
}

/** How a membership request compares with the staff list. */
const MATCH_LABELS: Record<string, { label: string; tone: string; dot: string }> = {
  ROSTER_MATCHED: { label: 'Matches staff list', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  ID_MISMATCH: { label: 'Email does not match', tone: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  NOT_FOUND: { label: 'Not on staff list', tone: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  INACTIVE_EMPLOYEE: { label: 'Inactive on staff list', tone: 'bg-slate-100 text-slate-700 ring-slate-200', dot: 'bg-slate-400' },
};

export function MatchBadge({ value }: { value: string }) {
  const info = MATCH_LABELS[value];
  if (!info) return null;
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', info.tone)}>
      <span className={cx('size-1.5 rounded-full', info.dot)} />
      {info.label}
    </span>
  );
}

/** Two-option segmented control, used to switch between related tables. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: ReadonlyArray<{ value: T; label: string }>; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'h-full rounded-md px-3 text-sm font-medium transition-colors',
            value === option.value ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-navy-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
