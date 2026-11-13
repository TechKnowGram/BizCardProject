'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard';
import CompanyDashboard from '../../components/CompanyDashboard';
import EmployeeDashboard from '../../components/EmployeeDashboard';
import DashboardShell from '../../components/DashboardShell';
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
  if (error) return <main className="grid min-h-screen place-items-center p-8 text-red-700">{error}</main>;
  if (!user) return <main className="grid min-h-screen place-items-center content-center gap-4 bg-mist text-sm text-[#726b7d]"><i className="size-10.5 animate-[spin_.8s_linear_infinite] rounded-full border-3 border-lilac border-t-royal" /><p>Preparing your workspace…</p></main>;

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
