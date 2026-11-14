import RolePage from '@/components/dashboard/RolePage';
import EmployeeCardPage from '@/components/employee/pages/CardPage';

export default function CardPage() {
  return <RolePage employee={<EmployeeCardPage />} />;
}
