'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';
import CompanyDashboard from '@/components/company/CompanyDashboard';
import EmployeeDashboard from '@/components/employee/EmployeeDashboard';
import EmployeeShell from '@/components/layout/EmployeeShell';
import { RoleContext, UserUpdateContext } from '@/components/dashboard/RolePage';
import { api, getToken, logout } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

/** Menu pages each role can open. Each one is a folder under app/(admin)/dashboard. */
const ROLE_PAGES: Record<'admin' | 'company' | 'employee', readonly string[]> = {
  admin: ['overview', 'companies', 'users', 'requests', 'templates', 'payments', 'reports', 'settings'],
  company: ['overview', 'employees', 'memberships', 'requests', 'templates', 'profile', 'billing', 'settings'],
  employee: ['overview', 'profile', 'company', 'card', 'orders', 'help'],
};

const toPath = (tab: string) => (tab === 'overview' ? '/dashboard' : `/dashboard/${tab}`);

/**
 * Lives in the dashboard layout, so the signed-in user, sidebar and loaded data persist
 * while you move between menu pages. The page is read from the URL: /dashboard is the
 * overview, /dashboard/employees is "employees", and so on.
 */
export default function DashboardPanel({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] || 'overview';
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    api<User>('/auth/me').then(setUser).catch((requestError: ApiError) => {
      if (requestError.status === 401) { logout(); router.replace('/login'); }
      else setError(requestError.message);
    });
  }, [router]);

  const kind = user ? (user.role === 'SYSTEM_ADMIN' ? 'admin' : user.role === 'EMPLOYEE' ? 'employee' : 'company') : null;
  const allowed = kind ? ROLE_PAGES[kind].includes(tab) : true;

  // A page that exists but belongs to another role (e.g. an employee opening /dashboard/companies).
  useEffect(() => {
    if (kind && !allowed) router.replace('/dashboard');
  }, [kind, allowed, router]);

  function setTab(next: string) { router.push(toPath(next)); }
  function signOut() { logout(); router.replace('/login'); }

  if (error) return <main className="grid min-h-screen place-items-center bg-slate-50 p-8"><p className="max-w-md rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</p></main>;
  if (!user || !allowed) return (
    <main className="flex min-h-screen bg-[#f8f9fc]" aria-busy="true" aria-label="Loading your workspace">
      <div className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:block" />
      <div className="flex-1 space-y-6 p-6">
        <div className="h-14 animate-pulse rounded-xl bg-white" />
        <div className="h-24 animate-pulse rounded-xl bg-white" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />)}</div>
        <div className="h-80 animate-pulse rounded-xl bg-white" />
      </div>
    </main>
  );

  // The page for the current URL (children) renders inside the role's dashboard.
  if (kind === 'employee') {
    return (
      <UserUpdateContext.Provider value={setUser}><RoleContext.Provider value="employee">
        <EmployeeShell user={user} activeTab={tab} onNavigate={setTab} onLogout={signOut}>
          <EmployeeDashboard tab={tab} setTab={setTab} user={user}>{children}</EmployeeDashboard>
        </EmployeeShell>
      </RoleContext.Provider></UserUpdateContext.Provider>
    );
  }
  if (kind === 'company') {
    return (
      <UserUpdateContext.Provider value={setUser}><RoleContext.Provider value="company">
        <CompanyDashboard tab={tab} setTab={setTab} user={user} onLogout={signOut}>{children}</CompanyDashboard>
      </RoleContext.Provider></UserUpdateContext.Provider>
    );
  }
  return (
    <UserUpdateContext.Provider value={setUser}><RoleContext.Provider value="admin">
      <AdminDashboard tab={tab} setTab={setTab} user={user} onLogout={signOut}>{children}</AdminDashboard>
    </RoleContext.Provider></UserUpdateContext.Provider>
  );
}
