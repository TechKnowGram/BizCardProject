'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import { formatDate } from '@/components/employee/shared';
import { useEmployee } from '@/components/employee/EmployeeDashboard';
import PersonalDetails from '@/components/dashboard/PersonalDetails';
import UserAvatar from '@/components/ui/UserAvatar';

export default function EmployeeProfilePage() {
  const { user, setTab, cards, orders, order, activeMembership, membershipState, cardRows, toast, membershipSummary } = useEmployee();
  const memberSince = (user as any)?.created_at;
  const companyName = activeMembership?.company?.name;

  /** One settings section: explanation on the left, content card on the right. */
  const Section = ({ title, text, children }: { title: string; text: string; children: ReactNode }) => (
    <section className="grid gap-4 border-t border-slate-200 pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-base font-semibold text-navy-900">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">{children}</div>
    </section>
  );
  const Row = ({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) => (
    <div className={`grid gap-1 px-6 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 ${last ? '' : 'border-b border-slate-100'}`}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-words text-navy-900">{children}</dd>
    </div>
  );

  return (
    <div className="space-y-8">
      {toast}

      {/* Profile header */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <UserAvatar name={user?.username || '?'} version={user?.has_avatar ? user.avatar_version ?? 0 : null} className="size-16" textClassName="text-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-navy-900">{user?.username || 'Your profile'}</h1>
              <p className="mt-0.5 truncate text-sm text-slate-500">{user?.email}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">Employee</span>
                {membershipState === 'ACTIVE' && companyName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                    <span className="size-1.5 rounded-full bg-emerald-500" />Member of {companyName}
                  </span>
                ) : membershipState === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
                    <span className="size-1.5 rounded-full bg-amber-500" />Waiting for company approval
                  </span>
                ) : (
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Independent account</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => setTab?.('card')}>Order cards</Button>
          </div>
        </div>
        <dl className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          {[
            { label: 'Saved cards', value: cardRows.length },
            { label: 'Orders', value: orders.length },
            { label: memberSince ? 'Member since' : 'Company', value: memberSince ? formatDate(memberSince) : companyName || 'None yet' },
          ].map(item => (
            <div key={item.label} className="px-6 py-4 sm:px-8">
              <dt className="text-xs text-slate-500">{item.label}</dt>
              <dd className="mt-0.5 truncate text-lg font-semibold text-navy-900 tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Section title="Personal details" text="The name and email on your account. Edit them here. You can also set the details printed on each card when you order it.">
        {user && <PersonalDetails user={user} />}
      </Section>

      <Section title="Company" text="Joining your employer lets you order cards in its approved designs. Your company decides who pays.">
        <div className="px-6 py-5">
          {membershipSummary(true)}
          <div className="mt-5 flex flex-wrap gap-2">
            {membershipState === 'ACTIVE' ? (
              <Button variant="secondary" onClick={() => setTab?.('company')}>View company</Button>
            ) : membershipState !== 'PENDING' ? (
              <Button variant="secondary" onClick={() => setTab?.('company')}>Find your company</Button>
            ) : null}
          </div>
        </div>
      </Section>

      <Section title="Account" text="Reference details if you need help from your company admin or BizCard support.">
        <dl>
          <Row label="Account ID">
            <span className="flex items-center gap-2">
              <code className="truncate font-mono text-xs font-normal text-slate-600">{user?.id || '—'}</code>
              {user?.id && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(String(user.id))}
                  className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Copy
                </button>
              )}
            </span>
          </Row>
          <Row label="Sign out" last>
            <span className="font-normal text-slate-500">Use the sign-out button at the bottom of the menu.</span>
          </Row>
        </dl>
      </Section>
    </div>
  );
}
