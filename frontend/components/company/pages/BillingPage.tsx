'use client';

import BillingTab from '@/components/company/BillingTab';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyBillingPage() {
  const { company, orders, totalSpend, companySponsoredOrders, companySponsoredTotal, selfPaidOrders, selfPaidTotal } = useCompany();
  return (
    <BillingTab
      company={company}
      orders={orders}
      totalSpend={totalSpend}
      companySponsoredTotal={companySponsoredTotal}
      companySponsoredCount={companySponsoredOrders.length}
      selfPaidTotal={selfPaidTotal}
      selfPaidCount={selfPaidOrders.length}
    />
  );
}
