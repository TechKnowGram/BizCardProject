'use client';
import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';
import ReviewDialog from './ReviewDialog';

export default function PdfPreview({ design, templateId, employeeId, onClose }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    async function load() {
      try {
        const response = await fetch('/api/templates/preview', { method: 'POST', signal: controller.signal,
          headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...(design ? { design } : { template_id: templateId }), employee_id: employeeId || null }) });
        if (!response.ok) { const data = await response.json(); throw new Error(typeof data.detail === 'string' ? data.detail : 'Check the design colors and try again.'); }
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch (err) { if (err.name !== 'AbortError') setError(err.message); }
    }
    load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [design, templateId, employeeId]);
  return <ReviewDialog title="Print preview" eyebrow="ACTUAL PDF · 3.5 × 2 INCHES" onClose={onClose}><p className="ai-note">Rendered by the same service that creates your final cards. This preview is not issued; verification activates after approval.</p>{error ? <p role="alert" className="ai-error">{error}</p> : url ? <><iframe className="pdf-preview-frame" title="Actual card PDF preview" src={url} /><a className="btn-secondary" href={url} download="card-preview.pdf">Download preview PDF</a></> : <p role="status">Preparing your print preview…</p>}</ReviewDialog>;
}
