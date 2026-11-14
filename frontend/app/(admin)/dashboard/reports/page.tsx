import RolePage from '@/components/dashboard/RolePage';
import AdminReportsPage from '@/components/admin/pages/ReportsPage';

export default function ReportsPage() {
  return <RolePage admin={<AdminReportsPage />} />;
}
