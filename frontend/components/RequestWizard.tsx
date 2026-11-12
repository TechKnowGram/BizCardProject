'use client';

import { useState } from 'react';
import ReviewDialog from './ReviewDialog';
import CardPreview from './CardPreview';
import Icon from './Icon';
import { api } from '../lib/api';
import type { CardRequest, CompanySummary, Employee, Template } from '../lib/types';
import { Button, Input, Notice, buttonClass, cx } from './ui';

export interface RequestWizardProps {
  company: CompanySummary;
  employees: Employee[];
  templates: Template[];
  initialIds?: number[];
  onClose: () => void;
  onComplete: (request: CardRequest) => void;
}

const stepParagraph = 'mb-5.5 mt-2 text-xs leading-relaxed text-[#7c8a90]';
const stepHeading = 'text-xl font-extrabold tracking-tighter';

export default function RequestWizard({ company, employees, templates, initialIds = [], onClose, onComplete }: RequestWizardProps) {
  const [step, setStep] = useState(1);
  const [ids, setIds] = useState<number[]>(initialIds);
  const [templateId, setTemplateId] = useState<number | undefined>(company.selected_template_id || templates[0]?.id);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CardRequest | null>(null);
  const active = employees.filter(item => item.is_active);
  const selected = active.filter(item => ids.includes(item.id));
  const template = templates.find(item => item.id === templateId);
  async function submit() {
    if (busy || !selected.length || !template) return;
    setBusy(true); setError('');
    try {
      if (templateId !== company.selected_template_id) await api(`/templates/${templateId}/select`, { method: 'POST' });
      const result = await api<CardRequest>('/card-requests', { method: 'POST', body: JSON.stringify({ employee_ids: selected.map(item => item.id), template_id: templateId }) });
      setCreated(result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  }
  const summary: Array<[string, string | undefined]> = [['Company', company.name], ['Employees', `${selected.length} cards`], ['Design', template?.name], ['Verification', 'Unique QR per card']];
  return <ReviewDialog title={created ? 'Your next impression is on its way.' : 'Create a card request'} eyebrow="GUIDED CARD REQUEST" onClose={onClose} busy={busy}>
    {created ? <div className="flex flex-col items-center px-3.75 py-7.5 text-center"><span className="grid size-18.75 place-items-center rounded-[40px] bg-[#e3f8ef] text-[#23986d] ring-10 ring-[#f0fbf6] animate-[toastIn_.5s_ease] motion-reduce:animate-none"><Icon name="check" size={32} /></span><h3 className="mt-7.5 text-2xl font-extrabold">Request #{created.id} submitted</h3><p className="my-3 text-xs text-[#7c8a90]">{selected.length} employee cards are now awaiting administrator review.</p><div className="mb-7 mt-5 grid w-full gap-3 rounded-[28px] border border-[#eae2f1] p-5 text-left"><span className="flex justify-between text-xs text-[#7c8a90]">Template <b className="text-[#51435f]">{template?.name}</b></span><span className="flex justify-between text-xs text-[#7c8a90]">Next step <b className="text-[#51435f]">System Admin approval</b></span></div><button className={buttonClass('primary')} onClick={() => onComplete(created)}>View my requests <Icon name="arrow" /></button></div> : <>
      <ol className="flex list-none justify-between gap-2.5 border-b border-[#e3e8e6] pb-6">{['Choose people', 'Review design', 'Confirm request'].map((label, index) => <li key={label} className={cx('flex items-center gap-2 text-2xs font-bold max-sm:flex-col max-sm:text-center max-sm:text-3xs', step >= index + 1 ? 'text-[#4a1ff2]' : 'text-[#a298b1]')}><span className={cx('grid size-6.75 place-items-center rounded-full border', step >= index + 1 ? 'border-[#4a1ff2] bg-[#4a1ff2] text-white' : 'border-[#ded5e8]')}>{step > index + 1 ? <Icon name="check" size={14} /> : index + 1}</span>{label}</li>)}</ol>
      {step === 1 && <div className="py-6.5"><h3 className={stepHeading}>Who needs a new card?</h3><p className={stepParagraph}>Only active employees can be included.</p><Input aria-label="Find employees" placeholder="Search your team…" value={search} onChange={event => setSearch(event.target.value)} /><div className="mt-4 grid max-h-75 gap-1.5 overflow-auto">{active.filter(item => `${item.name} ${item.employee_id}`.toLowerCase().includes(search.toLowerCase())).map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#eee7f5] p-3 has-[:checked]:border-[#aa89df] has-[:checked]:bg-[#f8f3ff]"><input className="accent-[#4a1ff2]" type="checkbox" checked={ids.includes(item.id)} onChange={() => setIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} /><span className="grid size-8.25 place-items-center rounded-xl bg-[#eee5fb] text-xs text-[#7143b5]">{item.name.charAt(0)}</span><div><strong className="block text-xs">{item.name}</strong><small className="mt-1 block text-3xs text-[#9b8caa]">{item.designation} · {item.employee_id}</small></div></label>)}</div>{!active.length && <p className={stepParagraph}>Add an active employee to get started.</p>}</div>}
      {step === 2 && <div className="py-6.5"><h3 className={stepHeading}>Choose the company signature</h3><p className={stepParagraph}>Choosing a new style also updates your company’s selected template.</p><div className="mb-6.25 flex gap-2.5">{templates.map(item => <button className={cx('rounded-xl border px-4.5 py-2.5 text-xs', item.id === templateId ? 'border-[#4a1ff2] bg-[#4a1ff2] text-white' : 'border-[#ddd2e8]')} aria-pressed={item.id === templateId} onClick={() => setTemplateId(item.id)} key={item.id}>{item.name}</button>)}</div>{template && <CardPreview className={template.design ? undefined : 'm-auto max-w-105 min-h-56.25!'} design={template.design} style={template.style_key} company={company.name} name={selected[0]?.name} designation={selected[0]?.designation} email={selected[0]?.email} phone={selected[0]?.phone} logoPath={company.has_logo ? '/company/logo' : null} photoPath={selected[0]?.has_photo ? `/employees/${selected[0].id}/photo` : null} />}</div>}
      {step === 3 && <div className="py-6.5"><h3 className={stepHeading}>Ready for review</h3><p className={stepParagraph}>Check the details before submitting. PDFs are generated after approval.</p><dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-[#e3e8e6] bg-[#e3e8e6] max-sm:grid-cols-1">{summary.map(([term, value]) => <div key={term} className="bg-[#f6f8f7] p-4.5"><dt className="text-3xs text-[#a194ad]">{term}</dt><dd className="mt-1.75 text-sm font-[750]">{value}</dd></div>)}</dl><div className="mt-4.5 flex flex-wrap gap-1.75">{selected.map(item => <span className="rounded-lg bg-[#e9e5fb] px-2.5 py-1.75 text-2xs text-[#7b6196]" key={item.id}>{item.name}</span>)}</div></div>}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#e3e8e6] pt-5.5 max-sm:flex-col max-sm:items-stretch"><span className="text-2xs text-[#7c8a90]">{selected.length} employees selected</span><div className="flex gap-2.25 max-sm:justify-end">{step > 1 && <Button variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>Back</Button>}{step < 3 ? <button className={buttonClass('primary')} disabled={!selected.length || (step === 2 && !template)} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow" /></button> : <button className={buttonClass('primary')} disabled={busy || !selected.length || !template} onClick={submit}>{busy ? 'Submitting…' : 'Submit for approval'} <Icon name="arrow" /></button>}</div></div>
    </>}
  </ReviewDialog>;
}
