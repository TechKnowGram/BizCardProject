import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';

/** Join class names, skipping falsy values; later conflicting Tailwind utilities win. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(' '));
}

/* ---------- Buttons (TechKnowGram corporate theme) ---------- */
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-display text-sm font-semibold transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants = {
  primary:
    'border border-[#2d62a8] bg-[#2d62a8] text-white hover:bg-[#28528d] shadow-xs active:bg-[#1a2462]',
  secondary:
    'border border-slate-200 bg-white text-slate-800 hover:bg-[#eef3fa] hover:text-[#2d62a8] hover:border-[#b2c7e7]',
  danger:
    'border border-[#e20917]/30 bg-white text-[#e20917] hover:bg-rose-50 hover:border-[#e20917]',
  quiet:
    'border border-transparent text-slate-600 hover:bg-[#eef3fa] hover:text-[#2d62a8]',
  sun:
    'min-h-11 gap-3 border border-[#2d62a8] bg-[#3267b0] px-5 py-0 text-white hover:bg-[#28528d] shadow-sm',
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
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition focus:border-[#2d62a8] focus:ring-3 focus:ring-[#eef3fa] focus:outline-none';
export const inputErrorClass = 'border-[#e20917] focus:ring-rose-100';
export const inputCompactClass = 'w-auto max-w-full px-3 py-1.5 text-xs';

export function Input({ error, compact, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean; compact?: boolean }) {
  return <input className={cx(inputClass, compact && inputCompactClass, error && inputErrorClass, className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx('mb-2 block text-xs font-semibold text-[#4f5566]', className)} {...props} />;
}

/* ---------- Surfaces ---------- */
export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm', className)} {...props} />;
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header className={cx('flex flex-wrap items-center justify-between gap-4 border-b border-[#edf0f5] px-6 py-5', className)} {...props} />;
}

export function Notice({ tone, children, className }: { tone: 'error' | 'success'; children: ReactNode; className?: string }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-xl px-4 py-3 text-sm', tone === 'error' ? 'bg-[#fff0f1] text-[#ae3843]' : 'bg-[#edf8f2] text-[#287459]', className)}>
      {children}
    </p>
  );
}

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-6 py-16 text-center text-sm text-[#8991a3]', className)}>{children}</div>;
}

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('text-2xs font-bold tracking-2xl text-[#7c8a90]', className)} {...props} />;
}

/* ---------- Table class strings (use on <table>, <th>, <td>) ---------- */
export const tableClass = 'w-full text-left text-xs';
export const thClass = 'whitespace-nowrap bg-[#fafbfe] px-5 py-3.5 text-2xs font-medium uppercase tracking-wider text-[#858b9b]';
export const tdClass = 'border-t border-[#eef0f5] px-5 py-4.5';
