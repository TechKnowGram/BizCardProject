import type { ReactNode } from 'react';
import { inputClass } from './ui';

/** Shared class strings for the Card Studio / AI designer / wizard components. */
export const kickerClass = 'mb-1.75 block text-3xs font-bold tracking-2xl text-brand-600';
export const pillClass = 'rounded-full border border-brand-100 px-3 py-1.75 text-2xs text-slate-500';
export const aiErrorClass = 'mt-3.5 text-sm leading-relaxed text-red-700';
export const aiSuccessClass = 'mt-3.5 text-sm leading-relaxed text-emerald-800';
export const aiParagraphClass = 'text-sm leading-relaxed text-slate-500';

/** A select styled like .input but with the compact editor padding. */
export const compactSelectClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-1.75 py-2.25 text-xs capitalize transition focus:border-brand-600 focus:ring-3 focus:ring-brand-50 focus:outline-none';
export const selectClass = inputClass;

export function Kicker({ children }: { children: ReactNode }) {
  return <span className={kickerClass}>{children}</span>;
}
