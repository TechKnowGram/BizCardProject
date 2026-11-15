import RolePage from '@/components/dashboard/RolePage';
import AdminTemplateUploadPage from '@/components/admin/pages/TemplateUploadPage';

export default function UploadTemplatePage() {
  return <RolePage admin={<AdminTemplateUploadPage />} />;
}
