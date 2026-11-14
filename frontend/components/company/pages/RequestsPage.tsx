'use client';

import { downloadOrReport } from '@/lib/api';
import OrdersTab from '@/components/company/OrdersTab';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyRequestsPage() {
  const { requests, orders, ordersSubView, setOrdersSubView, setError, createRequest, openRequest } = useCompany();
  return (
    <OrdersTab
      requests={requests}
      orders={orders}
      view={ordersSubView}
      setView={setOrdersSubView}
      onCreateRequest={createRequest}
      onOpenRequest={openRequest}
      onDownload={(path: string, name: string) => downloadOrReport(path, name, setError)}
    />
  );
}
