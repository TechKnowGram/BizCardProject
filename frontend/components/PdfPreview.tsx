'use client';
import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';
import type { CardDesign } from '../lib/types';
import ReviewDialog from './ReviewDialog';
import { buttonClass } from './ui';

export interface PdfPreviewProps {
  design?: CardDesign | null;
  templateId?: number;
  employeeId?: number | string | null;
  onClose: () => void;
}

export default function PdfPreview({ design, templateId, employeeId, onClose }: PdfPreviewProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch('/api/templates/preview', { method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...(design ? { design } : { template_id: templateId }), employee_id: employeeId || null }) });
        if (!response.ok) { const data = await response.json(); throw new Error(typeof data.detail === 'string' ? data.detail : 'Check the design colors and try again.'); }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch (err) { if (!(err instanceof Error) || err.name !== 'AbortError') setError(err instanceof Error ? err.message : String(err)); }
    }
    load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [design, templateId, employeeId]);
  return <ReviewDialog title="Print preview" eyebrow="ACTUAL PDF · 3.5 × 2 INCHES" onClose={onClose}><p className="mb-4.5">Rendered by the same service that creates your final cards. This preview is not issued; verification activates after approval.</p>{error ? <p role="alert">{error}</p> : url ? <><iframe className="my-4 h-107.5 w-full rounded-xl border border-brand-100 max-sm:h-87.5" title="Actual card PDF preview" src={url} /><a className={buttonClass('secondary')} href={url} download="card-preview.pdf">Download preview PDF</a></> : <p role="status">Preparing your print preview…</p>}</ReviewDialog>;
}
