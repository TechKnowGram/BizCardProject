import RolePage from '@/components/dashboard/RolePage';
import AdminUsersPage from '@/components/admin/pages/UsersPage';

export default function UsersPage() {
  return <RolePage admin={<AdminUsersPage />} />;
}
