'use client';

import { useState } from 'react';
import type { CompanySummary, Employee, Template } from '@/lib/types';
import { isImageDesign } from '@/lib/types';
import CardPreview from '@/components/cards/CardPreview';
import Icon from '@/components/ui/Icon';
import PdfPreview from '@/components/ui/PdfPreview';
import { Button, cx, inputClass } from '@/components/ui';
import { SectionCard } from '@/components/dashboard/Surface';
import { StudioHeading, optionClass, studioLabelClass } from '@/components/cards/StudioParts';

export interface CardStudioProps {
  company: CompanySummary;
  employees: Employee[];
  templates: Template[];
  templateId?: number | null;
  onChoose: (templateId: number) => void | Promise<void>;
  /** Kept for callers; designs are now created only through the upload below the studio. */
  onSaved?: (template: Template) => void | Promise<void>;
  busy?: boolean;
}

const faceClass = 'absolute inset-0 overflow-hidden rounded-xl shadow-lg [backface-visibility:hidden]';
const zoomButtonClass = 'grid size-8 place-items-center rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40';

export default function CardStudio({ company, employees, templates, templateId, onChoose, busy = false }: CardStudioProps) {
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
    <div className="space-y-6">
      <SectionCard>
        <div className="py-10 text-center">
          <p className="text-base font-semibold text-navy-900">No card design yet</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
            Upload a design made in Photoshop or Canva below. Machine learning finds where each detail goes, and you check it before saving.
          </p>
        </div>
      </SectionCard>
    </div>
  );
  // Uploaded designs have a back only when the admin added one; older designs may have their own back.
  const imageDesign = isImageDesign(template.design) ? template.design : null;
  const aiDesign = isImageDesign(template.design) ? null : template.design;
  const hasBack = imageDesign ? Boolean(imageDesign.back) : Boolean(aiDesign?.two_sided) || aiDesign?.decoration !== 'govt';
  const frontOnly = !hasBack;
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
          <div className="grid grid-cols-1 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {templates.map(item => {
              const selected = draftId === item.id;
              return <button type="button" key={item.id} aria-pressed={selected} title={item.name} className={optionClass(selected, 'flex min-w-0 flex-col gap-2 p-2')} onClick={() => setDraftId(item.id)}>
                <span className="grid h-40 w-full place-items-center overflow-hidden rounded-lg bg-slate-100">
                  <CardPreview variant="library" className="h-full max-h-full w-auto max-w-full" design={item.design} department={employee?.department} style={item.style_key} company={company.name} website={company.website} name={employee?.name || 'Your employee'} designation={employee?.designation || 'Job title'} email={employee?.email || 'name@company.com'} phone={employee?.phone || ''} logoPath={logoPath} photoPath={null} />
                </span>
                <span className="flex min-w-0 items-center gap-1.5 px-0.5">
                  <span className={cx('min-w-0 flex-1 truncate text-sm font-medium', selected ? 'text-brand-700' : 'text-navy-900')}>{item.name}</span>
                  {selected && <Icon name="check" size={16} className="shrink-0 text-brand-600" />}
                </span>
                {item.id === templateId && <span className="w-fit rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">In use</span>}
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
            <div
              className={cx('relative w-full transition-transform duration-[550ms] ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none', imageDesign && imageDesign.height > imageDesign.width ? 'max-w-[17rem]' : 'max-w-105')}
              style={{ aspectRatio: imageDesign ? `${imageDesign.width} / ${imageDesign.height}` : '7 / 4', transform: showBack ? `scale(${zoom}) rotateY(180deg)` : `scale(${zoom})` }}
            >
              <div className={faceClass}><CardPreview variant="studio" design={template.design} department={employee?.department} style={template.style_key} company={company.name} website={company.website} name={employee?.name || 'Your employee'} designation={employee?.designation || 'Job title'} email={employee?.email || 'name@company.com'} phone={employee?.phone || ''} logoPath={logoPath} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} /></div>
              <div className={cx(faceClass, '[transform:rotateY(180deg)]', aiDesign?.two_sided || imageDesign?.back ? 'block bg-transparent p-0' : 'flex flex-col items-center justify-center gap-1.5 bg-navy-900 p-5 text-center text-white')}>
                {imageDesign?.back
                  ? <CardPreview variant="studio" design={imageDesign} back company={company.name} website={company.website} logoPath={logoPath} name={employee?.name} designation={employee?.designation} email={employee?.email} phone={employee?.phone || ''} department={employee?.department} />
                  : aiDesign?.two_sided
                  ? <CardPreview variant="studio" design={aiDesign} back company={company.name} website={company.website} logoPath={logoPath} />
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
                ? <span className={cx('self-center text-sm', surface === 'light' ? 'text-slate-500' : 'text-slate-300')}>Front only</span>
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

    {pdfOpen && <PdfPreview templateId={template.id} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </div>;
}
