'use client';

import { PageHeader, StatTile, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import { money, plural } from '@/components/admin/format';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminPaymentsPage() {
  const { data, search, setSearch, payerFilter, setPayerFilter, filteredPayments, totalPaymentsSpend, companySponsoredSpend, individualSpend, paymentColumns } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Card orders and who paid for them."
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <StatTile label="Total" value={money(totalPaymentsSpend || data.stats.total_revenue || 0)} hint={plural(data.payments.length, 'order')} />
        <StatTile
          label="Paid by companies"
          value={money(companySponsoredSpend)}
          hint={plural(data.payments.filter(p => p.payer === 'COMPANY').length, 'order')}
        />
        <StatTile
          label="Paid by employees"
          value={money(individualSpend)}
          hint={plural(data.payments.filter(p => p.payer === 'INDIVIDUAL').length, 'order')}
        />
      </div>

      <DataTable
        title="Orders"
        rows={filteredPayments}
        columns={paymentColumns}
        rowKey={p => p.id}
        search={{ value: search, onChange: setSearch, placeholder: 'Search order or company' }}
        toolbar={
          <ToolbarSelect
            label="Paid by"
            value={payerFilter}
            onChange={setPayerFilter}
            options={[
              { value: 'ALL', label: 'Everyone' },
              { value: 'COMPANY', label: 'Paid by company' },
              { value: 'INDIVIDUAL', label: 'Paid by employee' },
            ]}
          />
        }
        emptyMessage="Paid card orders will appear here."
      />
    </div>
  );
}
