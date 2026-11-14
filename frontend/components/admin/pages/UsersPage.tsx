'use client';

import type { Company } from '@/lib/types';
import { PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminUsersPage() {
  const { search, setSearch, roleFilter, setRoleFilter, filteredUsers, userColumns } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone with an account: platform admins, company admins and employees."
      />
      <DataTable
        title="All users"
        rows={filteredUsers}
        columns={userColumns}
        rowKey={u => u.id}
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email or company' }}
        toolbar={
          <ToolbarSelect
            label="Role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'ALL', label: 'All roles' },
              { value: 'SYSTEM_ADMIN', label: 'Platform admin' },
              { value: 'COMPANY_ADMIN', label: 'Company admin' },
              { value: 'EMPLOYEE', label: 'Employee' },
            ]}
          />
        }
        emptyMessage="No users match your search."
      />
    </div>
  );
}
