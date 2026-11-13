'use client';

import { useEffect } from 'react';
import { cx } from '@/components/ui';

export type ToastType = 'success' | 'error';

export interface ToastProps {
  type?: ToastType;
  message?: string | null;
  onClose: () => void;
}

export default function Toast({ type = 'success', message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  const error = type === 'error';
  return <div className={cx('fixed top-5.5 right-6 z-100 grid w-96 max-w-[calc(100%-calc(var(--spacing)*8))] animate-toast-in grid-cols-[calc(var(--spacing)*7.5)_1fr_calc(var(--spacing)*6)] items-center gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-2xl max-sm:top-4 max-sm:right-4', error ? 'border-red-200' : 'border-emerald-100')} role={error ? 'alert' : 'status'}>
    <span className={cx('grid size-7.5 place-items-center rounded-full font-bold', error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700')}>{error ? '!' : '✓'}</span>
    <p className="text-xs leading-snug text-slate-700">{message}</p>
    <button type="button" className="text-xl text-slate-400" aria-label="Dismiss notification" onClick={onClose}>×</button>
  </div>;
}
