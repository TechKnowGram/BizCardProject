'use client';

import type { CardRequest } from '@/lib/types';
import DataTable, { type Column } from '@/components/dashboard/DataTable';
import { PageHeader } from '@/components/dashboard/Surface';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui';
import { Segmented, cellNoteClass, formatDate, formatTaka, rowButtonClass } from '@/components/CompanyDashboardParts';

/** Columns for employee card orders, shared with the Billing tab. */
export const orderColumns: Column<any>[] = [
  {
    key: 'id',
    header: 'Order',
    sortValue: (o) => Number(o.id),
    render: (o) => (
      <>
        <span className="block font-medium text-navy-900">#{o.id}</span>
        <span className={cellNoteClass}>{formatDate(o.created_at)}</span>
      </>
    ),
  },
  {
    key: 'quantity',
    header: 'Quantity',
    sortValue: (o) => Number(o.quantity) || 0,
    render: (o) => `${o.quantity} ${o.quantity === 1 ? 'card' : 'cards'}`,
  },
  {
    key: 'payer',
    header: 'Paid by',
    sortValue: (o) => o.payer,
    render: (o) => (o.payer === 'COMPANY' ? 'Company' : 'Employee'),
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortValue: (o) => Number(o.total_amount) || 0,
    render: (o) => <span className="font-medium text-navy-900 tabular-nums">{formatTaka(o.total_amount)}</span>,
  },
  { key: 'status', header: 'Status', sortValue: (o) => o.status, render: (o) => <StatusBadge value={o.status} /> },
];

export interface OrdersTabProps {
  requests: CardRequest[];
  orders: any[];
  view: 'requests' | 'checkouts';
  setView: (view: 'requests' | 'checkouts') => void;
  onCreateRequest: () => void;
  onOpenRequest: (request: CardRequest) => void;
  onDownload: (path: string, filename: string) => void;
}

export default function OrdersTab({ requests, orders, view, setView, onCreateRequest, onOpenRequest, onDownload }: OrdersTabProps) {
  const requestColumns: Column<CardRequest>[] = [
    {
      key: 'id',
      header: 'Request',
      sortValue: (r) => r.id,
      render: (r) => (
        <>
          <span className="block font-medium text-navy-900">#{r.id}</span>
          <span className={cellNoteClass}>{formatDate(r.created_at)}</span>
        </>
      ),
    },
    {
      key: 'employees',
      header: 'Employees',
      sortValue: (r) => r.items.length,
      render: (r) => `${r.items.length} employee${r.items.length === 1 ? '' : 's'}`,
    },
    {
      key: 'template',
      header: 'Template',
      hideOnMobile: true,
      render: (r) => r.template?.name || `Template #${r.template_id}`,
    },
    { key: 'status', header: 'Status', sortValue: (r) => r.status, render: (r) => <StatusBadge value={r.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="secondary" className={rowButtonClass} onClick={() => onOpenRequest(r)}>View details</Button>
          {r.status === 'COMPLETED' && (
            <Button className={rowButtonClass} onClick={() => onDownload(`/card-requests/${r.id}/cards/download`, `card-request-${r.id}.zip`)}>
              Download ZIP
            </Button>
          )}
        </div>
      ),
    },
  ];

  const switcher = (
    <Segmented
      label="Order type"
      value={view}
      onChange={setView}
      options={[
        { value: 'requests', label: `Card requests (${requests.length})` },
        { value: 'checkouts', label: `Employee orders (${orders.length})` },
      ]}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Card orders"
        description="Track the card requests you send for your team and the orders employees place themselves."
        actions={<Button onClick={onCreateRequest}>New card request</Button>}
      />

      {view === 'requests' ? (
        <DataTable
          key="requests"
          rows={requests}
          columns={requestColumns}
          rowKey={(r) => r.id}
          title="Card requests"
          description="Requests are reviewed by the platform team. Cards can be downloaded once completed."
          toolbar={switcher}
          emptyMessage="No card requests yet. Select employees on the Employees page or start a new request."
        />
      ) : (
        <DataTable
          key="checkouts"
          rows={orders}
          columns={orderColumns}
          rowKey={(o) => o.id}
          title="Employee orders"
          description="Orders placed by your employees, paid by the company or by themselves."
          toolbar={switcher}
          emptyMessage="Orders placed by your employees will appear here."
        />
      )}
    </div>
  );
}
