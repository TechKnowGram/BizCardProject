import RolePage from '@/components/dashboard/RolePage';
import EmployeeCompanyPage from '@/components/employee/pages/CompanyPage';

export default function CompanyPage() {
  return <RolePage employee={<EmployeeCompanyPage />} />;
}
