'use client';
import CardPreview from './CardPreview';
import StatusBadge from './StatusBadge';
import type { ReactNode } from 'react';
import { Button } from './ui';
import { SectionCard } from './dashboard/Surface';
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

const gridClass = 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3';

function Count({ value }: { value: number }) {
  return <span className="text-slate-500">{value === 1 ? '1 design' : `${value} designs`}</span>;
}

function TemplateCard({
  template,
  label,
  status,
  action,
}: {
  template: Template;
  label: string;
  status: string;
  action: ReactNode;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
      <CardPreview variant="library" design={template.design} style={template.style_key} />
      <div className="mt-4 min-w-0 flex-1">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <h3 className="mt-0.5 text-sm font-semibold text-navy-900 [overflow-wrap:anywhere]">{template.name}</h3>
        {template.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500" title={template.description}>{template.description}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <StatusBadge value={status} />
        {action}
      </div>
    </article>
  );
}

export default function AdminTemplateCollection({ data, busy, onToggle, onSave }: AdminTemplateCollectionProps) {
  return (
    <div className="space-y-6">
      <SectionCard title="Shared templates" info="Designs every approved company can choose for its cards." action={<Count value={data.templates.length} />}>
        {data.templates.length ? (
          <div className={gridClass}>
            {data.templates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                label="Shared"
                status={template.is_active ? 'ACTIVE' : 'INACTIVE'}
                action={
                  <Button variant="secondary" className="px-3 py-1.5" disabled={busy} onClick={() => onToggle(template)}>
                    {template.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                }
              />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">Shared templates will appear here.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Company designs"
        info="Designs a company made for itself. Only that company can use them until you add a copy to the shared templates."
        action={<Count value={data.companyDesigns.length} />}
      >
        {data.companyDesigns.length ? (
          <div className={gridClass}>
            {data.companyDesigns.map(template => {
              const saved = data.templates.some(item => item.style_key === `shared_${template.id}`);
              const company = data.companies.find(item => item.id === template.company_id);
              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  label={company?.name || `Company #${template.company_id}`}
                  status={saved ? 'SHARED' : 'PRIVATE'}
                  action={
                    <Button
                      variant={saved ? 'secondary' : 'primary'}
                      className="px-3 py-1.5"
                      disabled={busy || saved}
                      onClick={() => onSave(template.id)}
                    >
                      {saved ? 'Already shared' : 'Add to shared templates'}
                    </Button>
                  }
                />
              );
            })}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">Designs companies make for themselves will appear here.</p>
        )}
      </SectionCard>
    </div>
  );
}
