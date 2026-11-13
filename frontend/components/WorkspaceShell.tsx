'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Brand, { BrandMark } from '@/components/Brand';
import Icon from '@/components/Icon';
import NotificationBell from '@/components/NotificationBell';
import { cx } from '@/components/ui';

export interface WorkspaceNavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

export interface WorkspaceShellProps {
  username: string;
  /** e.g. "Company admin" */
  roleLabel: string;
  /** Shown under the logo, e.g. company name or "Platform admin" */
  workspaceLabel: string;
  /** Optional status line under the workspace label, e.g. APPROVED */
  workspaceStatus?: string;
  navigation: ReadonlyArray<WorkspaceNavItem>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  /** localStorage key used to remember the collapsed state */
  storageKey: string;
  children?: ReactNode;
}

const statusTone: Record<string, string> = {
  APPROVED: 'bg-emerald-400',
  ACTIVE: 'bg-emerald-400',
  PENDING: 'bg-amber-400',
  REJECTED: 'bg-red-400',
  SUSPENDED: 'bg-red-400',
};

/**
 * The signed-in layout shared by every role: a navy sidebar (collapsible on
 * desktop, a drawer on mobile) and a white top bar with notifications.
 */
export default function WorkspaceShell({
  username,
  roleLabel,
  workspaceLabel,
  workspaceStatus,
  navigation,
  activeTab,
  onNavigate,
  onLogout,
  storageKey,
  children,
}: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // storage unavailable; keep default
    }
  }, [storageKey]);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const activeLabel = navigation.find((item) => item.id === activeTab)?.label ?? 'Overview';
  const initial = username.charAt(0).toUpperCase();
  // The collapsed (icon-only) sidebar only applies on desktop; the mobile drawer is always full width.
  const slim = collapsed && !mobileOpen;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-navy-950/60 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-950 text-white transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0',
          slim ? 'md:w-[72px]' : 'md:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cx('flex h-16 items-center border-b border-white/10', slim ? 'justify-center px-2' : 'justify-between px-4')}>
          <Link href="/" aria-label="BizCard home">{slim ? <BrandMark /> : <Brand light />}</Link>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white md:hidden">
            <Icon name="close" size={16} />
          </button>
        </div>

        {!slim && (
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-3xs font-medium tracking-wider text-slate-500 uppercase">{roleLabel}</p>
            <p className="mt-1 truncate text-sm font-semibold text-white" title={workspaceLabel}>{workspaceLabel}</p>
            {workspaceStatus && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                <span className={cx('size-1.5 rounded-full', statusTone[workspaceStatus.toUpperCase()] ?? 'bg-slate-400')} />
                {workspaceStatus.toLowerCase()}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 [scrollbar-width:none]" aria-label={`${roleLabel} navigation`}>
          {navigation.map((item) => {
            const active = activeTab === item.id;
            const badge = item.badge ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                title={slim ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={cx(
                  'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
                  slim && 'justify-center px-0',
                )}
              >
                <Icon name={item.icon} size={18} className={active ? 'text-white' : 'text-slate-400'} />
                {!slim && <span className="flex-1 truncate">{item.label}</span>}
                {badge > 0 && (
                  <span className={cx(
                    'grid min-w-5 place-items-center rounded-full px-1.5 text-3xs font-semibold',
                    active ? 'bg-white text-brand-700' : 'bg-amber-400 text-navy-950',
                    slim && 'absolute top-1 right-2 h-4 min-w-4 px-1',
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cx('hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/[0.06] hover:text-white md:flex', slim && 'justify-center px-0')}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
            {!slim && 'Collapse'}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden">
              <Icon name="menu" size={18} />
            </button>
            <p className="truncate text-sm text-slate-500">
              <span className="hidden sm:inline">{workspaceLabel}</span>
              <span className="mx-2 hidden text-slate-300 sm:inline">/</span>
              <span className="font-semibold text-navy-900">{activeLabel}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="hidden items-center gap-2.5 border-l border-slate-200 pl-3 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">{initial}</span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-navy-900">{username}</span>
                <span className="block text-xs text-slate-500">{roleLabel}</span>
              </span>
            </div>
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy-900">
              <Icon name="logout" size={16} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
