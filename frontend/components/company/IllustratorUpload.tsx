'use client';

import { useState } from 'react';
import ArtboardPicker from '@/components/company/ArtboardPicker';
import { cx } from '@/components/ui';
import Icon from '@/components/ui/Icon';
import { api } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type { ArtboardList, IllustratorAnalysis } from '@/lib/types';

const MAX_AI_BYTES = 50_000_000;

export interface IllustratorUploadProps {
  companyId: number;
  /** Called with what the server read from the chosen front (and back) artboards. */
  onAnalysed: (result: IllustratorAnalysis, fileName: string) => void;
  /** Called with a message when the file cannot be used. */
  onError?: (message: string) => void;
  className?: string;
  label?: string;
}

/**
 * "Upload .ai file" button plus the popup that follows it: the file is sent to the server,
 * which finds the artboards; the popup lets you choose the front and the back, and the
 * server then reads those two. Used in the page header and in the upload form.
 */
export default function IllustratorUpload({ companyId, onAnalysed, onError, className, label = 'Upload .ai file' }: IllustratorUploadProps) {
  const [upload, setUpload] = useState<ArtboardList | null>(null);
  const [busy, setBusy] = useState<'read' | 'analyze' | null>(null);
  const [error, setError] = useState('');

  async function read(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.ai')) { onError?.('Choose an Adobe Illustrator file (.ai).'); return; }
    if (file.size > MAX_AI_BYTES) { onError?.('That file is larger than 50 MB. Remove unused artwork and try again.'); return; }
    setBusy('read'); setError(''); onError?.('');
    try {
      const form = new FormData();
      form.append('file', file);
      setUpload(await api<ArtboardList>('/templates/illustrator/artboards', { method: 'POST', body: form }));
    } catch (e) {
      onError?.((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  async function analyse(front: number, back: number | null) {
    if (!upload) return;
    setBusy('analyze'); setError('');
    try {
      const result = await api<IllustratorAnalysis>('/templates/illustrator/analyze', {
        method: 'POST',
        body: JSON.stringify({ upload_id: upload.upload_id, front, back }),
      });
      onAnalysed(result, upload.file_name);
      setUpload(null);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <label className={cx('inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:border-brand-700 hover:bg-brand-700 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600', busy === 'read' && 'pointer-events-none opacity-60', className)}>
        <Icon name="upload" size={16} />
        {busy === 'read' ? 'Reading the file…' : label}
        <input type="file" accept=".ai,application/postscript,application/illustrator" className="sr-only" disabled={busy !== null} onChange={(event) => { void read(event.target.files?.[0]); event.target.value = ''; }} />
      </label>
      {upload && (
        <ArtboardPicker
          upload={upload}
          companyId={companyId}
          busy={busy === 'analyze'}
          error={error}
          onClose={() => { if (busy !== 'analyze') { setUpload(null); setError(''); } }}
          onConfirm={analyse}
        />
      )}
    </>
  );
}
