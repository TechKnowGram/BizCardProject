import Brand from './Brand';
import NotificationBell from './NotificationBell';

export default function DashboardShell({ user, title, subtitle, navigation, activeTab, onNavigate, onLogout, children }) {
  const admin = user.role === 'SYSTEM_ADMIN';
  return <main className="workspace">
    <aside className="workspace-rail">
      <Brand light />
      <div className="rail-status"><i /> {admin ? 'System administrator' : 'Company administrator'}</div>
      <nav className="rail-navigation" aria-label="Workspace navigation">
        {navigation.map(([value, icon, label]) => <button key={value} className={activeTab === value ? 'active' : ''} onClick={() => onNavigate(value)}><span>{icon}</span>{label}</button>)}
      </nav>
      <div className="rail-art"><span>✦</span><b>Small card.<br />Big potential.</b><p>Your people, beautifully represented.</p></div>
    </aside>
    <div className="min-w-0 workspace-main">
      <header className="workspace-header">
        <span className="workspace-crumb">Workspace <i>/</i><b>{navigation.find(item => item[0] === activeTab)?.[2] || 'Overview'}</b></span>
        <div className="flex items-center gap-3"><NotificationBell /><span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span><span className="hidden text-sm font-semibold sm:block">{user.username}</span><button className="btn-quiet" onClick={onLogout}>Sign out</button></div>
      </header>
      <div className="mobile-dashboard-tabs">{navigation.map(([value, icon, label]) => <button key={value} className={activeTab === value ? 'active' : ''} onClick={() => onNavigate(value)}><span>{icon}</span>{label}</button>)}</div>
      <div className="workspace-content"><div className="workspace-title"><span>YOUR WORKSPACE, AT A GLANCE</span><h1>{title}</h1><p>{subtitle}</p></div><div className="mt-8">{children}</div></div>
    </div>
  </main>;
}
