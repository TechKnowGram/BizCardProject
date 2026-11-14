'use client';

import { useState } from 'react';
import CardStudio from '@/components/cards/CardStudio';
import DesignUploader from '@/components/company/DesignUploader';
import IllustratorUpload from '@/components/company/IllustratorUpload';
import { Notice } from '@/components/ui';
import type { IllustratorAnalysis } from '@/lib/types';
import { PageHeader } from '@/components/dashboard/Surface';
import { useCompany } from '@/components/company/CompanyDashboard';

export default function CompanyTemplatesPage() {
  const { company, employees, templates, busy, load, selectTemplate } = useCompany();
  const [incoming, setIncoming] = useState<{ result: IllustratorAnalysis; fileName: string } | null>(null);
  const [uploadError, setUploadError] = useState('');
  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Upload your own card design, check it, then choose the one your company uses for new card requests."
        actions={<IllustratorUpload companyId={company.id} onAnalysed={(result, fileName) => { setUploadError(''); setIncoming({ result, fileName }); }} onError={setUploadError} />}
      />
      {uploadError && <Notice tone="error">{uploadError}</Notice>}
      <CardStudio
        company={company}
        employees={employees}
        templates={templates}
        templateId={company.selected_template_id}
        onChoose={selectTemplate}
        busy={busy}
      />
      <DesignUploader
        company={company}
        employees={employees}
        incoming={incoming}
        onIncomingUsed={() => setIncoming(null)}
        onSaved={async () => {
          await load();
        }}
      />
    </div>
  );
}
