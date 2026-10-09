'use client';
import { useEffect, useRef } from 'react';

export default function ReviewDialog({ title, children, onClose, busy = false, eyebrow = 'DETAILS & ACTIVITY' }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="review-dialog" aria-labelledby="review-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6"><div><p className="eyebrow">{eyebrow}</p><h2 id="review-title" className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2></div><button className="btn-quiet" disabled={busy} onClick={onClose} aria-label="Close review">✕</button></div>
    <div className="p-6">{children}</div>
  </dialog>;
}
