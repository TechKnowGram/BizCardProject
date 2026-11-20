'use client';

import { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui';
import PaymentModal from '@/components/ui/PaymentModal';
import { CardLink, PageHeader, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { formatDate, payerText } from '@/components/employee/shared';
import { useEmployee } from '@/components/employee/EmployeeDashboard';

export default function EmployeeOrdersPage() {
  const { setTab, cards, personal, orders, orderSearch, setOrderSearch, orderType, setOrderType, setCardSubView, order, companyNameById, goToSavedCards, toast, orderKind, load, setMessage } = useEmployee();
  const [paymentOrder, setPaymentOrder] = useState<any | null>(null);
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
    {
      key: 'status',
      header: 'Status',
      render: o => (
        <div className="min-w-0">
          <StatusBadge value={o.status} />
          {o.status === 'REJECTED' && o.rejection_reason && <p className="mt-1 max-w-56 text-xs text-red-700" title={o.rejection_reason}>{o.rejection_reason}</p>}
        </div>
      ),
    },
    { key: 'date', header: 'Date', sortValue: o => new Date(o.created_at).getTime(), render: o => <span className="whitespace-nowrap">{formatDate(o.created_at)}</span> },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (o) =>
        o.status === 'PENDING_PAYMENT' ? (
          <Button className="px-3 py-1.5 text-xs" onClick={() => setPaymentOrder(o)}>
            Pay ৳{o.total_amount}
          </Button>
        ) : o.status === 'PENDING_APPROVAL' ? (
          <span className="text-xs text-slate-500">Pay after approval</span>
        ) : o.status === 'REJECTED' ? (
          <span className="text-xs text-slate-500">Not charged</span>
        ) : (
          <CardLink onClick={goToSavedCards}>View cards</CardLink>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title="Orders"
        description="Every order is checked by a system admin first. Once approved, pay to download your cards."
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

      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onSuccess={async () => {
            setMessage(`Payment for Order #${paymentOrder.id} confirmed successfully.`);
            await load();
          }}
        />
      )}
    </div>
  );
}
