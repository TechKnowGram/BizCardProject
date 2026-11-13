'use client';

import type { Company } from '@/lib/types';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import StatusBadge from '@/components/StatusBadge';
import { Button, cx } from '@/components/ui';
import { DetailRow } from '@/components/CompanyDashboardParts';

export type Sponsorship = 'COMPANY' | 'INDIVIDUAL';

export interface SettingsTabProps {
  company: Company;
  username?: string;
  sponsorship: Sponsorship;
  onSponsorshipChange: (value: Sponsorship) => void;
  setTab: (tab: string) => void;
}

const options: Array<{ value: Sponsorship; title: string; text: string }> = [
  { value: 'COMPANY', title: 'Company pays', text: 'Card orders from approved employees are billed to the company. Employees pay nothing.' },
  { value: 'INDIVIDUAL', title: 'Employees pay', text: 'Employees pay for their own card orders at ৳50 per card.' },
];

export default function SettingsTab({ company, username, sponsorship, onSponsorshipChange, setTab }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace details and who pays for employee card orders." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Workspace details">
          <dl className="divide-y divide-slate-100 border-y border-slate-100">
            <DetailRow label="Company name">{company.name}</DetailRow>
            <DetailRow label="Workspace ID"><span className="tabular-nums">#{company.id}</span></DetailRow>
            <DetailRow label="Status"><StatusBadge value={company.status} /></DetailRow>
            <DetailRow label="Administrator">{username || '—'}</DetailRow>
          </dl>
          <Button variant="secondary" className="mt-5" onClick={() => setTab('profile')}>Edit company profile</Button>
        </SectionCard>

        <SectionCard title="Card sponsorship" info="The default shown to employees when they order cards.">
          <p className="text-sm leading-relaxed text-slate-600">Choose who pays when an employee orders a company card.</p>
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Card sponsorship</legend>
            {options.map((option) => {
              const checked = sponsorship === option.value;
              return (
                <label
                  key={option.value}
                  className={cx(
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors',
                    checked ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 bg-white hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name="sponsorship"
                    className="mt-0.5 size-4 accent-brand-600"
                    checked={checked}
                    onChange={() => onSponsorshipChange(option.value)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-navy-900">
                      {option.title}
                      {option.value === 'COMPANY' && <span className="ml-2 text-xs font-normal text-slate-500">Default</span>}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{option.text}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        </SectionCard>
      </div>
    </div>
  );
}
