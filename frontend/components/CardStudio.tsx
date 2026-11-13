'use client';

import { useState } from 'react';
import type { CompanySummary, Employee, Template } from '../lib/types';
import CardPreview from './CardPreview';
import Icon from './Icon';
import AiDesigner from './AiDesigner';
import PdfPreview from './PdfPreview';
import { Button, cx, inputClass } from './ui';
import { SectionCard } from './dashboard/Surface';
import { StudioHeading, optionClass, studioLabelClass } from './StudioParts';

export interface CardStudioProps {
  company: CompanySummary;
  employees: Employee[];
  templates: Template[];
  templateId?: number | null;
  onChoose: (templateId: number) => void | Promise<void>;
  onSaved: (template: Template) => void | Promise<void>;
  busy?: boolean;
}

const faceClass = 'absolute inset-0 overflow-hidden rounded-xl shadow-lg [backface-visibility:hidden]';
const zoomButtonClass = 'grid size-8 place-items-center rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40';

export default function CardStudio({ company, employees, templates, templateId, onChoose, onSaved, busy = false }: CardStudioProps) {
  const active = employees.filter(employee => employee.is_active);
  const [employeeId, setEmployeeId] = useState<string | number>(active[0]?.id || '');
  const [draftId, setDraftId] = useState<number | undefined>(templateId || templates[0]?.id);
  const [surface, setSurface] = useState<'light' | 'dark'>('light');
  const [zoom, setZoom] = useState(1);
  const [back, setBack] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const employee = active.find(item => String(item.id) === String(employeeId)) || active[0];
  const template = templates.find(item => item.id === draftId) || templates[0];
  if (!template) return (
    <SectionCard>
      <div className="py-12 text-center">
        <p className="text-base font-semibold text-navy-900">No templates available</p>
        <p className="mt-1 text-sm text-slate-500">The platform team can make a card template available to your company.</p>
      </div>
    </SectionCard>
  );
  const frontOnly = template.design?.decoration === 'govt';
  const showBack = back && !frontOnly;
  const logoPath = company.has_logo ? '/company/logo' : null;
  const isCurrent = draftId === templateId;

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-100 px-6 py-5">
        <StudioHeading title="Card designs" description="Preview each template with one of your employees, then choose the one your company uses." />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-slate-100 p-6 max-lg:border-b lg:border-r">
          <label htmlFor="studio-employee" className={studioLabelClass}>Preview with</label>
          <select id="studio-employee" className={inputClass} value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
            {active.length ? active.map(item => <option value={item.id} key={item.id}>{item.name}</option>) : <option value="">Sample employee</option>}
          </select>

          <p className={cx(studioLabelClass, 'mt-6')}>Templates</p>
          <div className="grid gap-2 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {templates.map(item => {
              const selected = draftId === item.id;
              return <button type="button" key={item.id} aria-pressed={selected} className={optionClass(selected, 'flex items-start gap-3 px-3.5 py-3')} onClick={() => setDraftId(item.id)}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cx('truncate text-sm font-medium', selected ? 'text-brand-700' : 'text-navy-900')}>{item.name}</span>
                    {item.id === templateId && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">In use</span>}
                  </span>
                  {item.description && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{item.description}</span>}
                </span>
                {selected && <Icon name="check" size={16} className="mt-0.5 shrink-0 text-brand-600" />}
              </button>;
            })}
          </div>
        </aside>

        <div className={cx('flex min-h-110 flex-col p-6 transition-colors duration-300 max-sm:p-4', surface === 'light' ? 'bg-slate-100' : 'bg-navy-900')}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cx('text-sm font-medium', surface === 'light' ? 'text-slate-600' : 'text-slate-200')}>{showBack ? 'Back' : 'Front'}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="px-3 py-1.5" onClick={() => setSurface(surface === 'light' ? 'dark' : 'light')}>{surface === 'light' ? 'Dark background' : 'Light background'}</Button>
            </div>
          </div>
          <div className="grid flex-1 place-items-center px-2.5 py-8 [perspective:calc(var(--spacing)*300)] max-sm:px-2">
            <div className="relative aspect-[7/4] w-full max-w-105 transition-transform duration-[550ms] ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none" style={{ transform: showBack ? `scale(${zoom}) rotateY(180deg)` : `scale(${zoom})` }}>
              <div className={faceClass}><CardPreview variant="studio" design={template.design} department={employee?.department} style={template.style_key} company={company.name} name={employee?.name || 'Your employee'} designation={employee?.designation || 'Job title'} email={employee?.email || 'name@company.com'} phone={employee?.phone || ''} logoPath={logoPath} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} /></div>
              <div className={cx(faceClass, '[transform:rotateY(180deg)]', template.design?.two_sided ? 'block bg-transparent p-0' : 'flex flex-col items-center justify-center gap-1.5 bg-navy-900 p-5 text-center text-white')}>
                {template.design?.two_sided
                  ? <CardPreview variant="studio" design={template.design} back company={company.name} website={company.website} logoPath={logoPath} />
                  : <>
                    <span className="text-base font-semibold">{company.name}</span>
                    {company.website && <span className="text-sm text-slate-300">{company.website}</span>}
                    <span className="absolute bottom-4 text-xs text-slate-400">This design is printed on one side only.</span>
                  </>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="px-3 py-1.5" onClick={() => setPdfOpen(true)}>Preview PDF</Button>
              {frontOnly
                ? <span className={cx('self-center text-sm', surface === 'light' ? 'text-slate-500' : 'text-slate-300')}>Front only (single-sided ID card)</span>
                : <Button variant="secondary" className="px-3 py-1.5" onClick={() => setBack(!back)}><Icon name="flip" size={16} /> {back ? 'Show front' : 'Show back'}</Button>}
            </div>
            <div className={cx('flex items-center gap-2 text-sm tabular-nums', surface === 'light' ? 'text-slate-600' : 'text-slate-200')}>
              <button type="button" className={zoomButtonClass} aria-label="Zoom out" disabled={zoom <= .85} onClick={() => setZoom(value => Math.max(.85, value - .1))}>−</button>
              <span className="w-11 text-center">{Math.round(zoom * 100)}%</span>
              <button type="button" className={zoomButtonClass} aria-label="Zoom in" disabled={zoom >= 1.15} onClick={() => setZoom(value => Math.min(1.15, value + .1))}>+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 max-sm:flex-col max-sm:items-stretch">
        <div>
          <p className="text-sm font-semibold text-navy-900">{template.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">{isCurrent ? 'This is the template your company uses.' : 'Previewing. Not yet used by your company.'}</p>
        </div>
        <Button disabled={busy || isCurrent} onClick={() => onChoose(template.id)}>{busy ? 'Saving…' : isCurrent ? 'Template in use' : 'Use this template'}</Button>
      </div>
    </section>

    <AiDesigner company={company} employee={employee} onSaved={onSaved} />
    {pdfOpen && <PdfPreview templateId={template.id} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </div>;
}
