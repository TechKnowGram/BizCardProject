'use client';

import { useCallback, useEffect, useState } from 'react';
import DataTable from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { ToolbarSelect } from '@/components/dashboard/Surface';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button, inputClass } from '@/components/ui';
import { api, getToken } from '@/lib/api';
import type { ApiError } from '@/lib/api';

interface PersonalOrder {
  id: number;
  status: string;
  quantity: number;
  total_amount: number;
  created_at: string;
  user_name: string;
  user_email: string;
  name: string;
  designation: string;
  phone: string;
  design_name: string;
  rejection_reason?: string | null;
}

const dateText = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Personal card orders from employees. Same rule as company card requests: approve first
 * (the cards are generated then), the employee pays, and only then can they download.
 */
export default function PersonalOrdersReview() {
  const [orders, setOrders] = useState<PersonalOrder[]>([]);
  const [status, setStatus] = useState('PENDING_APPROVAL');
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setOrders(await api<PersonalOrder[]>('/admin/personal-orders')); } catch (e) { setError((e as ApiError).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function preview(order: PersonalOrder) {
    setError('');
    const tab = window.open('', '_blank');
    try {
      const response = await fetch(`/api/admin/personal-orders/${order.id}/preview`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || 'The preview could not be made');
      const url = URL.createObjectURL(await response.blob());
      if (tab) tab.location.href = url; else window.open(url, '_blank');
    } catch (e) {
      tab?.close();
      setError((e as Error).message);
    }
  }

  async function decide(order: PersonalOrder, decision: 'APPROVED' | 'REJECTED') {
    if (decision === 'REJECTED' && !reason.trim()) { setError('Write a short reason so the employee knows what to fix.'); return; }
    setBusy(order.id); setError(''); setMessage('');
    try {
      await api(`/admin/personal-orders/${order.id}/decision`, { method: 'PATCH', body: JSON.stringify({ decision, reason: decision === 'REJECTED' ? reason.trim() : undefined }) });
      setMessage(decision === 'APPROVED' ? `Order #${order.id} approved. The cards are generated and the employee can now pay.` : `Order #${order.id} rejected. The employee has been told why.`);
      setRejecting(null); setReason('');
      await load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  const rows = orders.filter((o) => status === 'ALL' || o.status === status);
  const columns: Column<PersonalOrder>[] = [
    { key: 'id', header: 'Order #', sortValue: (o) => o.id, render: (o) => <span className="font-medium text-navy-900 tabular-nums">#{o.id}</span> },
    {
      key: 'person', header: 'Employee', sortValue: (o) => o.user_name, render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-navy-900">{o.name || o.user_name}</p>
          <p className="truncate text-xs text-slate-500">{[o.designation, o.user_email].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { key: 'design', header: 'Design', render: (o) => <span className="truncate">{o.design_name || '—'}</span> },
    { key: 'cards', header: 'Cards', align: 'right', sortValue: (o) => o.quantity, render: (o) => <span className="tabular-nums">{o.quantity}</span> },
    { key: 'amount', header: 'Amount', align: 'right', sortValue: (o) => o.total_amount, render: (o) => <span className="tabular-nums">৳{o.total_amount}</span> },
    {
      key: 'status', header: 'Status', render: (o) => (
        <div>
          <StatusBadge value={o.status} />
          {o.rejection_reason && <p className="mt-1 max-w-48 truncate text-xs text-red-700" title={o.rejection_reason}>{o.rejection_reason}</p>}
        </div>
      ),
    },
    { key: 'date', header: 'Date', sortValue: (o) => new Date(o.created_at).getTime(), render: (o) => <span className="whitespace-nowrap">{dateText(o.created_at)}</span> },
    {
      key: 'actions', header: 'Actions', align: 'right', render: (o) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="quiet" className="px-3 py-1.5 text-xs" onClick={() => preview(o)}>Preview</Button>
          {o.status === 'PENDING_APPROVAL' && (rejecting === o.id ? (
            <>
              <input className={`${inputClass} w-44 py-1.5 text-xs`} autoFocus placeholder="Reason for the employee" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} aria-label="Rejection reason" />
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy === o.id} onClick={() => decide(o, 'REJECTED')}>Reject</Button>
              <Button variant="quiet" className="px-2 py-1.5 text-xs" onClick={() => { setRejecting(null); setReason(''); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={busy === o.id} onClick={() => { setRejecting(o.id); setReason(''); }}>Reject</Button>
              <Button className="px-3 py-1.5 text-xs" disabled={busy === o.id} onClick={() => decide(o, 'APPROVED')}>{busy === o.id ? 'Approving…' : 'Approve'}</Button>
            </>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <DataTable
        title="Personal card orders"
        description="Employees' own cards on designs they uploaded. Preview the real card, then approve or reject. They pay after approval."
        rows={rows}
        columns={columns}
        rowKey={(o) => o.id}
        toolbar={
          <ToolbarSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'PENDING_APPROVAL', label: 'Awaiting approval' },
              { value: 'PENDING_PAYMENT', label: 'Awaiting payment' },
              { value: 'PAID', label: 'Paid' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'ALL', label: 'All statuses' },
            ]}
          />
        }
        emptyMessage={status === 'PENDING_APPROVAL' ? 'No personal orders are waiting for approval.' : 'No personal orders match this filter.'}
      />
    </div>
  );
}
