'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for actions that remove or revoke something. */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small "are you sure?" window. Esc or a click on the dimmed background cancels. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Yes', cancelLabel = 'Cancel', danger = false, busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-900/10 backdrop:backdrop-blur-sm"
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
      onClick={(event) => { if (event.target === ref.current && !busy) onCancel(); }}
    >
      <div className="border-b border-slate-200 px-5 py-3.5">
        <h2 id="confirm-title" className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="px-5 py-4 text-sm text-slate-600">{message}</div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-md border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {cancelLabel}
        </button>
        <Button onClick={onConfirm} disabled={busy} className={danger ? 'border-rose-600 bg-rose-600 hover:border-rose-700 hover:bg-rose-700' : undefined}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
