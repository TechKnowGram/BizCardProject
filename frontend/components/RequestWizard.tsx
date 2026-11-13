'use client';

import { useState } from 'react';
import ReviewDialog from './ReviewDialog';
import CardPreview from './CardPreview';
import Icon from './Icon';
import { api } from '../lib/api';
import type { CardRequest, CompanySummary, Employee, Template } from '../lib/types';
import { Button, Input, Notice, cx } from './ui';
import { StepIndicator, checkboxClass } from './CompanyDashboardParts';

export interface RequestWizardProps {
  company: CompanySummary;
  employees: Employee[];
  templates: Template[];
  initialIds?: number[];
  onClose: () => void;
  onComplete: (request: CardRequest) => void;
}

const stepParagraph = 'mt-1 mb-5 text-sm leading-relaxed text-slate-500';
const stepHeading = 'text-lg font-semibold text-navy-900';

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
  const summary: Array<[string, string | undefined]> = [['Company', company.name], ['Cards', `${selected.length} card${selected.length === 1 ? '' : 's'}`], ['Design', template?.name], ['Verification', 'Unique QR code per card']];
  const term = search.toLowerCase();
  return <ReviewDialog title={created ? `Request #${created.id} submitted` : 'New card request'} eyebrow="Card request" onClose={onClose} busy={busy}>
    {created ? <div className="flex flex-col items-center py-6 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><Icon name="check" size={24} /></span>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">{selected.length} employee card{selected.length === 1 ? ' is' : 's are'} now waiting for review by the platform team.</p>
      <dl className="mt-6 w-full divide-y divide-slate-100 rounded-xl border border-slate-200 text-left text-sm">
        <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">Template</dt><dd className="font-medium text-navy-900">{template?.name}</dd></div>
        <div className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">Next step</dt><dd className="font-medium text-navy-900">Approval by the platform team</dd></div>
      </dl>
      <Button className="mt-6" onClick={() => onComplete(created)}>View card orders</Button>
    </div> : <>
      <StepIndicator steps={['Choose people', 'Check design', 'Confirm']} current={step} />

      {step === 1 && <div className="pt-6">
        <h3 className={stepHeading}>Who needs a new card?</h3>
        <p className={stepParagraph}>Only active employees can be included.</p>
        <Input aria-label="Find employees" placeholder="Search by name or ID" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="mt-3 max-h-72 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
          {active.filter(item => `${item.name} ${item.employee_id}`.toLowerCase().includes(term)).map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 has-[:checked]:bg-brand-50">
            <input className={checkboxClass} type="checkbox" checked={ids.includes(item.id)} onChange={() => setIds(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} />
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{item.name.charAt(0)}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-navy-900">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.designation} · {item.employee_id}</span></span>
          </label>)}
          {!active.length && <p className="px-4 py-8 text-center text-sm text-slate-500">Add an active employee to get started.</p>}
        </div>
      </div>}

      {step === 2 && <div className="pt-6">
        <h3 className={stepHeading}>Check the design</h3>
        <p className={stepParagraph}>Choosing a different template also makes it your company&apos;s selected template.</p>
        {!templates.length && <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Your company has no card design yet. Close this and open Templates to upload your design or create one with the AI designer.</p>}
        <div className="mb-5 flex flex-wrap gap-2">{templates.map(item => <button type="button" className={cx('rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors', item.id === templateId ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600' : 'border-slate-200 text-slate-700 hover:border-slate-300')} aria-pressed={item.id === templateId} onClick={() => setTemplateId(item.id)} key={item.id}>{item.name}</button>)}</div>
        {template && <div className="rounded-xl border border-slate-200 bg-slate-50 p-6"><CardPreview className={template.design ? undefined : 'm-auto max-w-105 min-h-56.25!'} design={template.design} style={template.style_key} company={company.name} name={selected[0]?.name} designation={selected[0]?.designation} email={selected[0]?.email} phone={selected[0]?.phone} logoPath={company.has_logo ? '/company/logo' : null} photoPath={selected[0]?.has_photo ? `/employees/${selected[0].id}/photo` : null} /></div>}
      </div>}

      {step === 3 && <div className="pt-6">
        <h3 className={stepHeading}>Confirm and submit</h3>
        <p className={stepParagraph}>Check the details. PDFs are generated after the request is approved.</p>
        <dl className="grid grid-cols-1 divide-y divide-slate-100 rounded-xl border border-slate-200 sm:grid-cols-2 sm:divide-y-0">{summary.map(([label, value]) => <div key={label} className="px-4 py-3 sm:border-b sm:border-slate-100 sm:odd:border-r"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-sm font-medium text-navy-900">{value}</dd></div>)}</dl>
        <div className="mt-4 flex flex-wrap gap-1.5">{selected.map(item => <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700" key={item.id}>{item.name}</span>)}</div>
      </div>}

      {error && <Notice tone="error" className="mt-4">{error}</Notice>}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5 max-sm:flex-col max-sm:items-stretch">
        <span className="text-sm text-slate-500">{selected.length} employee{selected.length === 1 ? '' : 's'} selected</span>
        <div className="flex gap-2 max-sm:justify-end">
          {step > 1 && <Button variant="secondary" disabled={busy} onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3
            ? <Button disabled={!selected.length || (step === 2 && !template)} onClick={() => setStep(step + 1)}>Continue</Button>
            : <Button disabled={busy || !selected.length || !template} onClick={submit}>{busy ? 'Submitting…' : 'Submit for approval'}</Button>}
        </div>
      </div>
    </>}
  </ReviewDialog>;
}
