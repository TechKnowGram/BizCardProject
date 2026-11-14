'use client';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';
import type { CardDesign } from '@/lib/types';
import ReviewDialog from '@/components/ui/ReviewDialog';
import { buttonClass } from '@/components/ui';

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
  return <ReviewDialog title="PDF preview" eyebrow="Card PDF, 3.5 × 2 in" onClose={onClose}>
    <p className="text-sm leading-relaxed text-slate-600">This is made by the same service that creates your final cards. It is a preview only: the QR verification works once a request is approved.</p>
    {error
      ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      : url
        ? <><iframe className="mt-4 h-107.5 w-full rounded-xl border border-slate-200 bg-slate-100 max-sm:h-87.5" title="Card PDF preview" src={url} /><div className="mt-4 flex justify-end"><a className={buttonClass('secondary')} href={url} download="card-preview.pdf">Download preview PDF</a></div></>
        : <p role="status" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">Preparing the preview…</p>}
  </ReviewDialog>;
}
