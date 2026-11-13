'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { BrandKit as BrandKitValues, CardFont } from '../lib/types';
import { contrastError } from './DesignEditor';
import { Button, cx, inputClass } from './ui';
import { ColorField, studioLabelClass } from './StudioParts';
import { errorMessage } from './CompanyDashboardParts';

const colorKeys = ['background', 'text', 'accent'] as const;
const aiTextClass = 'text-sm leading-relaxed';
const chevron = <svg viewBox="0 0 20 20" className="size-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>;

export default function BrandKit() {
  const [kit, setKit] = useState<BrandKitValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { let active = true; api<BrandKitValues>('/templates/brand-kit').then(result => { if (active) setKit(result); }).catch(err => { if (active) setError(errorMessage(err)); }); return () => { active = false; }; }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await api('/templates/brand-kit', { method: 'PUT', body: JSON.stringify(kit) }); setMessage('Brand preferences saved. Your next AI design will use them.'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <details className="group rounded-xl border border-slate-200 bg-white">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
      <span><span className="block text-sm font-semibold text-navy-900">Brand kit</span><span className="block text-sm text-slate-500">Colours and font used as a starting point for new designs.</span></span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-600">Edit {chevron}</span>
    </summary>
    {kit && <form onSubmit={save} className="border-t border-slate-100 px-4 py-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{colorKeys.map(key => <ColorField key={key} label={key} value={kit[key]} onChange={value => { setMessage(''); setKit({ ...kit, [key]: value }); }} />)}</div>
      <label className="mt-4 block max-w-60"><span className={studioLabelClass}>Font</span><select className={inputClass} value={kit.font} onChange={e => setKit({ ...kit, font: e.target.value as CardFont })}><option value="Helvetica">Clean sans</option><option value="Times-Roman">Editorial serif</option><option value="Courier">Modern mono</option></select></label>
      <p className={cx('mt-4 text-slate-500', aiTextClass)}>Your uploaded company logo is included in card previews and PDFs.</p>
      {contrastError(kit) && <p className={cx('mt-3 text-red-700', aiTextClass)}>{contrastError(kit)}</p>}
      <Button type="submit" variant="secondary" className="mt-4" disabled={busy || !!contrastError(kit)}>{busy ? 'Saving…' : 'Save brand kit'}</Button>
    </form>}
    {error && <p role="alert" className={cx('px-4 pb-4 text-red-700', aiTextClass)}>{error}</p>}
    {message && <p role="status" className={cx('px-4 pb-4 text-emerald-800', aiTextClass)}>{message}</p>}
  </details>;
}
