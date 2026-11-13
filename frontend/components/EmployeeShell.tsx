'use client';

import type { ReactNode } from 'react';
import WorkspaceShell from '@/components/WorkspaceShell';
import type { User } from '@/lib/types';

export interface EmployeeShellProps {
  user: Pick<User, 'username' | 'email'>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export const EMPLOYEE_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'profile', label: 'My profile', icon: 'users' },
  { id: 'company', label: 'Company', icon: 'company' },
  { id: 'card', label: 'My card', icon: 'card' },
  { id: 'orders', label: 'Orders', icon: 'orders' },
  { id: 'help', label: 'Help', icon: 'help' },
] as const;

export default function EmployeeShell({ user, activeTab, onNavigate, onLogout, children }: EmployeeShellProps) {
  return (
    <WorkspaceShell
      username={user.username}
      roleLabel="Employee"
      workspaceLabel="My workspace"
      navigation={EMPLOYEE_NAV_ITEMS}
      activeTab={activeTab}
      onNavigate={onNavigate}
      onLogout={onLogout}
      storageKey="bizcard_emp_sidebar_collapsed"
    >
      {children}
    </WorkspaceShell>
  );
}
