'use client';

import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminCompaniesPage() {
  const { search, setSearch, statusFilter, setStatusFilter, review, filteredCompanies, companyColumns } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Every registered company. Approve new ones, suspend or review details."
      />
      <DataTable
        title="All companies"
        rows={filteredCompanies}
        columns={companyColumns}
        rowKey={c => c.id}
        search={{ value: search, onChange: setSearch, placeholder: 'Search companies' }}
        toolbar={
          <ToolbarSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />
        }
        emptyMessage="No companies match your search."
      />
    </div>
  );
}
