import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import DashboardPanel from '@/components/dashboard/DashboardPanel';

export const metadata: Metadata = { title: 'Workspace', robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardPanel>{children}</DashboardPanel>;
}
