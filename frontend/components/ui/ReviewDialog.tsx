'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button, Eyebrow } from '@/components/ui';

export interface ReviewDialogProps {
  title: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  eyebrow?: string;
}

export default function ReviewDialog({ title, children, onClose, busy = false, eyebrow = 'Details' }: ReviewDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="m-auto max-h-dvh w-[calc(100%-var(--spacing)*8)] max-w-205 rounded-xl border-0 p-0 shadow-2xl backdrop:bg-navy-900/40 backdrop:backdrop-blur-xs" aria-labelledby="review-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><Eyebrow>{eyebrow}</Eyebrow><h2 id="review-title" className="mt-1 text-xl font-semibold text-navy-900">{title}</h2></div><Button variant="quiet" className="px-2" disabled={busy} onClick={onClose} aria-label="Close review"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg></Button></div>
    <div className="p-6">{children}</div>
  </dialog>;
}
