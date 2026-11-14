'use client';

import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { cx } from '@/components/ui';

/** True when a template was made from an Illustrator file, so its cards can be downloaded as .ai. */
export function templateHasAi(template?: { design?: unknown } | null): boolean {
  const design = template?.design as { ai?: unknown } | null | undefined;
  return Boolean(design && typeof design === 'object' && design.ai);
}

export interface AiDownloadButtonProps {
  label: string;
  path: string;
  fileName: string;
  /** Does the download (for example `downloadOrReport` with the page's error handler). */
  onDownload: (path: string, fileName: string) => void | Promise<void>;
  className?: string;
}

/** Small button that downloads one Illustrator (.ai) card, or a zip of them. */
export default function AiDownloadButton({ label, path, fileName, onDownload, className }: AiDownloadButtonProps) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onDownload(path, fileName);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      title={label}
      className={cx('inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-brand-600/40 hover:bg-brand-600/5 hover:text-brand-600 disabled:opacity-60', className)}
    >
      <Icon name="download" size={14} />
      {busy ? 'Preparing…' : label}
    </button>
  );
}
