'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { BrandKit as BrandKitValues, CardFont } from '../lib/types';
import { contrastError } from './DesignEditor';
import { Button, cx, inputClass } from './ui';
import { errorMessage } from './CompanyDashboardParts';

const colorKeys = ['background', 'text', 'accent'] as const;
const aiTextClass = 'text-sm leading-relaxed';

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
  return <details className="mb-6 rounded-xl border border-brand-100 bg-white/50 px-4.5 py-4">
    <summary className="flex cursor-pointer items-center justify-between gap-3 [&_span]:text-2xs [&_span]:text-slate-500"><div><strong className="block text-xs">Your Brand Kit</strong><span>A familiar palette. A consistent identity.</span></div><span>Edit preferences</span></summary>
    {kit && <form onSubmit={save} className="mt-4.5">
      <div className="mb-4 grid grid-cols-3 gap-2.5 max-sm:gap-1.5">{colorKeys.map(key => <label key={key} className="min-w-0 text-2xs text-slate-500"><span className="mb-1.5 block text-2xs capitalize text-slate-500">{key}</span><div className="flex items-center gap-1.5"><input aria-label={`Brand ${key}`} type="color" className="size-7.5 flex-none border-none bg-transparent p-0" value={kit[key]} onChange={e => { setMessage(''); setKit({ ...kit, [key]: e.target.value }); }} /><code className="text-3xs text-slate-600 max-sm:text-3xs">{kit[key]}</code></div></label>)}</div>
      <label className="text-2xs text-slate-500">Preferred font<select className={cx(inputClass, 'mt-1.5 block max-w-60')} value={kit.font} onChange={e => setKit({ ...kit, font: e.target.value as CardFont })}><option value="Helvetica">Clean sans</option><option value="Times-Roman">Editorial serif</option><option value="Courier">Modern mono</option></select></label>
      <p className={cx('mb-4.5 text-slate-500', aiTextClass)}>Your uploaded company logo is included in card previews and PDFs.</p>
      {contrastError(kit) && <p className={cx('mt-3.5 text-red-700', aiTextClass)}>{contrastError(kit)}</p>}
      <Button type="submit" variant="secondary" disabled={busy || !!contrastError(kit)}>{busy ? 'Saving…' : 'Save Brand Kit'}</Button>
    </form>}
    {error && <p role="alert" className={cx('mt-3.5 text-red-700', aiTextClass)}>{error}</p>}
    {message && <p role="status" className={cx('mt-3.5 text-emerald-800', aiTextClass)}>{message}</p>}
  </details>;
}
