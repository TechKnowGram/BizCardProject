import RolePage from '@/components/dashboard/RolePage';
import AdminTemplateCreatePage from '@/components/admin/pages/TemplateCreatePage';

export default function CreateTemplatePage() {
  return <RolePage admin={<AdminTemplateCreatePage />} />;
}
