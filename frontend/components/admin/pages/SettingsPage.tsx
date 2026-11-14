'use client';

import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { useAdmin } from '@/components/admin/AdminDashboard';

export default function AdminSettingsPage() {
  const { user } = useAdmin();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your account and the format cards are produced in." />

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Your account">
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-2.5 first:pt-0"><dt className="text-slate-500">Name</dt><dd className="font-medium text-navy-900">{user.username}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Email</dt><dd className="truncate text-slate-700">{user.email}</dd></div>
            <div className="flex justify-between gap-4 py-2.5 last:pb-0"><dt className="text-slate-500">Role</dt><dd className="font-medium text-navy-900">Platform admin</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Card output">
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-2.5 first:pt-0"><dt className="text-slate-500">File</dt><dd className="font-medium text-navy-900">Vector PDF</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">Size</dt><dd className="font-medium text-navy-900">3.5 × 2 in</dd></div>
            <div className="flex justify-between gap-4 py-2.5 last:pb-0"><dt className="text-slate-500">Verification</dt><dd className="font-medium text-navy-900">QR code on every card</dd></div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
