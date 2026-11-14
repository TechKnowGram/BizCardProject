import RolePage from '@/components/dashboard/RolePage';
import AdminPaymentsPage from '@/components/admin/pages/PaymentsPage';

export default function PaymentsPage() {
  return <RolePage admin={<AdminPaymentsPage />} />;
}
