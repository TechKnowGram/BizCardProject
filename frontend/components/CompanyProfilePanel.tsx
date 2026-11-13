'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '../lib/api';
import type { Company } from '../lib/types';
import ProtectedImage from './ProtectedImage';
import StatusBadge from './StatusBadge';
import { Button, Input, Notice, buttonClass, cx, inputClass } from './ui';
import { PageHeader, SectionCard } from './dashboard/Surface';
import { ProgressLine, errorMessage, fieldLabelClass, hintClass } from './CompanyDashboardParts';

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
  // Bumped after an upload so the logo preview fetches the new image.
  const [logoVersion, setLogoVersion] = useState(0);

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
    try { await api('/company/logo', { method: 'POST', body: form }); onMessage('Company logo updated. New cards will use it.'); await onReload(); setLogoVersion(v => v + 1); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); input.value = ''; }
  }

  const set = (key: keyof ProfileValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value });

  return (
    <div className="space-y-6">
      <PageHeader title="Company profile" description="Your company details and logo. They are used on your team's cards." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SectionCard title="Logo" className="lg:sticky lg:top-6">
          <div className="grid aspect-square w-full max-w-40 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {company.has_logo ? (
              <ProtectedImage key={logoVersion} path="/company/logo" alt={`${company.name} logo`} className="size-full object-contain p-3" />
            ) : (
              <span className="text-4xl font-bold text-slate-400" aria-hidden="true">{company.name?.charAt(0).toUpperCase() || 'B'}</span>
            )}
          </div>
          <p className="mt-4 text-base font-semibold text-navy-900">{company.name}</p>
          <div className="mt-1.5"><StatusBadge value={company.status} /></div>
          <label className={buttonClass('secondary', 'mt-5 w-full cursor-pointer')}>
            {busy ? 'Uploading…' : company.has_logo ? 'Replace logo' : 'Upload logo'}
            <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={uploadLogo} />
          </label>
          <p className={hintClass}>PNG, JPEG or WebP, up to 2 MB. A square image works best.</p>
          <ProgressLine className="mt-5 border-t border-slate-100 pt-5" value={completion} label={`Profile ${completion}% complete`} />
        </SectionCard>

        <form onSubmit={save}>
          <SectionCard bodyClassName="p-0">
            <div className="space-y-8 px-6 py-6">
              <fieldset>
                <legend className="text-base font-semibold text-navy-900">Company details</legend>
                <p className="mt-1 text-sm text-slate-500">Shown on cards and in your workspace.</p>
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <label><span className={fieldLabelClass}>Company name</span><Input required maxLength={150} value={values.name} onChange={set('name')} /></label>
                  <label><span className={fieldLabelClass}>Website</span><Input type="url" placeholder="https://company.com" value={values.website} onChange={set('website')} /></label>
                  <label><span className={fieldLabelClass}>Phone</span><Input maxLength={50} placeholder="+880 1700 000000" value={values.phone} onChange={set('phone')} /></label>
                  <label><span className={fieldLabelClass}>Address</span><Input maxLength={300} placeholder="Dhaka, Bangladesh" value={values.address} onChange={set('address')} /></label>
                </div>
              </fieldset>

              <fieldset className="border-t border-slate-100 pt-8">
                <legend className="sr-only">About</legend>
                <h3 className="text-base font-semibold text-navy-900">About</h3>
                <p className="mt-1 text-sm text-slate-500">A short description of what your company does.</p>
                <label className="mt-5 block">
                  <span className="sr-only">Company description</span>
                  <textarea className={cx(inputClass, 'min-h-32 resize-y')} maxLength={1000} placeholder="Tell us briefly what your company does." value={values.description} onChange={set('description')} />
                </label>
                <p className="mt-1.5 text-right text-xs text-slate-500 tabular-nums">{values.description.length} / 1000 characters</p>
              </fieldset>

              {error && <Notice tone="error">{error}</Notice>}
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-b-2xl border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-500">Changes apply to cards generated from now on.</span>
              <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </SectionCard>
        </form>
      </div>
    </div>
  );
}
