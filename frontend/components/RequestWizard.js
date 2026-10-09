'use client';

import { useState } from 'react';
import ReviewDialog from './ReviewDialog';
import CardPreview from './CardPreview';
import Icon from './Icon';
import { api } from '../lib/api';

export default function RequestWizard({ company, employees, templates, initialIds = [], onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [ids, setIds] = useState(initialIds);
  const [templateId, setTemplateId] = useState(company.selected_template_id || templates[0]?.id);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const active = employees.filter(item => item.is_active);
  const selected = active.filter(item => ids.includes(item.id));
  const template = templates.find(item => item.id === templateId);
  async function submit() {
    if (busy || !selected.length || !template) return;
    setBusy(true); setError('');
    try {
      if (templateId !== company.selected_template_id) await api(`/templates/${templateId}/select`, { method: 'POST' });
      const result = await api('/card-requests', { method: 'POST', body: JSON.stringify({ employee_ids: selected.map(item => item.id), template_id: templateId }) });
      setCreated(result);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <ReviewDialog title={created ? 'Your next impression is on its way.' : 'Create a card request'} eyebrow="GUIDED CARD REQUEST" onClose={onClose} busy={busy}>
    {created ? <div className="wizard-success"><span><Icon name="check" size={32} /></span><h3>Request #{created.id} submitted</h3><p>{selected.length} employee cards are now awaiting administrator review.</p><div className="wizard-receipt"><span>Template <b>{template.name}</b></span><span>Next step <b>System Admin approval</b></span></div><button className="btn-primary" onClick={() => onComplete(created)}>View my requests <Icon name="arrow" /></button></div> : <>
      <ol className="wizard-steps">{['Choose people', 'Review design', 'Confirm request'].map((label, index) => <li key={label} className={step >= index + 1 ? 'active' : ''}><span>{step > index + 1 ? <Icon name="check" size={14} /> : index + 1}</span>{label}</li>)}</ol>
      {step === 1 && <div className="wizard-content"><h3>Who needs a new card?</h3><p>Only active employees can be included.</p><input className="input" aria-label="Find employees" placeholder="Search your team…" value={search} onChange={event => setSearch(event.target.value)} /><div className="wizard-people">{active.filter(item => `${item.name} ${item.employee_id}`.toLowerCase().includes(search.toLowerCase())).map(item => <label key={item.id}><input type="checkbox" checked={ids.includes(item.id)} onChange={() => setIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} /><span>{item.name.charAt(0)}</span><div><strong>{item.name}</strong><small>{item.designation} · {item.employee_id}</small></div></label>)}</div>{!active.length && <p>Add an active employee to get started.</p>}</div>}
      {step === 2 && <div className="wizard-content"><h3>Choose the company signature</h3><p>Choosing a new style also updates your company’s selected template.</p><div className="wizard-template-options">{templates.map(item => <button className={item.id === templateId ? 'active' : ''} aria-pressed={item.id === templateId} onClick={() => setTemplateId(item.id)} key={item.id}>{item.name}</button>)}</div>{template && <CardPreview design={template.design} style={template.style_key} company={company.name} name={selected[0]?.name} designation={selected[0]?.designation} email={selected[0]?.email} phone={selected[0]?.phone} logoPath={company.has_logo ? '/company/logo' : null} photoPath={selected[0]?.has_photo ? `/employees/${selected[0].id}/photo` : null} />}</div>}
      {step === 3 && <div className="wizard-content"><h3>Ready for review</h3><p>Check the details before submitting. PDFs are generated after approval.</p><dl className="wizard-summary"><div><dt>Company</dt><dd>{company.name}</dd></div><div><dt>Employees</dt><dd>{selected.length} cards</dd></div><div><dt>Design</dt><dd>{template?.name}</dd></div><div><dt>Verification</dt><dd>Unique QR per card</dd></div></dl><div className="wizard-selected">{selected.map(item => <span key={item.id}>{item.name}</span>)}</div></div>}
      {error && <p role="alert" className="notice-error">{error}</p>}
      <div className="wizard-actions"><span>{selected.length} employees selected</span><div>{step > 1 && <button className="btn-secondary" disabled={busy} onClick={() => setStep(step - 1)}>Back</button>}{step < 3 ? <button className="btn-primary" disabled={!selected.length || (step === 2 && !template)} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow" /></button> : <button className="btn-primary" disabled={busy || !selected.length || !template} onClick={submit}>{busy ? 'Submitting…' : 'Submit for approval'} <Icon name="arrow" /></button>}</div></div>
    </>}
  </ReviewDialog>;
}
