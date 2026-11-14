'use client';

import { downloadOrReport } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/Icon';
import { Button, buttonClass } from '@/components/ui';
import { CardLink, PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { EmptyNote, cardDownloadPath, formatDate, formatSize } from '@/components/employee/shared';
import { useEmployee } from '@/components/employee/EmployeeDashboard';

export default function EmployeeOverviewPage() {
  const { setTab, cards, personal, orders, setCardSubView, order, setError, membershipState, cardRows, latestCard, employeeName, goToOrderCompanyCards, goToSavedCards, toast, joinDialog, statusLine, membershipSummary, orderKind } = useEmployee();
return (
  <div className="space-y-6">
    {toast}
    <PageHeader
      title={`Hi, ${employeeName}`}
      description={statusLine}
      actions={<Button onClick={() => { setTab?.('card'); setCardSubView('order'); }}>Order cards</Button>}
    />

    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      <SectionCard title="Your card" action={latestCard ? <CardLink onClick={goToSavedCards}>All saved cards ({cardRows.length})</CardLink> : undefined}>
        {latestCard ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name="card" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-navy-900">{latestCard.file_name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {latestCard.kind === 'personal' ? 'Personal card' : 'Company card'} · {formatDate(latestCard.created_at)} · {formatSize(latestCard.file_size)}
                </p>
              </div>
              <StatusBadge value={latestCard.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => downloadOrReport(cardDownloadPath(latestCard), latestCard.file_name, setError)}>Download PDF</Button>
              {latestCard.kind !== 'personal' && latestCard.verification_token && (
                <a href={`/verify/${latestCard.verification_token}`} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
                  Verify card
                </a>
              )}
              <span className="text-xs text-slate-500">Vector PDF, 3.5 × 2 in</span>
            </div>
          </div>
        ) : (
          <EmptyNote action={<Button onClick={() => { setTab?.('card'); setCardSubView('order'); }}>Create your card</Button>}>
            Your card will appear here after your first order.
          </EmptyNote>
        )}
      </SectionCard>

      <SectionCard title="Company" action={membershipState === 'ACTIVE' ? <CardLink onClick={() => setTab?.('company')}>View company</CardLink> : undefined}>
        {membershipSummary()}
        {membershipState === 'ACTIVE' ? (
          <Button variant="secondary" className="mt-5" onClick={goToOrderCompanyCards}>
            Order company cards
          </Button>
        ) : membershipState !== 'PENDING' ? (
          <Button variant="secondary" className="mt-5" onClick={() => setTab?.('company')}>
            Find your company
          </Button>
        ) : null}
      </SectionCard>
    </div>

    <SectionCard title="Recent orders" action={orders.length > 0 ? <CardLink onClick={() => setTab?.('orders')}>View all orders</CardLink> : undefined} bodyClassName={orders.length ? 'px-0 pb-2' : undefined}>
      {orders.length > 0 ? (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {orders.slice(0, 5).map(o => (
            <li key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3 text-sm">
              <span className="w-20 font-medium text-navy-900 tabular-nums">#{o.id}</span>
              <span className="w-24 text-slate-600">{orderKind(o) === 'personal' ? 'Personal' : 'Company'}</span>
              <span className="w-20 text-slate-600 tabular-nums">
                {o.quantity} {o.quantity === 1 ? 'card' : 'cards'}
              </span>
              <span className="hidden w-28 text-slate-500 sm:inline">{formatDate(o.created_at)}</span>
              <span className="ml-auto flex items-center gap-4">
                <span className="font-medium text-navy-900 tabular-nums">৳{o.total_amount}</span>
                <StatusBadge value={o.status} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>Your orders will appear here after you order cards.</EmptyNote>
      )}
    </SectionCard>

    {joinDialog}
  </div>
);
}
