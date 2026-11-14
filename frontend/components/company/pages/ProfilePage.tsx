'use client';

import CompanyProfilePanel from '@/components/company/CompanyProfilePanel';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyProfilePage() {
  const { company, setMessage, load } = useCompany();
  return (
<CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
  );
}
