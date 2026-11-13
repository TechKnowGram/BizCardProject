'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Brand from '@/components/Brand';
import Icon from '@/components/Icon';
import NotificationBell from '@/components/NotificationBell';
import { Button, cx } from '@/components/ui';
import type { User } from '@/lib/types';

export type NavigationItem = readonly [string, string, string];

export interface CompanyAdminShellProps {
  user: Pick<User, 'role' | 'username'>;
  companyName?: string;
  companyStatus?: string;
  pendingMembershipsCount?: number;
  pendingRequestsCount?: number;
  navigation: ReadonlyArray<NavigationItem>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children?: ReactNode;
}

export default function CompanyAdminShell({
  user,
  companyName = 'Company Workspace',
  companyStatus = 'APPROVED',
  pendingMembershipsCount = 0,
  pendingRequestsCount = 0,
  navigation,
  activeTab,
  onNavigate,
  onLogout,
  children,
}: CompanyAdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore sidebar state from localStorage if available
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bizcard_co_sidebar_collapsed');
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bizcard_co_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const activeItem = navigation.find(item => item[0] === activeTab);
  const activeLabel = activeItem ? activeItem[2] : 'Overview';

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* COMPACT COLLAPSIBLE SIDEBAR */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-[#080d26] text-white border-r border-[#1a2462] transition-all duration-250 ease-in-out md:sticky md:top-0 md:h-screen',
          collapsed ? 'md:w-20' : 'md:w-64',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Sidebar Header: Brand & Collapse Toggle */}
        <div className="h-16 flex items-center justify-between px-4.5 border-b border-[#1a2462]">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="grid size-9 place-items-center rounded-xl bg-[#2d62a8] text-white font-black text-sm shrink-0 shadow-xs">
                B
              </span>
              <div className="min-w-0">
                <span className="block font-display text-sm font-extrabold tracking-tight truncate">
                  BizCard
                </span>
                <span className="block text-3xs font-mono text-[#8eaee0] uppercase tracking-widest truncate">
                  Company Admin
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <span className="grid size-9 place-items-center rounded-xl bg-[#2d62a8] text-white font-black text-sm">
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
            aria-label="Close mobile menu"
            className="md:hidden grid size-7 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Company Identity Quick Summary (when expanded) */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-[#1a2462] bg-[#101845]/70">
            <div className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-[#1a2462] text-[#8eaee0] font-bold text-xs border border-white/10 shrink-0">
                {companyName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-xs font-bold text-white truncate">
                  {companyName}
                </strong>
                <span className="flex items-center gap-1.5 text-3xs text-emerald-400 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  {companyStatus}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Operational Navigation List */}
        <nav
          className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1 [scrollbar-width:none]"
          aria-label="Company administrator navigation"
        >
          {navigation.map(([tabValue, iconName, label]) => {
            const active = activeTab === tabValue;
            const badgeCount =
              tabValue === 'memberships'
                ? pendingMembershipsCount
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
                  'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-all duration-150',
                  active
                    ? 'bg-[#2d62a8] text-white font-bold shadow-xs'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  collapsed && 'justify-center px-0'
                )}
              >
                <span
                  className={cx(
                    'grid size-5 place-items-center shrink-0',
                    active ? 'text-slate-950' : 'text-slate-400 group-hover:text-white'
                  )}
                >
                  <Icon name={iconName} size={17} />
                </span>

                {!collapsed && (
                  <span className="truncate flex-1">
                    {label}
                  </span>
                )}

                {/* Badge (Pending Count) */}
                {badgeCount > 0 && (
                  <span
                    className={cx(
                      'rounded-full px-2 py-0.5 text-3xs font-black shrink-0 transition-transform',
                      active
                        ? 'bg-slate-950 text-white'
                        : 'bg-amber-400 text-slate-950',
                      collapsed && 'absolute -top-1 -right-1 size-4 p-0 grid place-items-center text-[9px]'
                    )}
                  >
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Admin profile & Logout */}
        <div className="p-3 border-t border-[#1a2462] bg-[#080d26]">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 place-items-center rounded-full bg-[#1a2462] text-[#8eaee0] font-display text-xs font-bold shrink-0 border border-white/10">
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-white truncate">
                    {user.username}
                  </span>
                  <span className="block text-3xs text-slate-400 truncate">
                    Administrator
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors shrink-0"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span
                className="grid size-8 place-items-center rounded-full bg-[#1a2462] text-[#8eaee0] font-display text-xs font-bold border border-white/10"
                title={`${user.username} (Company Admin)`}
              >
                {user.username.charAt(0).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out"
                className="grid size-8 place-items-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Left: Mobile Toggle & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open mobile navigation"
              className="md:hidden grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Icon name="menu" size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <span className="text-slate-900 font-bold capitalize truncate">
                {activeLabel}
              </span>
            </div>
          </div>

          {/* Right: Notification Bell & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-mint font-display text-xs font-bold">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <div className="text-left">
                <span className="block text-xs font-bold text-slate-900 leading-tight">
                  {user.username}
                </span>
                <span className="block text-3xs text-slate-400">
                  Company Admin
                </span>
              </div>
            </div>

            <Button
              variant="quiet"
              className="!text-xs !py-1.5 !px-3 font-semibold text-slate-600 hover:text-slate-900"
              onClick={onLogout}
            >
              Sign out
            </Button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
