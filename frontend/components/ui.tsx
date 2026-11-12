import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';

/** Join class names, skipping falsy values; later conflicting Tailwind utilities win. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(' '));
}

/* ---------- Buttons (final cascaded look of .btn-primary/.btn-secondary/.btn-danger/.btn-quiet/.btn-sun) ---------- */
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-medium transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants = {
  primary:
    'border border-black bg-black text-white enabled:hover:opacity-85',
  secondary: 'border border-black bg-white text-black enabled:hover:bg-lilac',
  danger: 'border border-[#ae3843] bg-white text-[#ae3843] enabled:hover:bg-[#fff0f1]',
  quiet: 'border border-transparent text-black/60 enabled:hover:bg-lilac enabled:hover:text-black',
  sun: 'min-h-11 gap-3 border border-transparent bg-mint px-5 py-0 text-black enabled:hover:opacity-85',
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
  'w-full rounded-[10px] border border-black/70 bg-white px-4 py-3 text-sm transition focus:border-royal focus:ring-3 focus:ring-lilac focus:outline-none';
export const inputErrorClass = 'border-[#dc6060]';
export const inputCompactClass = 'w-auto max-w-full px-3 py-2 text-xs';

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
