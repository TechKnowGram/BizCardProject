'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard';
import CompanyDashboard from '../../components/CompanyDashboard';
import DashboardShell from '../../components/DashboardShell';
import { api, getToken, logout } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    api('/auth/me').then(setUser).catch(error => {
      if (error.status === 401) { logout(); router.replace('/login'); }
      else setError(error.message);
    });
  }, [router]);

  function signOut() { logout(); router.replace('/login'); }
  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (!user) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading workspace...</main>;

  const systemAdmin = user.role === 'SYSTEM_ADMIN';
  return <DashboardShell
    user={user}
    title={systemAdmin ? 'System Administration' : 'Company Dashboard'}
    subtitle={systemAdmin ? 'Manage companies, templates and card approvals.' : 'Manage employees, templates, requests and generated cards.'}
    onLogout={signOut}
  >
    {systemAdmin ? <AdminDashboard /> : <CompanyDashboard />}
  </DashboardShell>;
}
