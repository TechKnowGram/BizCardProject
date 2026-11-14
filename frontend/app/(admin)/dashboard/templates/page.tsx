import RolePage from '@/components/dashboard/RolePage';
import AdminTemplatesPage from '@/components/admin/pages/TemplatesPage';
import CompanyTemplatesPage from '@/components/company/pages/TemplatesPage';

export default function TemplatesPage() {
  return <RolePage admin={<AdminTemplatesPage />} company={<CompanyTemplatesPage />} />;
}
