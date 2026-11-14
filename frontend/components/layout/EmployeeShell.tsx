'use client';

import type { ReactNode } from 'react';
import WorkspaceShell from '@/components/layout/WorkspaceShell';
import type { User } from '@/lib/types';

export interface EmployeeShellProps {
  user: Pick<User, 'username' | 'has_avatar' | 'avatar_version' | 'email'>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export const EMPLOYEE_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'profile', label: 'My profile', icon: 'users', section: 'account' },
  { id: 'company', label: 'Company', icon: 'company' },
  { id: 'card', label: 'My card', icon: 'card' },
  { id: 'orders', label: 'Orders', icon: 'orders' },
  { id: 'help', label: 'Help', icon: 'help', section: 'account' },
] as const;

export default function EmployeeShell({ user, activeTab, onNavigate, onLogout, children }: EmployeeShellProps) {
  return (
    <WorkspaceShell
      username={user.username}
      avatarVersion={user.has_avatar ? user.avatar_version ?? 0 : null}
      roleLabel="Employee"
      workspaceLabel="My workspace"
      navigation={EMPLOYEE_NAV_ITEMS}
      activeTab={activeTab}
      onNavigate={onNavigate}
      onLogout={onLogout}
      profileTab="profile"
      storageKey="bizcard_emp_sidebar_collapsed"
    >
      {children}
    </WorkspaceShell>
  );
}
