'use client';

import type { Company } from '@/lib/types';
import DataTable from '@/components/dashboard/DataTable';
import { PageHeader, SectionCard, StatTile } from '@/components/dashboard/Surface';
import { formatTaka } from '@/components/company/CompanyDashboardParts';
import { orderColumns } from '@/components/company/OrdersTab';

export interface BillingTabProps {
  company: Company;
  orders: any[];
  totalSpend: number;
  companySponsoredTotal: number;
  companySponsoredCount: number;
  selfPaidTotal: number;
  selfPaidCount: number;
}

export default function BillingTab({ company, orders, totalSpend, companySponsoredTotal, companySponsoredCount, selfPaidTotal, selfPaidCount }: BillingTabProps) {
  const plan: Array<[string, string, string]> = [
    ['Pricing', 'Pay as you go', '৳50 per card. No subscription fee and no minimum order.'],
    ['Included', 'Print-ready PDF', 'Every approved card is generated as a 3.5 × 2 in vector PDF.'],
    ['Billed to', company.name, `Workspace #${company.id}`],
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="What your company and your employees have spent on cards." />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatTile label="Total spend" value={formatTaka(totalSpend)} hint={`${orders.length} order${orders.length === 1 ? '' : 's'}`} />
        <StatTile label="Paid by the company" value={formatTaka(companySponsoredTotal)} hint={`${companySponsoredCount} order${companySponsoredCount === 1 ? '' : 's'}`} />
        <StatTile label="Paid by employees" value={formatTaka(selfPaidTotal)} hint={`${selfPaidCount} order${selfPaidCount === 1 ? '' : 's'}`} />
      </div>

      <SectionCard title="Plan">
        <dl className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
          {plan.map(([label, value, note]) => (
            <div key={label} className="py-4 first:pt-0 md:px-6 md:py-0 md:first:pl-0 md:last:pr-0">
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="mt-1 text-base font-semibold text-navy-900">{value}</dd>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">{note}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <DataTable
        rows={orders}
        columns={orderColumns}
        rowKey={(o) => o.id}
        title="Invoices"
        description="Each card order, who paid for it and its status."
        emptyMessage="Invoices for card orders will appear here once an order is placed."
      />
    </div>
  );
}
