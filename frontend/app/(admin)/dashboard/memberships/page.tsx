import RolePage from '@/components/dashboard/RolePage';
import CompanyMembershipsPage from '@/components/company/pages/MembershipsPage';

export default function MembershipsPage() {
  return <RolePage company={<CompanyMembershipsPage />} />;
}
