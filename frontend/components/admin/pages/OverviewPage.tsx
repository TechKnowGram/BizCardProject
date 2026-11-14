'use client';

import AdminOverview from '@/components/admin/AdminOverview';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminOverviewPage() {
  const { setTab, data, openReview, pendingCompanies, pendingRequests, attentionQueue, usersHint } = useAdmin();
  return (
    <AdminOverview
      companies={data.companies}
      requests={data.requests}
      audits={data.audits}
      userCount={data.users.length || data.stats.total_users || 0}
      userHint={usersHint}
      generatedCards={data.stats.generated_cards ?? 0}
      pendingCompanies={pendingCompanies.length}
      pendingRequests={pendingRequests.length}
      queue={attentionQueue}
      onReview={item => openReview(item.raw, item.kind)}
      setTab={setTab}
    />
  );
}
