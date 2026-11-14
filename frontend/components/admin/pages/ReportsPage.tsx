'use client';

import { PageHeader } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminReportsPage() {
  const { search, setSearch, filteredAudits, auditColumns } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="Approvals, rejections, orders and other changes, newest first."
      />
      <DataTable
        title="All activity"
        rows={filteredAudits}
        columns={auditColumns}
        rowKey={a => a.id}
        search={{ value: search, onChange: setSearch, placeholder: 'Search event or details' }}
        initialPageSize={25}
        emptyMessage="No activity matches your search."
      />
    </div>
  );
}
