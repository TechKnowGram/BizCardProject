import RolePage from '@/components/dashboard/RolePage';
import AdminSettingsPage from '@/components/admin/pages/SettingsPage';
import CompanySettingsPage from '@/components/company/pages/SettingsPage';

export default function SettingsPage() {
  return <RolePage admin={<AdminSettingsPage />} company={<CompanySettingsPage />} />;
}
