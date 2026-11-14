'use client';

import type { CardRequest, Company, Employee, Template } from '@/lib/types';
import { CardLink, PageHeader, SectionCard, StatTile } from '@/components/dashboard/Surface';
import { NameCell } from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button, cx } from '@/components/ui';
import { CheckDot, MatchBadge, ProgressLine, formatDate, rowButtonClass } from '@/components/company/CompanyDashboardParts';

export type SetupStep = [label: string, done: boolean, target: string];

export interface OverviewTabProps {
  company: Company;
  employees: Employee[];
  activeEmployees: Employee[];
  requests: CardRequest[];
  completedRequests: CardRequest[];
  pendingMemberships: any[];
  selectedTemplate?: Template;
  setupSteps: SetupStep[];
  busy: boolean;
  setTab: (tab: string) => void;
  onCreateRequest: () => void;
  onOpenRequest: (request: CardRequest) => void;
  onDecideMembership: (id: number, decision: string) => void;
}

export default function OverviewTab({
  company,
  employees,
  activeEmployees,
  requests,
  completedRequests,
  pendingMemberships,
  selectedTemplate,
  setupSteps,
  busy,
  setTab,
  onCreateRequest,
  onOpenRequest,
  onDecideMembership,
}: OverviewTabProps) {
  const doneCount = setupSteps.filter(([, done]) => done).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description="Add your staff, approve requests to join, and order cards for your team."
        actions={
          <>
            <Button variant="secondary" onClick={() => setTab('employees')}>Manage employees</Button>
            <Button onClick={onCreateRequest}>New card request</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active employees" value={activeEmployees.length} hint={`${employees.length} on the staff list`} />
        <StatTile
          label="Pending memberships"
          value={pendingMemberships.length}
          hint={pendingMemberships.length ? 'Waiting for your decision' : 'Nothing waiting'}
        />
        <StatTile
          label="Card style"
          value={<span className="block truncate text-xl leading-9" title={selectedTemplate?.name}>{selectedTemplate?.name || 'Not chosen'}</span>}
          hint={selectedTemplate ? 'Used for new card requests' : 'Choose one under Templates'}
        />
        <StatTile label="Completed requests" value={completedRequests.length} hint={`${requests.length} card requests in total`} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Recent card requests"
          action={requests.length > 0 ? <CardLink onClick={() => setTab('requests')}>View all</CardLink> : undefined}
          bodyClassName="px-0 pb-2"
        >
          {requests.length > 0 ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {requests.slice(0, 5).map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-900">Request #{request.id}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {request.items.length} employee{request.items.length === 1 ? '' : 's'} · {formatDate(request.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <StatusBadge value={request.status} />
                    <CardLink onClick={() => onOpenRequest(request)}>Details</CardLink>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-t border-slate-100 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">Your card requests will appear here.</p>
              <Button variant="secondary" className="mt-4" onClick={onCreateRequest}>New card request</Button>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Setup checklist" action={<span className="text-sm text-slate-500">{doneCount} of {setupSteps.length} done</span>}>
          <ProgressLine value={(doneCount / setupSteps.length) * 100} />
          <ul className="mt-4 divide-y divide-slate-100">
            {setupSteps.map(([label, done, target]) => (
              <li key={label} className="flex items-center gap-3 py-3">
                <CheckDot done={done} />
                <span className={cx('flex-1 text-sm', done ? 'text-slate-500' : 'font-medium text-navy-900')}>{label}</span>
                {!done && <CardLink onClick={() => setTab(target)}>Open</CardLink>}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Pending membership requests"
        action={pendingMemberships.length > 0 ? <CardLink onClick={() => setTab('memberships')}>View all</CardLink> : undefined}
        bodyClassName="px-0 pb-2"
      >
        {pendingMemberships.length > 0 ? (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {pendingMemberships.slice(0, 5).map((membership) => (
              <li key={membership.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <NameCell name={membership.user?.username || membership.official_email} sub={`${membership.employee_code} · ${membership.official_email}`} />
                  <MatchBadge value={membership.match_status} />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" className={rowButtonClass} disabled={busy} onClick={() => onDecideMembership(membership.id, 'REJECTED')}>Reject</Button>
                  <Button className={rowButtonClass} disabled={busy} onClick={() => onDecideMembership(membership.id, 'APPROVED')}>Approve</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-500">
            When employees ask to join {company.name}, their requests will appear here.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
