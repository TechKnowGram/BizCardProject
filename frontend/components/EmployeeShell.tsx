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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* TechKnowGram-style Floating Glassmorphic Top Bar */}
      <header className="sticky top-0 z-40 px-3 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-sm">
          {/* Brand & Role Tag */}
          <div className="flex items-center gap-3">
            <Brand />
            <span className="hidden sm:inline-flex items-center rounded-full bg-[#eef3fa] px-2.5 py-0.5 text-3xs font-bold tracking-wider text-[#2d62a8] uppercase border border-[#d8e3f3]">
              Employee
            </span>
          </div>

          {/* Horizontal Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Employee Navigation">
            {EMPLOYEE_NAV_ITEMS.map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cx(
                    'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all',
                    active
                      ? 'bg-[#2d62a8] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-[#2d62a8] hover:bg-[#eef3fa]'
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
              <span className="grid size-8 place-items-center rounded-full bg-[#080d26] text-white font-display text-xs font-bold">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-slate-800">{user.username}</span>
            </div>

            <Button
              variant="quiet"
              className="!px-3 !py-1.5 !text-xs !rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
