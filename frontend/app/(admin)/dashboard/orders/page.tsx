import RolePage from '@/components/dashboard/RolePage';
import EmployeeOrdersPage from '@/components/employee/pages/OrdersPage';

export default function OrdersPage() {
  return <RolePage employee={<EmployeeOrdersPage />} />;
}
