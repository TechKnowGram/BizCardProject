import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

/**
 * Basic building blocks for every dashboard page. Keep pages built from these
 * so spacing, radius and type stay identical across roles.
 */

/** White rounded block at the top of a page: title, short line under it, actions on the right. */
export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cx('flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-xs sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Small "i" icon with a native tooltip, placed after a card title. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span title={text} aria-label={text} role="img" className="inline-grid size-4 cursor-help place-items-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400">
      i
    </span>
  );
}

/** A titled white card. */
export function SectionCard({
  title,
  info,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  info?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx('rounded-2xl border border-slate-200 bg-white shadow-xs', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          {title && (
            <h2 className="flex items-center gap-2 text-base font-semibold text-navy-900">
              {title}
              {info && <InfoTip text={info} />}
            </h2>
          )}
          {action && <div className="shrink-0 text-sm">{action}</div>}
        </div>
      )}
      <div className={cx('px-6 pt-4 pb-6', bodyClassName)}>{children}</div>
    </section>
  );
}

/** One number with a label. Neutral on purpose: no coloured strips or icons. */
export function StatTile({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs', className)}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-[1.75rem] leading-tight font-bold text-navy-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

/** A plain text link-button used in card headers ("View all", "All companies"). */
export function CardLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-medium text-brand-600 hover:text-brand-700">
      {children}
    </button>
  );
}

/** Light select used in page headers and table toolbars. */
export function ToolbarSelect({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: ReadonlyArray<{ value: string; label: string }>; label: string }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-sm text-slate-700 transition hover:border-slate-300 focus:border-brand-600 focus:ring-3 focus:ring-brand-50 focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
    </label>
  );
}
