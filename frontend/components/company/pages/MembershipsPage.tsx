'use client';

import MembershipsTab from '@/components/company/MembershipsTab';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyMembershipsPage() {
  const { memberships, membershipFilter, setMembershipFilter, busy, decideMembership } = useCompany();
  return (
    <MembershipsTab
      memberships={memberships}
      membershipFilter={membershipFilter}
      setMembershipFilter={setMembershipFilter}
      busy={busy}
      onDecide={decideMembership}
    />
  );
}
