import RolePage from '@/components/dashboard/RolePage';
import EmployeeHelpPage from '@/components/employee/pages/HelpPage';

export default function HelpPage() {
  return <RolePage employee={<EmployeeHelpPage />} />;
}
