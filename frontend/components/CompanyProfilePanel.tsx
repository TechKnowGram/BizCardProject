'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../lib/api';
import type { Company } from '../lib/types';
import { Button, Input, Notice, Panel, PanelHeader, buttonClass, cx, inputClass } from './ui';
import { PanelTitle, errorMessage, fieldLabelClass } from './CompanyDashboardParts';

interface ProfileValues { name: string; phone: string; address: string; website: string; description: string }

export interface CompanyProfilePanelProps {
  company: Company;
  onReload: () => void | Promise<void>;
  onMessage: (message: string) => void;
}

export default function CompanyProfilePanel({ company, onReload, onMessage }: CompanyProfilePanelProps) {
  const [values, setValues] = useState<ProfileValues>({ name: '', phone: '', address: '', website: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setValues({ name: company.name || '', phone: company.phone || '', address: company.address || '', website: company.website || '', description: company.description || '' }); }, [company]);

  const completion = useMemo(() => {
    const checks = [values.name, values.phone, values.address, values.website, values.description, company.has_logo];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [values, company.has_logo]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/company/profile', { method: 'PUT', body: JSON.stringify(values) }); onMessage('Company profile updated.'); await onReload(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('file', file); setBusy(true); setError('');
    try { await api('/company/logo', { method: 'POST', body: form }); onMessage('Company logo updated. New cards will use it.'); await onReload(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); input.value = ''; }
  }

  const wide = 'col-span-full max-md:col-auto';

  return <Panel>
    <PanelHeader className="max-sm:p-4.5"><PanelTitle kicker="COMPANY IDENTITY" title="Company profile" copy="This information becomes part of your workspace and generated cards." /><div className="text-right"><span className="text-2xl font-black text-[#6732c3]">{completion}%</span><p className="mt-0.5 text-3xs text-[#928b98]">Profile complete</p></div></PanelHeader>
    <div className="h-1.5 bg-[#eee9f2]"><i className="block h-full bg-[linear-gradient(#4dffc8,#4dffc8)] transition-[width] duration-300" style={{ width: `${completion}%` }} /></div>
    <div className="grid min-h-107.5 grid-cols-[calc(var(--spacing)*62.5)_1fr] max-md:grid-cols-1">
      <aside className="flex flex-col items-center border-r border-[#e3e8e6] bg-[#fcfafd] px-6 py-9 text-center max-md:border-r-0 max-md:border-b"><div className="grid size-22.5 -rotate-4 place-items-center rounded-[40px] bg-[linear-gradient(#4a1ff2,#4a1ff2)] text-4xl font-black text-white shadow-lg">{company.name?.charAt(0) || 'B'}</div><h3 className="mt-5.5 text-base font-extrabold">{company.name}</h3><p className="mt-2 mb-5 text-2xs leading-relaxed text-[#8d8695]">{company.has_logo ? 'Your logo is ready for new cards.' : 'Upload a square PNG, JPEG or WebP logo.'}</p><label className={buttonClass('secondary', 'cursor-pointer')}>{company.has_logo ? 'Replace company logo' : 'Upload company logo'}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} /></label><small className="mt-2.5 text-3xs text-[#7c8a90]">Maximum file size: 2 MB</small></aside>
      <form onSubmit={save} className="grid grid-cols-2 content-start gap-5 p-7.5 max-md:grid-cols-1 max-md:p-5.5"><label><span className={fieldLabelClass}>Company name</span><Input required maxLength={150} value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /></label><label><span className={fieldLabelClass}>Phone</span><Input maxLength={50} placeholder="+880 1700 000000" value={values.phone} onChange={event => setValues({ ...values, phone: event.target.value })} /></label><label><span className={fieldLabelClass}>Website</span><Input type="url" placeholder="https://company.com" value={values.website} onChange={event => setValues({ ...values, website: event.target.value })} /></label><label><span className={fieldLabelClass}>Address</span><Input maxLength={300} placeholder="Dhaka, Bangladesh" value={values.address} onChange={event => setValues({ ...values, address: event.target.value })} /></label><label className={cx('relative', wide)}><span className={fieldLabelClass}>Company description</span><textarea className={cx(inputClass, 'min-h-28')} maxLength={1000} placeholder="Tell us briefly what your company does." value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} /><small className="absolute top-0 right-0 text-3xs text-[#7c8a90]">{values.description.length}/1000 characters</small></label>{error && <Notice tone="error" className={wide}>{error}</Notice>}<div className={cx('flex items-center justify-between gap-4 border-t border-[#e3e8e6] pt-5 max-md:flex-col max-md:items-stretch', wide)}><span className="text-3xs text-[#7c8a90]">Changes affect future card generation.</span><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save company profile'}</Button></div></form>
    </div>
  </Panel>;
}
