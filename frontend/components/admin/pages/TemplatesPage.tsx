'use client';

import Link from 'next/link';
import AdminTemplateCollection from '@/components/admin/AdminTemplateCollection';
import { buttonClass } from '@/components/ui';
import { PageHeader } from '@/components/dashboard/Surface';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminTemplatesPage() {
  const { data, busy, mutate, saveDesign } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Shared card designs, and designs companies have made for themselves."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/templates/create" className={buttonClass('secondary')}>Create template</Link>
            <Link href="/dashboard/templates/upload" className={buttonClass('primary')}>Upload template</Link>
          </div>
        }
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
