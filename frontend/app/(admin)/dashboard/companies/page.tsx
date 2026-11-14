import RolePage from '@/components/dashboard/RolePage';
import AdminCompaniesPage from '@/components/admin/pages/CompaniesPage';

export default function CompaniesPage() {
  return <RolePage admin={<AdminCompaniesPage />} />;
}
