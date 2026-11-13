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
  /** 'account' items are listed in a separate group at the bottom of the sidebar. */
  section?: 'main' | 'account';
}

export interface WorkspaceShellProps {
  username: string;
  /** e.g. "Company admin" */
  roleLabel: string;
  /** Shown under the logo and in the breadcrumb, e.g. company name */
  workspaceLabel: string;
  /** Optional status line under the workspace label, e.g. APPROVED */
  workspaceStatus?: string;
  navigation: ReadonlyArray<WorkspaceNavItem>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  /** Tab opened when the user clicks their name in the sidebar footer. */
  profileTab?: string;
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
 * Signed-in layout shared by every role: a navy sidebar (collapsible on desktop,
 * a drawer on mobile) with the account and sign-out at its foot, and a slim top
 * bar with breadcrumbs and notifications.
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
  profileTab,
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

  function go(tab: string) {
    onNavigate(tab);
    setMobileOpen(false);
  }

  const activeLabel = navigation.find((item) => item.id === activeTab)?.label ?? 'Overview';
  const initial = username.charAt(0).toUpperCase();
  // The icon-only sidebar only applies on desktop; the mobile drawer is always full width.
  const slim = collapsed && !mobileOpen;
  const mainItems = navigation.filter((item) => item.section !== 'account');
  const accountItems = navigation.filter((item) => item.section === 'account');

  function NavButton({ item }: { item: WorkspaceNavItem }) {
    const active = activeTab === item.id;
    const badge = item.badge ?? 0;
    return (
      <button
        type="button"
        title={slim ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => go(item.id)}
        className={cx(
          'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
          active ? 'bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-brand-400' : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
          slim && 'justify-center px-0',
        )}
      >
        <Icon name={item.icon} size={18} className={active ? 'text-brand-300' : 'text-slate-500'} />
        {!slim && <span className="flex-1 truncate">{item.label}</span>}
        {badge > 0 && (
          <span
            className={cx(
              'grid min-w-5 place-items-center rounded-full px-1.5 text-3xs font-semibold',
              'bg-amber-400 text-navy-950',
              slim && 'absolute top-1 right-2 h-4 min-w-4 px-1',
            )}
          >
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-navy-950/60 md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-950 text-white transition-[width,transform] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0',
          slim ? 'md:w-[72px]' : 'md:w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo + collapse */}
        <div className={cx('flex h-16 items-center border-b border-white/10', slim ? 'flex-col justify-center gap-1 px-2' : 'justify-between px-4')}>
          <Link href="/" aria-label="BizCard home">{slim ? <BrandMark /> : <Brand light />}</Link>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cx('hidden size-7 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white md:grid', slim && 'size-5')}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={slim ? 12 : 16} />
          </button>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white md:hidden">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Workspace */}
        {!slim && (
          <div className="border-b border-white/10 px-4 py-4">
            <p className="text-xs font-medium text-slate-500">{roleLabel}</p>
            <p className="mt-1 truncate text-sm font-semibold text-white" title={workspaceLabel}>{workspaceLabel}</p>
            {workspaceStatus && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 capitalize">
                <span className={cx('size-1.5 rounded-full', statusTone[workspaceStatus.toUpperCase()] ?? 'bg-slate-400')} />
                {workspaceStatus.toLowerCase()}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4 [scrollbar-width:none]" aria-label={`${roleLabel} navigation`}>
          <div className="space-y-0.5">
            {mainItems.map((item) => <NavButton key={item.id} item={item} />)}
          </div>
          {accountItems.length > 0 && (
            <div className="mt-auto space-y-0.5 border-t border-white/10 pt-4">
              {!slim && <p className="px-3 pb-1.5 text-xs font-medium text-slate-500">Account</p>}
              {accountItems.map((item) => <NavButton key={item.id} item={item} />)}
            </div>
          )}
        </nav>

        {/* Signed-in user + sign out */}
        <div className="border-t border-white/10 p-3">
          <div className={cx('flex items-center gap-2', slim && 'flex-col')}>
            <button
              type="button"
              onClick={profileTab ? () => go(profileTab) : undefined}
              disabled={!profileTab}
              title={slim ? `${username} · ${roleLabel}` : profileTab ? 'Open your profile' : undefined}
              className={cx(
                'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors disabled:cursor-default disabled:opacity-100',
                profileTab && 'hover:bg-white/[0.06]',
                slim && 'flex-none',
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initial}</span>
              {!slim && (
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-medium text-white">{username}</span>
                  <span className="block truncate text-xs text-slate-400">{roleLabel}</span>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
          <div className="flex h-14 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 px-4 shadow-xs backdrop-blur sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden">
                <Icon name="menu" size={18} />
              </button>
              <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
                <span className="hidden truncate text-slate-500 sm:inline">{roleLabel}</span>
                <Icon name="chevronRight" size={14} className="hidden shrink-0 text-slate-300 sm:block" />
                <span className="hidden max-w-48 truncate text-slate-500 lg:inline">{workspaceLabel}</span>
                <Icon name="chevronRight" size={14} className="hidden shrink-0 text-slate-300 lg:block" />
                <span className="truncate font-semibold text-navy-900">{activeLabel}</span>
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />
              <span className="grid size-8 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white" title={`${username} · ${roleLabel}`}>{initial}</span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
