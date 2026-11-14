import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';

/** Join class names, skipping falsy values; later conflicting Tailwind utilities win. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(' '));
}

/* ---------- Buttons ---------- */
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants = {
  primary: 'border border-brand-600 bg-brand-600 text-white hover:border-brand-700 hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
  export: 'border-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 text-white shadow-sm hover:from-amber-500 hover:via-yellow-600 hover:to-amber-600',
  danger: 'border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50',
  quiet: 'border border-transparent text-slate-600 hover:bg-slate-100 hover:text-navy-900',
  sun: 'min-h-11 border border-brand-600 bg-brand-600 px-5 py-0 text-white hover:bg-brand-700',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = 'primary', extra?: string): string {
  return cx(buttonBase, buttonVariants[variant], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}

/* ---------- Form fields ---------- */
export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:ring-3 focus:ring-brand-50 focus:outline-none';
export const inputErrorClass = 'border-red-500 focus:border-red-500 focus:ring-red-50';
export const inputCompactClass = 'w-auto max-w-full px-3 py-1.5 text-xs';

export function Input({ error, compact, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean; compact?: boolean }) {
  return <input className={cx(inputClass, compact && inputCompactClass, error && inputErrorClass, className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx('mb-1.5 block text-sm font-medium text-slate-700', className)} {...props} />;
}

/* ---------- Surfaces ---------- */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs', className)} {...props} />;
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cx('flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4', className)} {...props} />;
}

export function Notice({ tone, children, className }: { tone: 'error' | 'success'; children: ReactNode; className?: string }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-lg border px-4 py-3 text-sm', tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800', className)}>
      {children}
    </p>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-6 py-16 text-center text-sm text-slate-500', className)}>{children}</div>;
}

/** Small secondary label shown above a heading. */
export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('text-sm text-slate-500', className)} {...props} />;
}

/* ---------- Table class strings (use on <table>, <th>, <td>) ---------- */
export const tableClass = 'w-full text-left text-sm';
export const thClass = 'whitespace-nowrap bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';
export const tdClass = 'border-t border-slate-100 px-5 py-4';
