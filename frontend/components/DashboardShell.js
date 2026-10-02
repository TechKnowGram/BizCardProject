import Brand from './Brand';
import NotificationBell from './NotificationBell';

export default function DashboardShell({ user, title, subtitle, onLogout, children }) {
  const admin = user.role === 'SYSTEM_ADMIN';
  return <main className="workspace">
    <aside className="workspace-rail"><Brand light /><div className="mt-14 border-l-2 border-lime-300 bg-white/5 px-4 py-3 text-sm font-medium text-white">● &nbsp; {admin ? 'Administration' : 'My workspace'}</div><div className="mt-8 px-4 text-xs leading-6 text-slate-400">{admin ? 'Review people and companies. Keep every card on brand.' : 'Your team’s next great introduction starts here.'}</div><div className="mt-auto rounded-2xl border border-white/10 p-5"><p className="text-sm text-white">Small card. Big potential.</p><p className="mt-2 text-xs text-slate-400">Your people, beautifully represented.</p></div></aside>
    <div className="min-w-0"><header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 lg:px-10"><span className="text-xs text-slate-500">Workspace <span className="mx-3 text-slate-300">/</span><span className="font-medium text-slate-900">{admin ? 'Admin overview' : 'Company overview'}</span></span><div className="flex items-center gap-3"><NotificationBell /><span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">{user.username.charAt(0).toUpperCase()}</span><span className="hidden text-sm font-semibold sm:block">{user.username}</span><button className="btn-quiet" onClick={onLogout}>Sign out</button></div></header><div className="mx-auto max-w-7xl px-5 py-8 lg:px-10 lg:py-10"><p className="eyebrow">YOUR WORKSPACE, AT A GLANCE</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{title}</h1><p className="mt-3 text-sm text-slate-500">{subtitle}</p><div className="mt-8">{children}</div></div></div>
  </main>;
}
