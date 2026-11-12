'use client';
import CardPreview from './CardPreview';
import StatusBadge from './StatusBadge';
import { Button, cx } from './ui';
import type { CompanySummary, Template } from '../lib/types';

export interface AdminTemplateData {
  templates: Template[];
  companies: CompanySummary[];
  companyDesigns: Template[];
}

export interface AdminTemplateCollectionProps {
  data: AdminTemplateData;
  busy: boolean;
  onToggle: (template: Template) => void;
  onSave: (id: number) => void;
}

const gridClass = 'grid grid-cols-3 items-stretch gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1';
const headingClass = 'mb-5 flex items-start justify-between gap-4 max-sm:flex-wrap';
const wrapText = '[overflow-wrap:anywhere]';

function SectionHeading({ title, note, count }: { title: string; note: string; count: number }) {
  return <div className={headingClass}><div className="min-w-0"><h3 className={cx('text-lg font-bold tracking-tighter', wrapText)}>{title}</h3><p className="mt-1.5 text-xs leading-relaxed text-[#777286]">{note}</p></div><span className="flex-none rounded-[28px] border border-[#e7e1ee] px-2.5 py-1.5 text-xs text-[#796986]">{count} designs</span></div>;
}

export default function AdminTemplateCollection({ data, busy, onToggle, onSave }: AdminTemplateCollectionProps) {
  function card(template: Template, privateDesign = false) {
    const saved = data.templates.some(item => item.style_key === `shared_${template.id}`);
    const company = data.companies.find(item => item.id === template.company_id);
    return <article className="flex min-w-0 flex-col rounded-[28px] border border-[#e2e8f0] bg-white p-4.5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#a5b4fc]" key={template.id}>
      <CardPreview variant="library" design={template.design} style={template.style_key} />
      <div className="my-5 flex min-w-0 flex-1 items-start justify-between gap-3"><div className="w-full min-w-0"><span className={cx('mb-1.25 block text-3xs font-bold tracking-widest text-[#8a739d]', wrapText)}>{privateDesign ? company?.name || `Company #${template.company_id}` : 'SHARED COLLECTION'}</span><h3 className={cx('text-base font-bold leading-relaxed', wrapText)}>{template.name}</h3><p className={cx('mt-1.5 text-xs leading-relaxed text-[#8d8695]', wrapText)}>{template.description}</p></div></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0edf4] pt-4"><StatusBadge value={privateDesign ? saved ? 'SAVED' : 'PRIVATE' : template.is_active ? 'ACTIVE' : 'INACTIVE'} /><Button variant={privateDesign ? 'primary' : 'secondary'} className="min-w-0 whitespace-normal" disabled={busy || (privateDesign && saved)} onClick={() => privateDesign ? onSave(template.id) : onToggle(template)}>{privateDesign ? saved ? 'Saved to collection' : 'Save to collection' : template.is_active ? 'Deactivate' : 'Activate'}</Button></div>
    </article>;
  }
  return <div className="min-w-0 px-7 pb-7 pt-2 max-sm:px-4 max-sm:pb-5 max-sm:pt-1"><section><SectionHeading title="Shared template collection" note="Curated designs available to approved companies." count={data.templates.length} /><div className={gridClass}>{data.templates.map(template => card(template))}</div></section><section className="mt-9 border-t border-[#ece8f1] pt-7"><SectionHeading title="Company designs" note="Private company styles. Save a design here to publish a shared copy." count={data.companyDesigns.length} />{data.companyDesigns.length ? <div className={gridClass}>{data.companyDesigns.map(template => card(template, true))}</div> : <div className="rounded-[28px] border border-dashed border-[#ded5e9] p-7.5 text-center text-sm text-[#847a8f]">Company designs will appear here when teams save their first style.</div>}</section></div>;
}
