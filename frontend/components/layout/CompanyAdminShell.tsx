'use client';

import type { ReactNode } from 'react';
import WorkspaceShell from '@/components/layout/WorkspaceShell';
import type { User } from '@/lib/types';

export type NavigationItem = readonly [string, string, string];

/** Tabs listed under "Account" at the bottom of the sidebar. */
const ACCOUNT_TABS = ['profile', 'billing', 'settings'];

export interface CompanyAdminShellProps {
  user: Pick<User, 'role' | 'username' | 'has_avatar' | 'avatar_version'>;
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
    section: ACCOUNT_TABS.includes(id) ? ('account' as const) : ('main' as const),
  }));

  return (
    <WorkspaceShell
      username={user.username}
      avatarVersion={user.has_avatar ? user.avatar_version ?? 0 : null}
      roleLabel="Company admin"
      workspaceLabel={companyName}
      workspaceStatus={companyStatus}
      navigation={items}
      activeTab={activeTab}
      onNavigate={onNavigate}
      onLogout={onLogout}
      profileTab={navigation.some(([id]) => id === 'profile') ? 'profile' : undefined}
      storageKey="bizcard_co_sidebar_collapsed"
    >
      {children}
    </WorkspaceShell>
  );
}
