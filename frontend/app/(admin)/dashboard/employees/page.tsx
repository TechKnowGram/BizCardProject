import RolePage from '@/components/dashboard/RolePage';
import CompanyEmployeesPage from '@/components/company/pages/EmployeesPage';

export default function EmployeesPage() {
  return <RolePage company={<CompanyEmployeesPage />} />;
}
