import Brand from './Brand';
import NotificationBell from './NotificationBell';

export default function DashboardShell({ user, title, subtitle, onLogout, children }) {
  const admin = user.role === 'SYSTEM_ADMIN';
  return <main className="workspace">
    <aside className="workspace-rail"><Brand light /><div className="rail-status"><i /> {admin ? 'Administration' : 'My workspace'}</div><div className="rail-copy">{admin ? 'Review companies and requests. Keep every card trustworthy.' : 'Your team’s next great introduction starts here.'}</div><div className="rail-art"><span>✦</span><b>Small card.<br />Big potential.</b><p>Your people, beautifully represented.</p></div></aside>
    <div className="min-w-0 workspace-main"><header className="workspace-header"><span className="workspace-crumb">Workspace <i>/</i><b>{admin ? 'Admin overview' : 'Company overview'}</b></span><div className="flex items-center gap-3"><NotificationBell /><span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span><span className="hidden text-sm font-semibold sm:block">{user.username}</span><button className="btn-quiet" onClick={onLogout}>Sign out</button></div></header><div className="workspace-content"><div className="workspace-title"><span>YOUR WORKSPACE, AT A GLANCE</span><h1>{title}</h1><p>{subtitle}</p></div><div className="mt-8">{children}</div></div></div>
  </main>;
}
