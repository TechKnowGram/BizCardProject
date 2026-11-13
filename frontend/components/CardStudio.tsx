'use client';

import { useState } from 'react';
import type { CompanySummary, Employee, Template } from '../lib/types';
import CardPreview from './CardPreview';
import Icon from './Icon';
import AiDesigner from './AiDesigner';
import PdfPreview from './PdfPreview';
import { Button, FieldLabel, Panel, PanelHeader, buttonClass, cx, inputClass } from './ui';
import { Kicker, pillClass } from './StudioParts';

export interface CardStudioProps {
  company: CompanySummary;
  employees: Employee[];
  templates: Template[];
  templateId?: number | null;
  onChoose: (templateId: number) => void | Promise<void>;
  onSaved: (template: Template) => void | Promise<void>;
  busy?: boolean;
}

const faceClass = 'absolute inset-0 overflow-hidden rounded-xl shadow-xl [backface-visibility:hidden]';
const zoomButtonClass = 'size-7 rounded-lg border border-brand-300/30';

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
  if (!template) return <div className="grid min-h-90 place-content-center place-items-center p-8.75 text-center"><h3 className="text-lg font-semibold text-slate-700">No active templates available</h3><p className="mt-2 max-w-90 text-xs leading-relaxed text-slate-500">Your administrator can activate a company card style.</p></div>;
  const frontOnly = template.design?.decoration === 'govt';
  const showBack = back && !frontOnly;
  const logoPath = company.has_logo ? '/company/logo' : null;
  return <Panel>
    <PanelHeader className="max-sm:p-4.5"><div><Kicker>YOUR BRAND, IN FOCUS</Kicker><h2 className="text-lg font-semibold tracking-tighter">Card Studio</h2><p className="mt-1.25 text-xs text-slate-500">Explore your signature style with real team details.</p></div><span className={pillClass}>Your design collection</span></PanelHeader>
    <AiDesigner company={company} employee={employee} onSaved={onSaved} />
    <div className="grid grid-cols-[calc(var(--spacing)*65)_minmax(0,1fr)] max-lg:grid-cols-1">
      <aside className="border-r border-slate-200 p-6.5 max-lg:border-b max-lg:border-r-0">
        <FieldLabel htmlFor="studio-employee">Preview employee</FieldLabel>
        <select id="studio-employee" className={inputClass} value={employeeId} onChange={event => setEmployeeId(event.target.value)}>{active.length ? active.map(item => <option value={item.id} key={item.id}>{item.name}</option>) : <option value="">Sample employee</option>}</select>
        <p className="mb-3 mt-7 text-2xs font-semibold uppercase tracking-wider text-slate-500">Signature styles</p>
        <div className="grid gap-2.25 max-lg:grid-cols-3 max-sm:grid-cols-1">{templates.map((item, index) => <button key={item.id} aria-pressed={draftId === item.id} className={cx('flex items-center gap-3 rounded-xl border px-3 py-3.5 text-left transition-all duration-200 max-lg:flex-wrap', draftId === item.id ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-50' : 'border-slate-200')} onClick={() => setDraftId(item.id)}><span className="text-2xs text-slate-400">0{index + 1}</span><div><strong className="block text-xs">{item.name}</strong><small className="mt-1 block text-3xs text-slate-400 max-lg:hidden">{item.description}</small></div><Icon name={draftId === item.id ? 'check' : 'arrow'} className="ml-auto shrink-0 text-brand-600" /></button>)}</div>
        <div className="mt-8.75 flex gap-2.5 text-2xs leading-relaxed text-slate-500 max-lg:hidden"><Icon name="check" /><p>Company-owned data.<br /><strong>One consistent brand.</strong></p></div>
      </aside>
      <div className={cx('min-h-117.5 overflow-hidden p-6.25 transition-[background] duration-300 max-sm:p-3.75', surface === 'light' ? 'bg-slate-100 bg-[radial-gradient(ellipse_at_center,#e8ddfa,transparent_70%)]' : 'bg-navy-900 bg-[radial-gradient(ellipse_at_center,#49316c,transparent_70%)] text-brand-50')}>
        <div className="flex items-center justify-between gap-3.75"><span className="flex items-center gap-1.75 text-3xs font-[850] tracking-2xl max-sm:text-3xs max-sm:tracking-wider"><i className="size-1.5 rounded-full bg-emerald-500" /> LIVE DESIGN PREVIEW</span><Button variant="secondary" onClick={() => setSurface(surface === 'light' ? 'dark' : 'light')}>{surface === 'light' ? 'Dark' : 'Light'} surface</Button></div>
        <div className="grid min-h-80 place-items-center px-2.5 py-7.5 [perspective:calc(var(--spacing)*300)] max-sm:px-5">
          <div className="relative aspect-[7/4] w-full max-w-105 transition-transform duration-[550ms] ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none" style={{ transform: showBack ? `scale(${zoom}) rotateY(180deg)` : `scale(${zoom})` }}>
            <div className={faceClass}><CardPreview variant="studio" design={template.design} department={employee?.department} style={template.style_key} company={company.name} name={employee?.name || 'Your employee'} designation={employee?.designation || 'Job title'} email={employee?.email || 'name@company.com'} phone={employee?.phone || ''} logoPath={logoPath} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} /></div>
            <div className={cx(faceClass, '[transform:rotateY(180deg)]', template.design?.two_sided ? 'block bg-transparent p-0' : 'flex flex-col items-center justify-center bg-navy-900 p-5 text-white')}>{template.design?.two_sided ? <CardPreview variant="studio" design={template.design} back company={company.name} website={company.website} logoPath={logoPath} /> : <><strong className="text-base uppercase tracking-wider">{company.name}</strong><span className="text-5xl text-amber-400">✦</span><p className="text-xs text-brand-200">{company.website || 'Your people. Your brand.'}</p><small className="absolute bottom-4 text-3xs text-brand-300">Brand view · exported PDF is single-sided</small></>}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="secondary" className="gap-2.25" onClick={() => setPdfOpen(true)}>Actual PDF preview</Button>{frontOnly ? <span className="text-2xs text-slate-500">Front only · single-sided ID card</span> : <Button variant="secondary" className="gap-2.25" onClick={() => setBack(!back)}><Icon name="flip" /> {back ? 'Employee view' : 'Brand view'}</Button>}<div className="flex items-center gap-3 text-2xs"><button className={zoomButtonClass} aria-label="Zoom out" disabled={zoom <= .85} onClick={() => setZoom(value => Math.max(.85, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button className={zoomButtonClass} aria-label="Zoom in" disabled={zoom >= 1.15} onClick={() => setZoom(value => Math.min(1.15, value + .1))}>+</button></div></div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3.75 border-t border-slate-200 px-6.5 py-5.5 max-sm:flex-col max-sm:items-stretch"><div><strong className="text-sm">{template.name}</strong><p className="mt-1 text-2xs text-slate-400">{draftId === templateId ? 'Current company standard' : 'Previewing a new company standard'}</p></div><button className={buttonClass('primary', 'gap-2.25')} disabled={busy || draftId === templateId} onClick={() => onChoose(template.id)}>{busy ? 'Saving…' : draftId === templateId ? 'Selected template' : `Use ${template.name}`} <Icon name="check" /></button></div>
    {pdfOpen && <PdfPreview templateId={template.id} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </Panel>;
}
