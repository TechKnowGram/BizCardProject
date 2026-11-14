'use client';

import { useState } from 'react';
import ProtectedImage from '@/components/ui/ProtectedImage';
import ReviewDialog from '@/components/ui/ReviewDialog';
import ArtboardLayers from '@/components/company/ArtboardLayers';
import { Button, cx } from '@/components/ui';
import type { Artboard, ArtboardList } from '@/lib/types';

type Role = 'front' | 'back';

export interface ArtboardPickerProps {
  upload: ArtboardList;
  companyId: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  /** The chosen artboards. `back` is null when the card has one side. */
  onConfirm: (front: number, back: number | null) => void;
}

/**
 * Popup shown after an Illustrator file is read: every artboard drawn as a preview, and a
 * choice of which one is the front and which (if any) is the back of the card.
 */
export default function ArtboardPicker({ upload, companyId, busy, error, onClose, onConfirm }: ArtboardPickerProps) {
  const cardSized = upload.artboards.filter((board) => board.card_like).map((board) => board.index);
  // Start with the obvious answer: the first card-sized artboard is the front, the second the back.
  const [front, setFront] = useState<number | null>(cardSized[0] ?? upload.artboards[0]?.index ?? null);
  const [back, setBack] = useState<number | null>(cardSized[1] ?? null);
  const [layersFor, setLayersFor] = useState<Artboard | null>(null);

  function choose(index: number, role: Role) {
    if (role === 'front') {
      setFront(index);
      if (back === index) setBack(null);
    } else {
      setBack(back === index ? null : index);
      if (front === index) setFront(null);
    }
  }

  return (
    <ReviewDialog title="Choose the front and back of your card" eyebrow="Illustrator file" onClose={onClose} busy={busy}>
      <p className="text-sm text-slate-600">
        <span className="font-medium text-navy-900">{upload.file_name}</span> has {upload.artboards.length} {upload.artboards.length === 1 ? 'artboard' : 'artboards'}.
        Pick the one that is the front. If the card has a back, pick that too; otherwise leave it empty.
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2" aria-label="Artboards">
        {upload.artboards.map((board) => {
          const role: Role | null = front === board.index ? 'front' : back === board.index ? 'back' : null;
          return (
            <li key={board.index} className={cx('rounded-xl border bg-white p-3 transition-colors', role === 'front' ? 'border-brand-600 ring-1 ring-brand-600' : role === 'back' ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200')}>
              <div className="mx-auto grid max-h-72 w-full place-items-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50" style={{ aspectRatio: `${board.width_mm} / ${board.height_mm}` }}>
                <ProtectedImage path={`/templates/image/assets/${companyId}/${board.preview}`} alt={`${board.name} preview`} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{board.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">{board.width_mm} × {board.height_mm} mm</p>
                </div>
                {board.card_like
                  ? <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">Card size</span>
                  : <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 ring-inset">Other size</span>}
              </div>
              <button type="button" onClick={() => setLayersFor(board)} disabled={busy} className="mt-2.5 w-full rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50">
                View layers: images, text and shapes
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={`Use ${board.name} as`}>
                {(['front', 'back'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={role === value}
                    disabled={busy}
                    onClick={() => choose(board.index, value)}
                    className={cx(
                      'rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors disabled:opacity-50',
                      role === value
                        ? value === 'front' ? 'border-brand-600 bg-brand-600 text-white' : 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="text-xs text-slate-500">
          {front === null ? 'Choose the front to continue.' : back === null ? 'Front only. Cards will be printed on one side.' : 'Front and back chosen.'}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="quiet" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button disabled={busy || front === null} onClick={() => front !== null && onConfirm(front, back)}>
            {busy ? 'Reading the design…' : 'Use these artboards'}
          </Button>
        </div>
      </div>
      {layersFor && <ArtboardLayers uploadId={upload.upload_id} companyId={companyId} artboard={layersFor} onClose={() => setLayersFor(null)} />}
    </ReviewDialog>
  );
}
