'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard';
import CompanyDashboard from '../../components/CompanyDashboard';
import EmployeeDashboard from '../../components/EmployeeDashboard';
import EmployeeShell from '../../components/EmployeeShell';
import { api, getToken, logout } from '../../lib/api';
import type { ApiError } from '../../lib/api';
import type { User } from '../../lib/types';

type NavItem = readonly [string, string, string];

const companyNav: readonly NavItem[] = [
  ['overview', '⌂', 'Overview'],
  ['employees', '♙', 'Employees'],
  ['memberships', '♙', 'Memberships'],
  ['templates', '◇', 'Templates'],
  ['requests', '▤', 'Card requests'],
  ['profile', '⚙', 'Company profile'],
];
const adminNav: readonly NavItem[] = [
  ['overview', '⌂', 'Overview'],
  ['companies', '▦', 'Companies'],
  ['requests', '▤', 'Card requests'],
  ['templates', '◇', 'Templates'],
  ['audit', '↻', 'Audit log'],
];
const employeeNav: readonly NavItem[] = [
  ['overview', '⌂', 'Overview'],
  ['create', '◇', 'Create card'],
  ['cards', '▤', 'My cards'],
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    api<User>('/auth/me').then(setUser).catch((requestError: ApiError) => {
      if (requestError.status === 401) { logout(); router.replace('/login'); }
      else setError(requestError.message);
    });
  }, [router]);

  function signOut() { logout(); router.replace('/login'); }
  if (error) return <main className="grid min-h-screen place-items-center bg-slate-50 p-8"><p className="max-w-md rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</p></main>;
  if (!user) return <main className="grid min-h-screen place-items-center content-center gap-4 bg-slate-50 text-sm text-slate-500"><i className="size-9 animate-spin rounded-full border-3 border-slate-200 border-t-brand-600" /><p>Loading your workspace…</p></main>;

  const systemAdmin = user.role === 'SYSTEM_ADMIN';
  const employee = user.role === 'EMPLOYEE';

  if (employee) {
    return (
      <EmployeeShell
        user={user}
        activeTab={tab}
        onNavigate={setTab}
        onLogout={signOut}
      >
        <EmployeeDashboard tab={tab} setTab={setTab} user={user} />
      </EmployeeShell>
    );
  }

  if (!systemAdmin) {
    return (
      <CompanyDashboard
        tab={tab}
        setTab={setTab}
        user={user}
        onLogout={signOut}
      />
    );
  }

  return (
    <AdminDashboard
      tab={tab}
      setTab={setTab}
      user={user}
      onLogout={signOut}
    />
  );
}
