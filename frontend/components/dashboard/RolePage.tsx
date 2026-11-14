'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@/lib/types';

/** Lets a page tell the dashboard the signed-in user changed (name, email) so the header and menu update at once. */
export const UserUpdateContext = createContext<(user: User) => void>(() => {});

export function useUpdateUser() {
  return useContext(UserUpdateContext);
}

export type DashboardRole = 'admin' | 'company' | 'employee';

export const RoleContext = createContext<DashboardRole | null>(null);

/** The signed-in user's role, set by DashboardPanel. */
export function useDashboardRole() {
  return useContext(RoleContext);
}

/**
 * A menu page that exists for more than one role (for example /dashboard/requests).
 * Pass each role's page; only the signed-in user's one is shown.
 */
export default function RolePage({ admin, company, employee }: { admin?: ReactNode; company?: ReactNode; employee?: ReactNode }) {
  const role = useDashboardRole();
  if (role === 'admin') return <>{admin}</>;
  if (role === 'company') return <>{company}</>;
  if (role === 'employee') return <>{employee}</>;
  return null;
}
