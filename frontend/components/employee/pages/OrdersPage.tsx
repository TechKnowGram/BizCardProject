'use client';

import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui';
import { CardLink, PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { formatDate, payerText } from '@/components/employee/shared';
import { useEmployee } from '@/components/employee/EmployeeDashboard';

export default function EmployeeOrdersPage() {
  const { setTab, cards, personal, orders, orderSearch, setOrderSearch, orderType, setOrderType, setCardSubView, order, companyNameById, goToSavedCards, toast, orderKind } = useEmployee();
  const q = orderSearch.trim().toLowerCase().replace(/^#/, '');
  const orderRows = orders.filter(
    o =>
      (orderType === 'all' || orderKind(o) === orderType) &&
      (!q || String(o.id).includes(q) || companyNameById(o.company_id).toLowerCase().includes(q))
  );

  const orderColumns: Column<any>[] = [
    { key: 'id', header: 'Order #', sortValue: o => o.id, render: o => <span className="font-medium text-navy-900 tabular-nums">#{o.id}</span> },
    {
      key: 'type',
      header: 'Type',
      sortValue: o => orderKind(o),
      render: o =>
        orderKind(o) === 'personal' ? (
          'Personal'
        ) : (
          <div className="min-w-0">
            <p>Company</p>
            {companyNameById(o.company_id) && <p className="truncate text-xs text-slate-500">{companyNameById(o.company_id)}</p>}
          </div>
        ),
    },
    { key: 'cards', header: 'Cards', align: 'right', sortValue: o => o.quantity, render: o => <span className="tabular-nums">{o.quantity}</span> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: o => Number(o.total_amount),
      render: o => (
        <div>
          <p className="font-medium text-navy-900 tabular-nums">৳{o.total_amount}</p>
          <p className="text-xs text-slate-500 tabular-nums">
            {o.quantity} × ৳{o.unit_price}
          </p>
        </div>
      ),
    },
    { key: 'payer', header: 'Payer', render: o => payerText(o.payer) },
    { key: 'status', header: 'Status', render: o => <StatusBadge value={o.status} /> },
    { key: 'date', header: 'Date', sortValue: o => new Date(o.created_at).getTime(), render: o => <span className="whitespace-nowrap">{formatDate(o.created_at)}</span> },
    { key: 'action', header: 'Action', align: 'right', render: () => <CardLink onClick={goToSavedCards}>View cards</CardLink> },
  ];

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title="Orders"
        description="All card orders you have placed, personal and company."
        actions={<Button onClick={() => { setTab?.('card'); setCardSubView('order'); }}>New order</Button>}
      />
      <DataTable
        rows={orderRows}
        columns={orderColumns}
        rowKey={o => o.id}
        search={{ value: orderSearch, onChange: setOrderSearch, placeholder: 'Search order # or company' }}
        toolbar={
          <ToolbarSelect
            label="Order type"
            value={orderType}
            onChange={setOrderType}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'personal', label: 'Personal' },
              { value: 'company', label: 'Company' },
            ]}
          />
        }
        emptyMessage={orders.length ? 'No orders match your filters.' : 'Your orders will appear here after you order cards.'}
      />
    </div>
  );
}
