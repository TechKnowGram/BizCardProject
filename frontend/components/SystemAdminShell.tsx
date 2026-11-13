'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Icon from '@/components/Icon';
import NotificationBell from '@/components/NotificationBell';
import { cx } from '@/components/ui';
import type { User } from '@/lib/types';

export type NavigationItem = readonly [string, string, string];

export interface SystemAdminShellProps {
  user: Pick<User, 'role' | 'username' | 'email'>;
  pendingCompaniesCount?: number;
  pendingRequestsCount?: number;
  navigation: ReadonlyArray<NavigationItem>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children?: ReactNode;
}

export default function SystemAdminShell({
  user,
  pendingCompaniesCount = 0,
  pendingRequestsCount = 0,
  navigation,
  activeTab,
  onNavigate,
  onLogout,
  children,
}: SystemAdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bizcard_sys_sidebar_collapsed');
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bizcard_sys_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const activeItem = navigation.find(item => item[0] === activeTab);
  const activeLabel = activeItem ? activeItem[2] : 'Platform Overview';

  return (
    <div className="min-h-screen bg-[#f8faf9] text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* COMPACT COLLAPSIBLE OPS SIDEBAR */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0b1821] text-white border-r border-[#162a38] transition-all duration-250 ease-in-out md:sticky md:top-0 md:h-screen',
          collapsed ? 'md:w-20' : 'md:w-64',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Sidebar Header: Brand & Collapse Toggle */}
        <div className="h-16 flex items-center justify-between px-4.5 border-b border-[#162a38]">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-mint text-slate-950 font-black text-sm shrink-0">
                B
              </span>
              <div className="min-w-0">
                <span className="block font-display text-sm font-extrabold tracking-tight truncate">
                  BizCard
                </span>
                <span className="block text-3xs font-mono text-emerald-400 uppercase tracking-widest truncate">
                  Ops Console
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <span className="grid size-9 place-items-center rounded-xl bg-mint text-slate-950 font-black text-sm">
                B
              </span>
            </div>
          )}

          {/* Collapse Button (Desktop) */}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:grid size-7 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={15} />
          </button>

          {/* Close Button (Mobile) */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close mobile navigation"
            className="md:hidden grid size-7 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* System Health Status Indicator */}
        {!collapsed && (
          <div className="px-4 py-2.5 border-b border-[#162a38] bg-[#071118]/60 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-3xs font-mono font-medium text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM OPERATIONAL
            </span>
            <span className="text-3xs text-slate-500 font-mono">v1.0.4</span>
          </div>
        )}

        {/* Operational Navigation List */}
        <nav
          className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1 [scrollbar-width:none]"
          aria-label="System administrator navigation"
        >
          {navigation.map(([tabValue, iconName, label]) => {
            const active = activeTab === tabValue;
            const badgeCount =
              tabValue === 'companies'
                ? pendingCompaniesCount
                : tabValue === 'requests'
                ? pendingRequestsCount
                : 0;

            return (
              <button
                key={tabValue}
                type="button"
                onClick={() => {
                  onNavigate(tabValue);
                  setMobileOpen(false);
                }}
                title={collapsed ? label : undefined}
                className={cx(
                  'w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-150',
                  collapsed
                    ? 'justify-center p-3'
                    : 'justify-between px-3.5 py-2.5',
                  active
                    ? 'bg-mint text-slate-950 font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/6'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cx(
                      'shrink-0 grid place-items-center',
                      active ? 'text-slate-950' : 'text-slate-400'
                    )}
                  >
                    <Icon name={iconName} size={18} />
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </div>

                {!collapsed && badgeCount > 0 && (
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-3xs font-mono font-bold leading-none shrink-0',
                      active
                        ? 'bg-slate-950 text-white'
                        : 'bg-amber-400 text-slate-950'
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
                {collapsed && badgeCount > 0 && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-amber-400 ring-2 ring-[#0b1821]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: System Admin Profile & Sign Out */}
        <div className="p-3 border-t border-[#162a38] bg-[#071118]/80">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 place-items-center rounded-full bg-slate-800 text-mint font-bold text-xs border border-white/10 shrink-0">
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <strong className="block text-xs font-bold text-white truncate">
                    {user.username}
                  </strong>
                  <span className="block text-3xs text-slate-400 font-mono truncate">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="grid size-7 place-items-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors shrink-0"
              >
                <span className="text-xs">⏻</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              className="mx-auto grid size-9 place-items-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/10"
            >
              <span className="text-sm">⏻</span>
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP OPERATIONAL APP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-7 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger & breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile navigation"
              className="md:hidden grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="font-mono text-slate-400 uppercase tracking-wider text-2xs">
                Platform Ops
              </span>
              <span className="text-slate-300">/</span>
              <strong className="text-slate-900 font-bold">{activeLabel}</strong>
            </div>
          </div>

          {/* Right: Operational Status, Notifications & User Monogram */}
          <div className="flex items-center gap-3.5">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-2xs font-semibold text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>All Systems Operational</span>
            </div>

            <NotificationBell />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-mint font-bold text-xs">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <div className="hidden lg:block text-left">
                <span className="block text-xs font-bold text-slate-900 leading-tight">
                  {user.username}
                </span>
                <span className="block text-3xs font-mono text-slate-500 uppercase tracking-widest leading-none">
                  Super Admin
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-2xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* MAIN OPERATIONAL WORKSPACE BODY */}
        <main className="flex-1 p-4 md:p-7 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
