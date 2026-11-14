'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMark } from '@/components/ui/Brand';
import Icon from '@/components/ui/Icon';
import NotificationBell from '@/components/layout/NotificationBell';
import { PageCardContext } from '@/components/dashboard/Surface';
import { cx } from '@/components/ui';
import UserAvatar from '@/components/ui/UserAvatar';

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
  /** Version of the profile picture, or null/undefined when there is none. */
  avatarVersion?: number | null;
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
  /** Tab opened from "My profile" in the header menu. */
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

/** How a company status reads in the sidebar. */
const statusLabel: Record<string, string> = { APPROVED: 'Verified' };

const headerButton =
  'hidden h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-brand-600/40 hover:bg-brand-600/5 hover:text-brand-600 sm:inline-flex';

/**
 * Signed-in layout shared by every role: a light sidebar (collapsible on desktop, a
 * drawer on mobile) with a header showing the page title and breadcrumb,
 * notifications and a profile menu, and a footer.
 */
export default function WorkspaceShell({
  username,
  avatarVersion,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // storage unavailable; keep default
    }
  }, [storageKey]);

  useEffect(() => {
    if (!profileOpen) return;
    function close(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [profileOpen]);

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

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const activeLabel = navigation.find((item) => item.id === activeTab)?.label ?? 'Overview';
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
          'group relative flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors',
          active ? 'bg-brand-600/10 font-medium text-brand-600' : 'text-slate-600 hover:bg-brand-600/5 hover:text-brand-600',
          slim && 'justify-center px-0',
        )}
      >
        <span
          className={cx(
            'flex size-7 flex-none items-center justify-center rounded-lg transition-colors',
            active ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' : 'bg-white text-brand-600 group-hover:bg-brand-600/10',
          )}
        >
          <Icon name={item.icon} size={16} />
        </span>
        {!slim && <span className="min-w-0 flex-1 leading-snug break-words">{item.label}</span>}
        {badge > 0 && (
          <span className={cx('grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-3xs font-semibold text-navy-950', slim && 'absolute top-0.5 right-1.5 h-4 min-w-4 px-1')}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="workspace-theme min-h-screen bg-[#f8f9fc] text-slate-800">
      {mobileOpen && <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col overflow-hidden border-r border-slate-200/70 bg-white transition-[width,transform] duration-300 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          slim ? 'lg:w-[70px]' : 'lg:w-[260px]',
        )}
      >
        <div className={cx('flex h-16 flex-none items-center border-b border-slate-200/70 px-4', slim ? 'justify-center px-2' : 'justify-between')}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="BizCard home">
            <BrandMark className={slim ? 'size-7' : 'size-9'} />
            {!slim && (
              <span className="min-w-0">
                <span className="block truncate text-sm leading-tight font-bold text-slate-800">BizCard</span>
                <span className="block truncate text-[11px] leading-tight text-slate-400">{roleLabel} panel</span>
              </span>
            )}
          </Link>
          {!slim && (
            <button type="button" onClick={toggleCollapse} aria-label="Collapse sidebar" className="hidden size-9 flex-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:inline-flex">
              <Icon name="menu" size={20} />
            </button>
          )}
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden">
            <Icon name="close" size={16} />
          </button>
        </div>

        {slim && (
          <div className="hidden justify-center py-2 lg:flex">
            <button type="button" onClick={toggleCollapse} aria-label="Expand sidebar" className="flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
              <Icon name="menu" size={20} />
            </button>
          </div>
        )}

        {!slim && (
          <div className="flex-none px-3 pt-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-800" title={workspaceLabel}>{workspaceLabel}</p>
              {workspaceStatus && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 capitalize">
                  {workspaceStatus.toUpperCase() === 'APPROVED' ? (
                    <Icon name="verified" size={15} className="text-brand-600" />
                  ) : (
                    <span className={cx('size-1.5 rounded-full', statusTone[workspaceStatus.toUpperCase()] ?? 'bg-slate-400')} />
                  )}
                  {statusLabel[workspaceStatus.toUpperCase()] ?? workspaceStatus.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}

        <nav className={cx('mt-4 flex flex-1 flex-col overflow-x-hidden overflow-y-auto pb-6 [scrollbar-width:thin]', slim ? 'px-2' : 'px-3')} aria-label={`${roleLabel} navigation`}>
          <div className="space-y-1">{mainItems.map((item) => <NavButton key={item.id} item={item} />)}</div>
          {accountItems.length > 0 && (
            <div className="mt-auto space-y-1 pt-5">
              {slim ? <div className="mx-auto mb-3 h-px w-8 bg-slate-200" aria-hidden /> : <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">Account</p>}
              {accountItems.map((item) => <NavButton key={item.id} item={item} />)}
            </div>
          )}
        </nav>
      </aside>

      <div className={cx('flex min-h-screen flex-col transition-[padding] duration-300 ease-in-out', slim ? 'lg:pl-[70px]' : 'lg:pl-[260px]')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="flex size-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden">
            <Icon name="menu" size={20} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-800">{activeLabel}</h1>
            <p className="truncate text-xs text-slate-400">
              {roleLabel}<span className="mx-1.5">/</span>{activeLabel}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NotificationBell />
            <button type="button" aria-label="Fullscreen" onClick={toggleFullscreen} className={headerButton}>
              <Icon name="fullscreen" size={18} />
            </button>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Profile menu"
                aria-expanded={profileOpen}
                className="flex size-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-brand-600/40"
              >
                <UserAvatar name={username} version={avatarVersion} className="size-full rounded-[7px]" />
              </button>
              {profileOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                    <UserAvatar name={username} version={avatarVersion} className="size-10" textClassName="text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{username}</p>
                      <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                    </div>
                  </div>
                  {profileTab && (
                    <ul className="py-1">
                      <li>
                        <button type="button" onClick={() => { setProfileOpen(false); go(profileTab); }} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                          <Icon name="user" size={16} className="text-slate-400" />
                          My profile
                        </button>
                      </li>
                    </ul>
                  )}
                  <div className="border-t border-slate-200 p-1.5">
                    <button type="button" onClick={() => { setProfileOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-50">
                      <Icon name="logout" size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col px-4 py-6 sm:px-6">
          {/* One card per page: the page header is its top bar, everything else sits inside. */}
          <PageCardContext.Provider value={{ icon: navigation.find((item) => item.id === activeTab)?.icon }}>
            <div className="mx-auto w-full min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">{children}</div>
          </PageCardContext.Provider>
          <footer className="mt-auto flex w-full flex-col items-center justify-between gap-1 pt-4 text-xs text-slate-400 sm:flex-row">
            <p>Copyright © BizCard. All rights reserved.</p>
            <p>
              Powered by{' '}
              <a href="https://techknowgram.com/" target="_blank" rel="noreferrer" className="font-medium text-brand-600">TechKnowGram Ltd.</a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
