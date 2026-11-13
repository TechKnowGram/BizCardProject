'use client';

import type { ReactNode } from 'react';
import WorkspaceShell from '@/components/WorkspaceShell';
import type { User } from '@/lib/types';

export type NavigationItem = readonly [string, string, string];

export interface CompanyAdminShellProps {
  user: Pick<User, 'role' | 'username'>;
  companyName?: string;
  companyStatus?: string;
  pendingMembershipsCount?: number;
  pendingRequestsCount?: number;
  navigation: ReadonlyArray<NavigationItem>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children?: ReactNode;
}

export default function CompanyAdminShell({
  user,
  companyName = 'Company workspace',
  companyStatus = 'APPROVED',
  pendingMembershipsCount = 0,
  pendingRequestsCount = 0,
  navigation,
  activeTab,
  onNavigate,
  onLogout,
  children,
}: CompanyAdminShellProps) {
  const items = navigation.map(([id, icon, label]) => ({
    id,
    icon,
    label,
    badge: id === 'memberships' ? pendingMembershipsCount : id === 'requests' ? pendingRequestsCount : 0,
  }));

  return (
    <WorkspaceShell
      username={user.username}
      roleLabel="Company admin"
      workspaceLabel={companyName}
      workspaceStatus={companyStatus}
      navigation={items}
      activeTab={activeTab}
      onNavigate={onNavigate}
      onLogout={onLogout}
      storageKey="bizcard_co_sidebar_collapsed"
    >
      {children}
    </WorkspaceShell>
  );
}
