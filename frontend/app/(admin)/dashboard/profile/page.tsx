import RolePage from '@/components/dashboard/RolePage';
import CompanyProfilePage from '@/components/company/pages/ProfilePage';
import EmployeeProfilePage from '@/components/employee/pages/ProfilePage';

export default function ProfilePage() {
  return <RolePage company={<CompanyProfilePage />} employee={<EmployeeProfilePage />} />;
}
