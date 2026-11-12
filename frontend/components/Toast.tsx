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
  return <div className={cx('fixed top-5.5 right-6 z-100 grid w-96 max-w-[calc(100%-calc(var(--spacing)*8))] animate-toast-in grid-cols-[calc(var(--spacing)*7.5)_1fr_calc(var(--spacing)*6)] items-center gap-2.5 rounded-[28px] border bg-white px-3.5 py-3 shadow-2xl max-sm:top-4 max-sm:right-4', error ? 'border-[#f2d5d7]' : 'border-[#dbe8e1]')} role={error ? 'alert' : 'status'}>
    <span className={cx('grid size-7.5 place-items-center rounded-full font-black', error ? 'bg-[#fff0f1] text-[#bb3f49]' : 'bg-[#e8f8f0] text-[#21805b]')}>{error ? '!' : '✓'}</span>
    <p className="text-xs leading-snug text-[#484151]">{message}</p>
    <button type="button" className="text-xl text-[#9b94a2]" aria-label="Dismiss notification" onClick={onClose}>×</button>
  </div>;
}
