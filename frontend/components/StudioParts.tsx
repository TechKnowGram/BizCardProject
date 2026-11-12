import type { ReactNode } from 'react';
import { inputClass } from './ui';

/** Shared class strings for the Card Studio / AI designer / wizard components. */
export const kickerClass = 'mb-1.75 block text-3xs font-black tracking-2xl text-[#4a1ff2]';
export const pillClass = 'rounded-full border border-[#ddd3ec] px-3 py-1.75 text-2xs text-[#796986]';
export const aiErrorClass = 'mt-3.5 text-sm leading-relaxed text-[#b42318]';
export const aiSuccessClass = 'mt-3.5 text-sm leading-relaxed text-[#067647]';
export const aiParagraphClass = 'text-sm leading-relaxed text-[#687086]';

/** A select styled like .input but with the compact editor padding. */
export const compactSelectClass =
  'mt-1.5 w-full rounded-xl border border-[#e3e8e6] bg-white px-1.75 py-2.25 text-xs capitalize transition focus:border-[#4a1ff2] focus:ring-3 focus:ring-[#e9e5fb] focus:outline-none';
export const selectClass = inputClass;

export function Kicker({ children }: { children: ReactNode }) {
  return <span className={kickerClass}>{children}</span>;
}
