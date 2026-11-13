'use client';

import type { ReactNode } from 'react';
import WorkspaceShell from '@/components/WorkspaceShell';
import type { User } from '@/lib/types';

export type NavigationItem = readonly [string, string, string];

export interface SystemAdminShellProps {
  user: Pick<User, 'role' | 'username' | 'email'>;
  pendingCompaniesCount?: number;
  pendingRequestsCount?: number;
  navigation: ReadonlyArray<NavigationItem>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children?: ReactNode;
}

export default function SystemAdminShell({
  user,
  pendingCompaniesCount = 0,
  pendingRequestsCount = 0,
  navigation,
  activeTab,
  onNavigate,
  onLogout,
  children,
}: SystemAdminShellProps) {
  const items = navigation.map(([id, icon, label]) => ({
    id,
    icon,
    label,
    badge: id === 'companies' ? pendingCompaniesCount : id === 'requests' ? pendingRequestsCount : 0,
    section: id === 'settings' ? ('account' as const) : ('main' as const),
  }));

  return (
    <WorkspaceShell
      username={user.username}
      roleLabel="Platform admin"
      workspaceLabel="BizCard platform"
      navigation={items}
      activeTab={activeTab}
      onNavigate={onNavigate}
      onLogout={onLogout}
      profileTab="settings"
      storageKey="bizcard_sys_sidebar_collapsed"
    >
      {children}
    </WorkspaceShell>
  );
}
