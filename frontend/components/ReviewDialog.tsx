'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button, Eyebrow } from './ui';

export interface ReviewDialogProps {
  title: ReactNode;
  children?: ReactNode;
  onClose: () => void;
  busy?: boolean;
  eyebrow?: string;
}

export default function ReviewDialog({ title, children, onClose, busy = false, eyebrow = 'DETAILS & ACTIVITY' }: ReviewDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="m-auto max-h-dvh w-[calc(100%-var(--spacing)*8)] max-w-205 rounded-[28px] border-0 p-0 shadow-2xl backdrop:bg-[#161b3866] backdrop:backdrop-blur-xs" aria-labelledby="review-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><Eyebrow>{eyebrow}</Eyebrow><h2 id="review-title" className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2></div><Button variant="quiet" disabled={busy} onClick={onClose} aria-label="Close review">✕</Button></div>
    <div className="p-6">{children}</div>
  </dialog>;
}
