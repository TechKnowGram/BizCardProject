'use client';

import AdminTemplateCollection from '@/components/admin/AdminTemplateCollection';
import { PageHeader } from '@/components/dashboard/Surface';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminTemplatesPage() {
  const { data, busy, mutate, saveDesign } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Shared card designs, and designs companies have made for themselves."
      />
      <AdminTemplateCollection
        data={data}
        busy={busy}
        onSave={saveDesign}
        onToggle={template =>
          mutate(`/admin/templates/${template.id}`, { is_active: !template.is_active })
        }
      />
    </div>
  );
}
