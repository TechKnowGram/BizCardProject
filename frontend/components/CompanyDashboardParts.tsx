import type { ReactNode } from 'react';

/** Extract a readable message from an unknown thrown value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Kicker + title + optional copy used at the start of a panel header. */
export function PanelTitle({ kicker, title, copy }: { kicker: string; title: string; copy?: ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-3xs font-bold tracking-2xl text-brand-600">{kicker}</span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {copy !== undefined && <p className="mt-1.5 text-xs text-slate-500">{copy}</p>}
    </div>
  );
}

/** Small secondary text under a table cell / list entry. */
export const cellNoteClass = 'mt-1 block text-3xs text-slate-500';

/** Rounded purple icon tile used in request rows. */
export const requestIconClass = 'grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600';

/** Compact select/input class (written out whole so width utilities do not clash). */
export const compactSelectClass =
  'w-auto max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs transition focus:border-brand-600 focus:ring-3 focus:ring-brand-50 focus:outline-none max-sm:w-full';

/** Field label rendered on a span inside a wrapping label. */
export const fieldLabelClass = 'mb-2 block text-xs font-semibold text-slate-600';

export const hintClass = 'mt-1.5 text-3xs text-slate-500';
