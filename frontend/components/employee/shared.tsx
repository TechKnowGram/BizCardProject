'use client';

import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

export const PRICE = 50;
export const QUANTITY_PRESETS = [20, 50, 100, 250, 500];

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = any;

/** Plain-language notes for the result of matching a join request against the company staff list. */
export const MATCH_HINTS: Record<string, string> = {
  ROSTER_MATCHED: 'Your details matched the company staff list, so your membership was activated.',
  ID_MISMATCH: 'Your employee ID was found but the email is different. The company admin will review it.',
  NOT_FOUND: 'The company admin will review your details.',
  INACTIVE_EMPLOYEE: 'Your staff record is marked inactive. The company admin will review it.',
};

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatSize(bytes?: number | null) {
  return bytes ? `${Math.ceil(bytes / 1024)} KB` : '—';
}

export function cardDownloadPath(card: Row) {
  return card.kind === 'personal' ? `/employee/personal-cards/${card.id}/download` : `/employee/cards/${card.id}/download`;
}

export function payerText(payer?: string) {
  return payer === 'COMPANY' ? 'Paid by company' : 'Paid by you';
}

/** Read-only label/value list used for account and membership details. */
export function DetailList({ items, className }: { items: ReadonlyArray<{ label: string; value: ReactNode } | false | null | undefined>; className?: string }) {
  return (
    <dl className={cx('divide-y divide-slate-100 text-sm', className)}>
      {items.filter(Boolean).map((item) => {
        const { label, value } = item as { label: string; value: ReactNode };
        return (
          <div key={label} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
            <dt className="text-slate-500">{label}</dt>
            <dd className="min-w-0 font-medium break-words text-slate-800">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Square company initial used next to company names. */
export function CompanyMark({ name, className }: { name?: string; className?: string }) {
  return (
    <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-base font-semibold text-brand-700', className)}>
      {(name || 'C').charAt(0).toUpperCase()}
    </span>
  );
}

/** Two-option segmented control (brand-blue selection). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: ReadonlyArray<{ value: T; label: ReactNode }>; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-white text-brand-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-navy-900',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Selectable option card with a radio circle. */
export function RadioCard({ checked, disabled, onSelect, title, meta, children }: { checked: boolean; disabled?: boolean; onSelect: () => void; title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
          : checked
            ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600'
            : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <span className={cx('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', checked && !disabled ? 'border-brand-600' : 'border-slate-300')}>
        {checked && !disabled && <span className="size-2 rounded-full bg-brand-600" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-navy-900">{title}</span>
          {meta && <span className="text-xs text-slate-500">{meta}</span>}
        </span>
        {children && <span className="mt-1 block text-sm text-slate-500">{children}</span>}
      </span>
    </button>
  );
}

/** Centered one-line empty state with an optional button. */
export function EmptyNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-8 text-center">
      <p className="text-sm text-slate-500">{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
