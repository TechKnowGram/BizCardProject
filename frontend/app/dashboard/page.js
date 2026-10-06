'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '../../components/AdminDashboard';
import CompanyDashboard from '../../components/CompanyDashboard';
import DashboardShell from '../../components/DashboardShell';
import { api, getToken, logout } from '../../lib/api';

const companyNav = [
  ['overview', '⌂', 'Overview'],
  ['employees', '♙', 'Employees'],
  ['templates', '◇', 'Templates'],
  ['requests', '▤', 'Card requests'],
  ['profile', '⚙', 'Company profile'],
];
const adminNav = [
  ['overview', '⌂', 'Overview'],
  ['companies', '▦', 'Companies'],
  ['requests', '▤', 'Card requests'],
  ['templates', '◇', 'Templates'],
  ['audit', '↻', 'Audit log'],
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    api('/auth/me').then(setUser).catch(requestError => {
      if (requestError.status === 401) { logout(); router.replace('/login'); }
      else setError(requestError.message);
    });
  }, [router]);

  function signOut() { logout(); router.replace('/login'); }
  if (error) return <main className="grid min-h-screen place-items-center p-8 text-red-700">{error}</main>;
  if (!user) return <main className="workspace-loader"><i /><p>Preparing your workspace…</p></main>;

  const systemAdmin = user.role === 'SYSTEM_ADMIN';
  return <DashboardShell
    user={user}
    title={systemAdmin ? 'System Administration' : 'Company Dashboard'}
    subtitle={systemAdmin ? 'Review companies, approve card requests and protect every workspace.' : 'Manage your people, brand and card delivery from one place.'}
    navigation={systemAdmin ? adminNav : companyNav}
    activeTab={tab}
    onNavigate={setTab}
    onLogout={signOut}
  >
    {systemAdmin ? <AdminDashboard tab={tab} setTab={setTab} /> : <CompanyDashboard tab={tab} setTab={setTab} />}
  </DashboardShell>;
}
