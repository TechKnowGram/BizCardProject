'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import Brand from '@/components/Brand';
import NotificationBell from '@/components/NotificationBell';
import { Button, cx } from '@/components/ui';
import type { User } from '@/lib/types';

export interface EmployeeShellProps {
  user: Pick<User, 'username' | 'email'>;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  children: ReactNode;
}

export const EMPLOYEE_NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'My Profile' },
  { id: 'company', label: 'Company' },
  { id: 'card', label: 'My Card' },
  { id: 'orders', label: 'Orders' },
  { id: 'help', label: 'Help' },
] as const;

export default function EmployeeShell({
  user,
  activeTab,
  onNavigate,
  onLogout,
  children,
}: EmployeeShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-900">
      {/* Top Professional Horizontal Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5">
          {/* Brand & Role Tag */}
          <div className="flex items-center gap-3">
            <Brand />
            <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-3xs font-bold tracking-wider text-slate-600 uppercase border border-slate-200">
              Employee
            </span>
          </div>

          {/* Horizontal Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Employee Navigation">
            {EMPLOYEE_NAV_ITEMS.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cx(
                    'px-3.5 py-1.5 text-xs font-semibold transition-all relative',
                    active
                      ? 'text-slate-900 font-bold border-b-2 border-slate-900 pb-1'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Section & Actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="hidden sm:flex items-center gap-2.5 pl-2.5 border-l border-slate-200">
              <span className="grid size-8 place-items-center rounded-full bg-lilac font-display text-xs font-bold text-royal">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-slate-800">{user.username}</span>
            </div>

            <Button
              variant="quiet"
              className="!px-3 !py-1.5 !text-xs text-slate-600 hover:text-slate-900"
              onClick={onLogout}
            >
              Sign out
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="md:hidden grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {EMPLOYEE_NAV_ITEMS.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileOpen(false);
                  }}
                  className={cx(
                    'block w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                    active ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Body Viewport */}
      <main className="min-h-[calc(100vh-65px)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
