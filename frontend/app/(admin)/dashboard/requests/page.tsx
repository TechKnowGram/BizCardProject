import RolePage from '@/components/dashboard/RolePage';
import AdminRequestsPage from '@/components/admin/pages/RequestsPage';
import CompanyRequestsPage from '@/components/company/pages/RequestsPage';

export default function RequestsPage() {
  return <RolePage admin={<AdminRequestsPage />} company={<CompanyRequestsPage />} />;
}
