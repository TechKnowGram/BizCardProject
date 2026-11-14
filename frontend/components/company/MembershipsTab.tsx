'use client';

import { useMemo, useState } from 'react';
import DataTable, { NameCell, type Column } from '@/components/dashboard/DataTable';
import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import StatusBadge from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/Icon';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ActionBtn } from '@/components/dashboard/RowActions';
import { MatchBadge, cellNoteClass, formatDay } from '@/components/company/CompanyDashboardParts';

type Decision = 'APPROVED' | 'REJECTED' | 'REVOKED';

const CONFIRM: Record<Decision, { title: string; message: string; label: string; danger: boolean }> = {
  APPROVED: { title: 'Approve this request?', message: 'The employee will join your company and can order company cards.', label: 'Approve', danger: false },
  REJECTED: { title: 'Reject this request?', message: 'The employee will not be added to your company. They can ask to join again later.', label: 'Reject', danger: true },
  REVOKED: { title: 'Revoke access?', message: 'The employee will no longer be able to order company cards.', label: 'Revoke access', danger: true },
};

export interface MembershipsTabProps {
  memberships: any[];
  membershipFilter: string;
  setMembershipFilter: (value: string) => void;
  busy: boolean;
  onDecide: (id: number, decision: string) => void;
}

export default function MembershipsTab({ memberships, membershipFilter, setMembershipFilter, busy, onDecide }: MembershipsTabProps) {
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<{ id: number; decision: Decision } | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return memberships
      .filter((m) => (membershipFilter === 'ALL' ? true : m.status === membershipFilter))
      .filter((m) => !term || [m.user?.username, m.official_email, m.employee_code].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [memberships, membershipFilter, search]);

  const columns: Column<any>[] = [
    {
      key: 'user',
      header: 'Employee',
      sortValue: (m) => String(m.user?.username || m.official_email).toLowerCase(),
      render: (m) => <NameCell name={m.user?.username || m.official_email} sub={`User account #${m.user_id}`} />,
    },
    {
      key: 'details',
      header: 'Submitted details',
      render: (m) => (
        <>
          <span className="block text-sm text-slate-800">ID {m.employee_code}</span>
          <span className={cellNoteClass}>{m.official_email}</span>
        </>
      ),
    },
    { key: 'match', header: 'Staff list check', render: (m) => <MatchBadge value={m.match_status} /> },
    { key: 'status', header: 'Status', sortValue: (m) => m.status, render: (m) => <StatusBadge value={m.status} /> },
    {
      key: 'requested',
      header: 'Requested',
      hideOnMobile: true,
      sortValue: (m) => m.requested_at,
      render: (m) => <span className="whitespace-nowrap text-slate-600">{formatDay(m.requested_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (m) =>
        m.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-1.5">
            <ActionBtn label="Approve request" tone="emerald" disabled={busy} onClick={() => setPending({ id: m.id, decision: 'APPROVED' })}>
              <Icon name="check" size={14} />
            </ActionBtn>
            <ActionBtn label="Reject request" tone="rose" disabled={busy} onClick={() => setPending({ id: m.id, decision: 'REJECTED' })}>
              <Icon name="close" size={14} />
            </ActionBtn>
          </div>
        ) : m.status === 'APPROVED' ? (
          <div className="flex items-center justify-end gap-1.5">
            <ActionBtn label="Revoke access" tone="rose" disabled={busy} onClick={() => setPending({ id: m.id, decision: 'REVOKED' })}>
              <Icon name="ban" size={14} />
            </ActionBtn>
          </div>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Membership requests"
        description="Employees who asked to join your company. Check their details against your staff list before you approve."
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(m) => m.id}
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email or ID' }}
        toolbar={
          <ToolbarSelect
            label="Status"
            value={membershipFilter}
            onChange={setMembershipFilter}
            options={[
              { value: 'ALL', label: 'All requests' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'REVOKED', label: 'Revoked' },
            ]}
          />
        }
        emptyMessage={memberships.length ? 'No requests match these filters.' : 'When employees ask to join your company, their requests will appear here.'}
      />
      <ConfirmDialog
        open={pending !== null}
        title={pending ? CONFIRM[pending.decision].title : ''}
        message={pending ? CONFIRM[pending.decision].message : ''}
        confirmLabel={pending ? CONFIRM[pending.decision].label : 'Yes'}
        danger={pending ? CONFIRM[pending.decision].danger : false}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) onDecide(pending.id, pending.decision);
          setPending(null);
        }}
      />
    </div>
  );
}
