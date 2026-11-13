'use client';

import { useMemo, useState } from 'react';
import DataTable, { NameCell, type Column } from '@/components/dashboard/DataTable';
import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui';
import { MatchBadge, cellNoteClass, formatDay, rowButtonClass } from '@/components/CompanyDashboardParts';

export interface MembershipsTabProps {
  memberships: any[];
  membershipFilter: string;
  setMembershipFilter: (value: string) => void;
  busy: boolean;
  onDecide: (id: number, decision: string) => void;
}

export default function MembershipsTab({ memberships, membershipFilter, setMembershipFilter, busy, onDecide }: MembershipsTabProps) {
  const [search, setSearch] = useState('');

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
      header: 'Actions',
      align: 'right',
      render: (m) =>
        m.status === 'PENDING' ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="secondary" className={rowButtonClass} disabled={busy} onClick={() => { if (window.confirm('Reject this request to join your company?')) onDecide(m.id, 'REJECTED'); }}>Reject</Button>
            <Button className={rowButtonClass} disabled={busy} onClick={() => onDecide(m.id, 'APPROVED')}>Approve</Button>
          </div>
        ) : m.status === 'APPROVED' ? (
          <Button variant="danger" className={rowButtonClass} disabled={busy} onClick={() => { if (window.confirm('Revoke this employee’s access? They will no longer be able to order company cards.')) onDecide(m.id, 'REVOKED'); }}>Revoke access</Button>
        ) : (
          <span className="text-xs text-slate-500">No action needed</span>
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
    </div>
  );
}
