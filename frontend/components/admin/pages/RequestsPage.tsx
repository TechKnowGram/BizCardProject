'use client';

import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminRequestsPage() {
  const { search, setSearch, statusFilter, setStatusFilter, filteredRequests, requestColumns } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Card orders" description="Card requests from every company, newest first." />
      <DataTable
        title="All card requests"
        rows={filteredRequests}
        columns={requestColumns}
        rowKey={r => r.id}
        search={{ value: search, onChange: setSearch, placeholder: 'Search number, company or person' }}
        toolbar={
          <ToolbarSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'FAILED', label: 'Failed' },
            ]}
          />
        }
        emptyMessage="No card requests match your search."
      />
    </div>
  );
}
