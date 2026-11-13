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
      <PageHeader title="Settings" description="Workspace details and how card payment works." />

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

        <SectionCard title="Who pays for cards" info="How card payment is decided today.">
          <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
            <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />Card requests you create for your staff are billed to the company.</li>
            <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />When an employee orders company cards themselves, payment follows their membership: people added from your staff list are paid for by the company.</li>
            <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />Personal cards are always paid by the employee.</li>
          </ul>
          <Button variant="secondary" className="mt-5" onClick={() => setTab('billing')}>View billing</Button>
        </SectionCard>
      </div>
    </div>
  );
}
