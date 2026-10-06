'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export default function CompanyProfilePanel({ company, onReload, onMessage }) {
  const [values, setValues] = useState({ name: '', phone: '', address: '', website: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setValues({ name: company.name || '', phone: company.phone || '', address: company.address || '', website: company.website || '', description: company.description || '' }); }, [company]);

  const completion = useMemo(() => {
    const checks = [values.name, values.phone, values.address, values.website, values.description, company.has_logo];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [values, company.has_logo]);

  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/company/profile', { method: 'PUT', body: JSON.stringify(values) }); onMessage('Company profile updated.'); await onReload(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function uploadLogo(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('file', file); setBusy(true); setError('');
    try { await api('/company/logo', { method: 'POST', body: form }); onMessage('Company logo updated. New cards will use it.'); await onReload(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); event.target.value = ''; }
  }

  return <section className="panel profile-panel">
    <div className="panel-header"><div><span className="panel-kicker">COMPANY IDENTITY</span><h2>Company profile</h2><p>This information becomes part of your workspace and generated cards.</p></div><div className="profile-completion"><span>{completion}%</span><p>Profile complete</p></div></div>
    <div className="profile-progress"><i style={{ width: `${completion}%` }} /></div>
    <div className="profile-layout">
      <aside className="logo-uploader"><div className="logo-preview">{company.name?.charAt(0) || 'B'}</div><h3>{company.name}</h3><p>{company.has_logo ? 'Your logo is ready for new cards.' : 'Upload a square PNG, JPEG or WebP logo.'}</p><label className="btn-secondary cursor-pointer">{company.has_logo ? 'Replace company logo' : 'Upload company logo'}<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadLogo} /></label><small>Maximum file size: 2 MB</small></aside>
      <form onSubmit={save} className="profile-form"><label><span className="field-label">Company name</span><input className="input" required maxLength={150} value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /></label><label><span className="field-label">Phone</span><input className="input" maxLength={50} placeholder="+880 1700 000000" value={values.phone} onChange={event => setValues({ ...values, phone: event.target.value })} /></label><label><span className="field-label">Website</span><input className="input" type="url" placeholder="https://company.com" value={values.website} onChange={event => setValues({ ...values, website: event.target.value })} /></label><label><span className="field-label">Address</span><input className="input" maxLength={300} placeholder="Dhaka, Bangladesh" value={values.address} onChange={event => setValues({ ...values, address: event.target.value })} /></label><label className="profile-description"><span className="field-label">Company description</span><textarea className="input min-h-28" maxLength={1000} placeholder="Tell us briefly what your company does." value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} /><small>{values.description.length}/1000 characters</small></label>{error && <p className="notice-error profile-description">{error}</p>}<div className="profile-actions"><span>Changes affect future card generation.</span><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save company profile'}</button></div></form>
    </div>
  </section>;
}
