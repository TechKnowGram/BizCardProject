'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function CompanyProfilePanel({ company, onReload, onMessage }) {
  const [values, setValues] = useState({ name: '', phone: '', address: '', website: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setValues({ name: company.name || '', phone: company.phone || '', address: company.address || '', website: company.website || '', description: company.description || '' }); }, [company]);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/company/profile', { method: 'PUT', body: JSON.stringify(values) }); onMessage('Company profile updated.'); await onReload(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  async function uploadLogo(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('file', file); setBusy(true); setError('');
    try { await api('/company/logo', { method: 'POST', body: form }); onMessage('Company logo updated. New cards will use it.'); await onReload(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); event.target.value = ''; }
  }
  return <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Company profile</h2><p className="mt-1 text-xs text-slate-500">This information becomes part of your company identity and generated cards.</p></div><label className="btn-secondary cursor-pointer">{company.has_logo ? 'Replace logo' : 'Upload logo'}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} /></label></div><form onSubmit={save} className="grid gap-5 p-6 md:grid-cols-2"><label><span className="field-label">Company name</span><input className="input" required maxLength={150} value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /></label><label><span className="field-label">Phone</span><input className="input" maxLength={50} placeholder="+880 1700 000000" value={values.phone} onChange={event => setValues({ ...values, phone: event.target.value })} /></label><label><span className="field-label">Website</span><input className="input" type="url" placeholder="https://company.com" value={values.website} onChange={event => setValues({ ...values, website: event.target.value })} /></label><label><span className="field-label">Address</span><input className="input" maxLength={300} placeholder="Dhaka, Bangladesh" value={values.address} onChange={event => setValues({ ...values, address: event.target.value })} /></label><label className="md:col-span-2"><span className="field-label">Company description</span><textarea className="input min-h-28" maxLength={1000} placeholder="A short description of what your company does." value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} /></label>{error && <p className="notice-error md:col-span-2">{error}</p>}<div className="flex items-center justify-between md:col-span-2"><span className="text-xs text-slate-400">Logo: {company.has_logo ? 'Ready for generated cards' : 'Not uploaded'}</span><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save company profile'}</button></div></form></section>;
}
