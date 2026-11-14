'use client';

import type { Company } from '@/lib/types';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { Button } from '@/components/ui';
import { CheckDot, NoticeCard, ProgressLine } from '@/components/company/CompanyDashboardParts';

export interface PendingOverviewProps {
  company: Company;
  setTab: (tab: string) => void;
  onRefresh: () => void;
}

/** Overview shown while the company is waiting for (or failed) platform approval. */
export default function PendingOverview({ company, setTab, onRefresh }: PendingOverviewProps) {
  const pending = company.status === 'PENDING';
  const details: Array<[string, boolean]> = [
    ['Company name', Boolean(company.name)],
    ['Logo', Boolean(company.has_logo)],
    ['Phone', Boolean(company.phone)],
    ['Address', Boolean(company.address)],
    ['Website', Boolean(company.website)],
    ['Description', Boolean(company.description)],
  ];
  const filled = details.filter(([, done]) => done).length;
  const nextSteps = [
    'The platform team reviews your company registration.',
    'Once approved, add your employees or import them from a CSV file.',
    'Choose a card design and send your first card request.',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description={pending ? 'Your company registration is being reviewed.' : 'Your company workspace is not approved.'}
        actions={<Button variant="secondary" onClick={onRefresh}>Check status</Button>}
      />

      {pending ? (
        <NoticeCard tone="amber" title="Workspace under review">
          You can update your company profile while you wait. Employees, templates and card orders open once the workspace is approved.
        </NoticeCard>
      ) : (
        <NoticeCard tone="red" title="Workspace needs attention">
          Reason: {company.rejection_reason || 'No reason was given.'}
        </NoticeCard>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Complete your company profile">
          <p className="text-sm leading-relaxed text-slate-600">
            Your logo and contact details are used on your team&apos;s cards. Add them now so you are ready when the workspace is approved.
          </p>
          <ProgressLine className="mt-5" value={(filled / details.length) * 100} label={`${filled} of ${details.length} details added`} />
          <ul className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {details.map(([label, done]) => (
              <li key={label} className="flex items-center gap-3 border-b border-slate-100 py-2.5 text-sm">
                <CheckDot done={done} className="size-5" />
                <span className={done ? 'text-slate-500' : 'text-navy-900'}>{label}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-5" onClick={() => setTab('profile')}>Open company profile</Button>
        </SectionCard>

        <SectionCard title="What happens next">
          <ol className="space-y-4">
            {nextSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                <CheckDot done={false} className="size-5">{index + 1}</CheckDot>
                {step}
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    </div>
  );
}
