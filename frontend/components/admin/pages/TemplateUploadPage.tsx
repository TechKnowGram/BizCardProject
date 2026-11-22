'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DesignUploader from '@/components/company/DesignUploader';
import IllustratorUpload from '@/components/company/IllustratorUpload';
import { PageHeader } from '@/components/dashboard/Surface';
import { useAdmin } from '@/components/admin/AdminDashboard';
import { WORKSPACE_KEY } from '@/components/admin/IllustratorWorkspace';
import { Notice, buttonClass } from '@/components/ui';
import type { CompanySummary, IllustratorAnalysis } from '@/lib/types';

// Shared templates belong to the platform, not a company; id 0 is the platform's shared folder.
const PLATFORM: CompanySummary = { id: 0, name: 'Your company', status: 'APPROVED', selected_template_id: null };

export default function AdminTemplateUploadPage() {
  const router = useRouter();
  const { load } = useAdmin();
  const [uploadError, setUploadError] = useState('');
  // An Illustrator file opens in the workspace, where the artboards can be checked and edited.
  function openWorkspace(result: IllustratorAnalysis, fileName: string) {
    try {
      sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify({ result, fileName }));
    } catch {
      setUploadError('Your browser blocked the workspace. Allow site storage and try again.');
      return;
    }
    router.push('/dashboard/templates/upload/workspace');
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload a template"
        description="Upload a finished card design (PNG, JPG, WebP, Photoshop PSD or Illustrator). Check the fields we found, then save it as a shared template every approved company can use."
        actions={
          <div className="flex flex-wrap gap-2">
            <IllustratorUpload companyId={0} onAnalysed={openWorkspace} onError={setUploadError} />
            <Link href="/dashboard/templates" className={buttonClass('secondary')}>Back to templates</Link>
          </div>
        }
      />
      {uploadError && <Notice tone="error">{uploadError}</Notice>}
      <DesignUploader
        company={PLATFORM}
        employees={[]}
        onIllustrator={openWorkspace}
        onSaved={async () => {
          await load();
          router.push('/dashboard/templates');
        }}
      />
    </div>
  );
}
