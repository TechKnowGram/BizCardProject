import Icon from './Icon';
import Brand from './Brand';
import NotificationBell from './NotificationBell';

export default function DashboardShell({ user, title, subtitle, navigation, activeTab, onNavigate, onLogout, children }) {
  const roleLabel = user.role === 'SYSTEM_ADMIN' ? 'System Administrator' : user.role === 'EMPLOYEE' ? 'Employee' : 'Company Administrator';
  return (
    <main className="workspace">
      <aside className="workspace-rail">
        <Brand light />
        <div className="rail-status">
          <i /> <span>{roleLabel}</span>
        </div>
        <nav className="rail-navigation" aria-label="Workspace navigation">
          {navigation.map(([value, icon, label]) => (
            <button
              key={value}
              className={activeTab === value ? 'active' : ''}
              onClick={() => onNavigate(value)}
            >
              <span><Icon name={value} size={16} /></span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-footer">
          <div className="rail-meta">
            <span className="rail-meta-label">Workspace Status</span>
            <span className="rail-meta-val"><span className="rail-status-dot" /> Verified</span>
          </div>
          <div className="rail-meta">
            <span className="rail-meta-label">Security</span>
            <span className="rail-meta-val">SOC2 Type II</span>
          </div>
        </div>
      </aside>
      <div className="min-w-0 workspace-main">
        <header className="workspace-header">
          <span className="workspace-crumb">
            Workspace <i>/</i> <b>{navigation.find(item => item[0] === activeTab)?.[2] || 'Overview'}</b>
          </span>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="user-profile-badge">
              <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
              <span className="hidden text-xs font-semibold text-slate-800 sm:block">{user.username}</span>
            </div>
            <button className="btn-quiet text-xs" onClick={onLogout}>Sign out</button>
          </div>
        </header>
        <div className="mobile-dashboard-tabs">
          {navigation.map(([value, icon, label]) => (
            <button
              key={value}
              className={activeTab === value ? 'active' : ''}
              onClick={() => onNavigate(value)}
            >
              <span><Icon name={value} size={15} /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="workspace-content">
          <div className="workspace-title">
            <span>ENTERPRISE WORKSPACE</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
