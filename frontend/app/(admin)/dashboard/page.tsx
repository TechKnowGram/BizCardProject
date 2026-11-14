import RolePage from '@/components/dashboard/RolePage';
import AdminOverviewPage from '@/components/admin/pages/OverviewPage';
import CompanyOverviewPage from '@/components/company/pages/OverviewPage';
import EmployeeOverviewPage from '@/components/employee/pages/OverviewPage';

export default function OverviewPage() {
  return <RolePage admin={<AdminOverviewPage />} company={<CompanyOverviewPage />} employee={<EmployeeOverviewPage />} />;
}
