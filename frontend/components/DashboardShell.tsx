import type { ReactNode } from 'react';
import Icon from '@/components/Icon';
import Brand from '@/components/Brand';
import NotificationBell from '@/components/NotificationBell';
import { Button, cx } from '@/components/ui';
import type { User } from '@/lib/types';

/** [tab value, icon name, label] */
export type NavigationItem = readonly [string, string, string];

export interface DashboardShellProps {
  user: Pick<User, 'role' | 'username'>;
  title: ReactNode;
  subtitle?: ReactNode;
  navigation: ReadonlyArray<NavigationItem>;
  activeTab: string;
  onNavigate: (value: string) => void;
  onLogout: () => void;
  children?: ReactNode;
}

export default function DashboardShell({ user, title, subtitle, navigation, activeTab, onNavigate, onLogout, children }: DashboardShellProps) {
  const admin = user.role === 'SYSTEM_ADMIN';
  return <main className="grid min-h-screen grid-cols-[calc(var(--spacing)*62.5)_minmax(0,1fr)] bg-mist max-lg:grid-cols-[minmax(0,1fr)]">
    <aside className="sticky top-0 flex h-screen flex-col bg-navy px-5.5 py-7.5 max-lg:hidden">
      <Brand light className="flex-wrap" />
      <div className="mt-13 flex items-center gap-2.5 rounded-full border border-white/15 px-4 py-2.5 text-xs font-medium text-white"><i className="size-2 rounded-full bg-mint" /> {admin ? 'System administrator' : 'Company administrator'}</div>
      <nav className="mt-7 grid gap-1" aria-label="Workspace navigation">
        {navigation.map(([value, , label]) => {
          const active = activeTab === value;
          return <button key={value} className={cx('flex w-full items-center gap-3 rounded-full border px-3 py-2.5 text-left text-sm font-medium transition duration-200', active ? 'border-transparent bg-mint text-black' : 'border-transparent text-white/70 hover:bg-white/10 hover:text-white')} onClick={() => onNavigate(value)}><span className={cx('grid size-6 place-items-center rounded-full text-xs', active ? 'bg-black text-white' : 'bg-white/10 text-white/80')}><Icon name={value} size={17} /></span>{label}</button>;
        })}
      </nav>
      <div className="relative z-1 mt-auto overflow-hidden rounded-[28px] bg-lilac p-5.5 text-black"><span className="absolute -top-5.5 -right-1 text-7xl text-black/10">✦</span><b className="font-display text-lg leading-tight">Small card.<br />Big potential.</b><p className="mt-2.5 text-2xs leading-normal text-black/60">Your people, beautifully represented.</p></div>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-black/5 bg-white/95 px-8.5 py-3.5 backdrop-blur-md max-md:px-4 max-md:py-3">
        <span className="text-xs text-[#898293] max-md:hidden">Workspace <i className="mx-3 text-[#c3bec9] not-italic">/</i><b className="text-[#282235]">{navigation.find(item => item[0] === activeTab)?.[2] || 'Overview'}</b></span>
        <div className="flex items-center gap-3"><NotificationBell /><span className="grid size-9 place-items-center rounded-full bg-lemon font-display text-sm font-semibold text-black">{user.username.charAt(0).toUpperCase()}</span><span className="hidden text-sm font-semibold sm:block">{user.username}</span><Button variant="quiet" onClick={onLogout}>Sign out</Button></div>
      </header>
      <div className="hidden gap-1.5 overflow-x-auto border-b border-[#eae4ef] bg-white px-3.5 py-2.5 [scrollbar-width:none] max-lg:flex">{navigation.map(([value, , label]) => <button key={value} className={cx('flex flex-none items-center gap-2 rounded-full px-3 py-2 text-xs', activeTab === value ? 'bg-black font-medium text-white' : 'text-[#756e80]')} onClick={() => onNavigate(value)}><span className="text-xs"><Icon name={value} size={17} /></span>{label}</button>)}</div>
      <div className="mx-auto max-w-7xl px-9 pt-9.5 pb-14 max-md:px-4 max-md:pt-7 max-md:pb-11"><div><span className="inline-flex rounded-full bg-lemon px-3.5 py-1.5 font-display text-3xs font-semibold tracking-2xl text-black">YOUR WORKSPACE, AT A GLANCE</span><h1 className="mt-3 text-3xl leading-tight font-medium tracking-tight md:text-4xl lg:text-5xl">{title}</h1><p className="mt-3 text-sm text-[#777182]">{subtitle}</p></div><div className="mt-8">{children}</div></div>
    </div>
  </main>;
}
