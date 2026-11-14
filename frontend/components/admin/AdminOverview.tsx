'use client';

import { useMemo, useState } from 'react';
import type { AuditLog, CardRequest, Company } from '@/lib/types';
import { Button } from '@/components/ui';
import { CardLink, PageHeader, SectionCard, StatTile, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable, { NameCell } from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { AreaChart, StatusBreakdown, bucketByDate, rangeOptions, statusColor } from '@/components/dashboard/Charts';
import { plural, relativeTime, sentenceCase, shortDate, waitingFor } from '@/components/admin/format';

type Range = (typeof rangeOptions)[number]['value'];

export interface QueueItem {
  id: number;
  kind: 'companies' | 'requests';
  name: string;
  sub: string;
  created_at: string;
  raw: Partial<Company & CardRequest>;
}

export interface AdminOverviewProps {
  companies: Company[];
  requests: CardRequest[];
  audits: AuditLog[];
  userCount: number;
  userHint?: string;
  generatedCards: number;
  pendingCompanies: number;
  pendingRequests: number;
  queue: QueueItem[];
  onReview: (item: QueueItem) => void;
  setTab: (tab: string) => void;
}

function Pill({ children }: { children: string }) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700">{children}</span>;
}

export default function AdminOverview({
  companies,
  requests,
  audits,
  userCount,
  userHint,
  generatedCards,
  pendingCompanies,
  pendingRequests,
  queue,
  onReview,
  setTab,
}: AdminOverviewProps) {
  const [period, setPeriod] = useState<Range>('6m');

  const series = useMemo(() => bucketByDate(requests.map((r) => r.created_at), period), [requests, period]);
  const periodTotal = series.reduce((sum, p) => sum + p.value, 0);

  const byStatus = (status: string) => companies.filter((c) => c.status === status).length;
  const completedRequests = requests.filter((r) => r.status === 'COMPLETED').length;

  const columns: Column<QueueItem>[] = [
    { key: 'type', header: 'Type', render: (item) => <Pill>{item.kind === 'companies' ? 'Company' : 'Card request'}</Pill> },
    { key: 'name', header: 'Name', render: (item) => <NameCell name={item.name} sub={item.sub} />, className: 'max-w-64' },
    { key: 'submitted', header: 'Submitted', render: (item) => <span className="whitespace-nowrap tabular-nums">{shortDate(item.created_at)}</span>, hideOnMobile: true },
    { key: 'waiting', header: 'Waiting', render: (item) => <span className="whitespace-nowrap text-slate-500 tabular-nums">{waitingFor(item.created_at)}</span> },
    {
      key: 'action',
      header: '', srHeader: 'Actions',
      align: 'right',
      render: (item) => (
        <Button className="px-3 py-1.5" onClick={() => onReview(item)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Companies, card requests and activity across BizCard."
        actions={<ToolbarSelect label="Period" value={period} onChange={(v) => setPeriod(v as Range)} options={rangeOptions} />}
      />

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <StatTile label="Companies" value={companies.length} hint={`${pendingCompanies} waiting for approval`} />
        <StatTile label="Users" value={userCount} hint={userHint} />
        <StatTile label="Card requests" value={requests.length} hint={`${pendingRequests} waiting for a decision`} />
        <StatTile label="Cards issued" value={generatedCards} hint={`${plural(completedRequests, 'request')} completed`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="Card requests"
          info="Card requests submitted by companies and employees, counted by the date they were sent."
          action={
            <span className="text-slate-500">
              <span className="font-semibold text-navy-900 tabular-nums">{periodTotal}</span> in this period
            </span>
          }
        >
          <AreaChart data={series} unit="Card requests" />
        </SectionCard>

        <SectionCard title="Companies" action={<CardLink onClick={() => setTab('companies')}>All companies</CardLink>}>
          <p className="text-[1.75rem] leading-tight font-bold text-navy-900 tabular-nums">{companies.length}</p>
          <p className="mt-0.5 text-sm text-slate-500">Registered companies</p>
          <StatusBreakdown
            className="mt-6"
            items={[
              { key: 'approved', label: 'Approved', value: byStatus('APPROVED'), color: statusColor.good },
              { key: 'pending', label: 'Pending', value: byStatus('PENDING'), color: statusColor.warning },
              { key: 'rejected', label: 'Rejected', value: byStatus('REJECTED'), color: statusColor.critical },
              { key: 'suspended', label: 'Suspended', value: byStatus('SUSPENDED'), color: statusColor.neutral },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <DataTable
          title="Waiting for a decision"
          description="Oldest first."
          rows={queue}
          columns={columns}
          rowKey={(item) => `${item.kind}-${item.id}`}
          numbered={false}
          initialPageSize={5}
          pageSizeOptions={[5, 10, 25]}
          emptyMessage="Nothing is waiting. New companies and card requests will appear here."
        />

        <SectionCard title="Recent activity" action={<CardLink onClick={() => setTab('reports')}>View all</CardLink>} bodyClassName="pt-2 pb-3">
          {audits.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Approvals, orders and other changes will be listed here.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {audits.slice(0, 6).map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{sentenceCase(log.action)}</p>
                    <p className="truncate text-xs text-slate-500" title={log.details ?? undefined}>
                      {[companies.find((c) => c.id === log.company_id)?.name, log.details || (log.entity_type === 'company' ? null : `${sentenceCase(log.entity_type)} #${log.entity_id}`)].filter(Boolean).join(' · ') || `${sentenceCase(log.entity_type)} #${log.entity_id}`}
                    </p>
                  </div>
                  <time dateTime={log.created_at} title={shortDate(log.created_at)} className="shrink-0 text-xs whitespace-nowrap text-slate-500">
                    {relativeTime(log.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
