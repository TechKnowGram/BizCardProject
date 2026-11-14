import type { ReactNode } from 'react';
import { cx, inputClass } from '@/components/ui';

/** Shared class strings for the Card Studio / AI designer / brand kit components. */
export const aiErrorClass = 'mt-3 text-sm leading-relaxed text-red-700';
export const aiSuccessClass = 'mt-3 text-sm leading-relaxed text-emerald-800';
export const aiParagraphClass = 'text-sm leading-relaxed text-slate-500';

/** Small label above a field. */
export const studioLabelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

/** A select styled like the standard input, slightly more compact. */
export const compactSelectClass = cx(inputClass, 'mt-1.5 px-3 py-2 capitalize');
export const selectClass = inputClass;

/** Option button with a brand-blue selected state (templates, variations, prompt ideas). */
export function optionClass(selected: boolean, extra?: string): string {
  return cx(
    'rounded-xl border bg-white text-left transition-colors',
    selected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300',
    extra,
  );
}

/** Colour picker + hex value, used by the brand kit and design editor. */
export function ColorField({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0">
      <span className="mb-1.5 block text-sm text-slate-600 capitalize">{label}</span>
      <span className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
        <input aria-label={`${label} colour`} type="color" className="size-7 flex-none cursor-pointer rounded border-0 bg-transparent p-0" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
        <span className="truncate text-xs text-slate-600 uppercase tabular-nums">{value}</span>
      </span>
    </label>
  );
}

/** Section heading inside a studio card. */
export function StudioHeading({ title, description, aside }: { title: ReactNode; description?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-navy-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}
