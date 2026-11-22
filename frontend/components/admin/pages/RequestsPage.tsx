'use client';

import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import { useAdmin } from '@/components/admin/AdminDashboard';
import PersonalOrdersReview from '@/components/admin/PersonalOrdersReview';

export default function AdminRequestsPage() {
  const { search, setSearch, statusFilter, setStatusFilter, filteredRequests, requestColumns } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Card orders" description="Every card order is approved here first; the company or employee pays after approval and then downloads." />
      <DataTable
        title="Company card requests"
        description="From companies, and from employees ordering on their company's design."
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
      <PersonalOrdersReview />
    </div>
  );
}
