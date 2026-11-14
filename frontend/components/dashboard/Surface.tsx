import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import Icon from '@/components/ui/Icon';
import { cx } from '@/components/ui';

/**
 * Basic building blocks for every dashboard page. Keep pages built from these
 * so spacing, radius and type stay identical across roles.
 */

const fadeLeft = { maskImage: 'radial-gradient(ellipse 90% 100% at 0% 0%, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 100% at 0% 0%, black 60%, transparent 100%)' } as const;
const fadeRight = { maskImage: 'radial-gradient(ellipse 90% 100% at 100% 0%, black 60%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 100% at 100% 0%, black 60%, transparent 100%)' } as const;

/** True inside the one white card the workspace shell puts around every page. */
export const PageCardContext = createContext<{ icon?: string } | null>(null);

/** Card at the top of a page: title, short line under it, actions on the right, with a soft grid in the corners. */
export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  // Inside the page card it becomes the card's own top bar, running edge to edge.
  const card = useContext(PageCardContext);
  const inCard = card !== null;
  return (
    <header
      className={cx(
        'relative overflow-hidden bg-white px-4 py-3',
        inCard ? 'first:-mx-4 first:-mt-4 rounded-t-xl border-b border-slate-200 sm:first:-mx-5 sm:first:-mt-5' : 'rounded-xl border border-slate-200',
        className,
      )}
    >
      <span aria-hidden className="grid-fade pointer-events-none absolute top-0 bottom-0 left-0 w-[28rem] opacity-[0.1]" style={fadeLeft} />
      <span aria-hidden className="grid-fade pointer-events-none absolute top-0 right-0 bottom-0 w-[28rem] opacity-[0.1]" style={fadeRight} />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {card?.icon && (
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-brand-600 shadow-sm">
              <Icon name={card.icon} size={20} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-800">{title}</h1>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex max-w-full flex-wrap items-center gap-2 sm:flex-none">{actions}</div>}
      </div>
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
    <section className={cx('rounded-xl border border-slate-200 bg-white', className)}>
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
    <div className={cx('rounded-xl border border-slate-200 bg-white px-5 py-4', className)}>
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
