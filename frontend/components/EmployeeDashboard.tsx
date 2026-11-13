// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, download } from '../lib/api';
import type { User } from '../lib/types';
import StatusBadge from './StatusBadge';
import Toast from './Toast';
import ReviewDialog from './ReviewDialog';
import { isValidEmail } from '../lib/validation';
import { Button, cx, inputClass, tableClass, tdClass, thClass } from './ui';

const PRICE = 50;

const MATCH_HINTS: Record<string, { text: string; tone: string }> = {
  ROSTER_MATCHED: { text: 'Verified with company roster. Membership activated automatically.', tone: 'bg-[#eef3fa] text-[#28528d] border-[#d8e3f3]' },
  ID_MISMATCH: { text: 'Employee ID was recognized but email differs. Company admin will review.', tone: 'bg-[#fef9c3] text-[#854d0e] border-amber-200' },
  NOT_FOUND: { text: 'Your details will be reviewed by the company administrator.', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  INACTIVE_EMPLOYEE: { text: 'Roster record is currently inactive. Awaiting administrator review.', tone: 'bg-[#fee2e2] text-[#991b1b] border-rose-200' },
};

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-3xl">{subtitle}</p>}
    </div>
  );
}

function SectionHeading({ title, copy, action }: { title: string; copy?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
        {copy && <p className="mt-0.5 text-xs text-slate-500">{copy}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function LiveCardPreview({
  theme = 'navy',
  name,
  designation,
  department,
  phone,
  email,
  companyName,
  isCompany,
  templateName,
}: {
  theme?: 'navy' | 'clean' | 'royal';
  name?: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  isCompany: boolean;
  templateName?: string;
}) {
  const displayName = name?.trim() || 'Your Full Name';
  const displayTitle = designation?.trim() || (isCompany ? 'Senior Consultant' : 'Independent Professional');
  const displayDept = department?.trim() || (isCompany ? 'Engineering & Operations' : 'Strategy & Consulting');
  const displayPhone = phone?.trim() || '+880 1700 000000';
  const displayEmail = email?.trim() || 'contact@bizcard.me';
  const displayOrg = isCompany ? (companyName || 'Verified Organization') : 'BIZCARD INDEPENDENT';

  const isNavy = theme === 'navy';
  const isRoyal = theme === 'royal';
  const isClean = theme === 'clean';

  const cardBgClass = isNavy
    ? 'bg-gradient-to-br from-[#080d26] via-[#101845] to-[#1a2462] text-white border border-[#1a2462] shadow-2xl'
    : isRoyal
    ? 'bg-gradient-to-br from-[#1d1338] via-[#140b28] to-[#0d071d] text-white border border-[#3b2b68] shadow-2xl'
    : 'bg-gradient-to-br from-white via-[#fafbfc] to-[#f1f4f6] text-slate-900 border border-slate-200/90 shadow-xl';

  const accentPillClass = isNavy
    ? 'bg-[#2d62a8] text-white'
    : isRoyal
    ? 'bg-[#efb53e] text-slate-950'
    : 'bg-slate-900 text-white';

  const secondaryTextClass = isClean ? 'text-slate-600' : 'text-slate-300';
  const subtleTextClass = isClean ? 'text-slate-400' : 'text-slate-400';

  return (
    <div className="relative w-full max-w-md mx-auto select-none">
      {/* Physical Card Mockup with standard 1.75:1 aspect ratio */}
      <div
        className={cx(
          'relative aspect-[1.75/1] w-full rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-all duration-300',
          cardBgClass
        )}
      >
        {/* Ambient mesh glow */}
        {!isClean && (
          <div
            className="absolute -right-16 -top-16 size-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: isNavy ? '#4dffc8' : '#c084fc' }}
          />
        )}
        <div
          className="absolute -left-12 -bottom-12 size-36 rounded-full blur-2xl opacity-10 pointer-events-none"
          style={{ backgroundColor: isNavy ? '#2bbbc4' : '#efb53e' }}
        />

        {/* Card Header */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cx(
                'grid size-8 place-items-center rounded-lg text-xs font-black shadow-xs shrink-0',
                accentPillClass
              )}
            >
              {displayOrg.charAt(0)}
            </span>
            <div className="min-w-0">
              <span
                className={cx(
                  'block text-2xs font-extrabold uppercase tracking-widest truncate',
                  accentPillClass.includes('text-slate-950') && !isClean
                    ? 'text-mint'
                    : isRoyal
                    ? 'text-[#efb53e]'
                    : 'text-slate-900'
                )}
              >
                {displayOrg}
              </span>
              <span className={cx('block text-3xs font-mono tracking-tight truncate', subtleTextClass)}>
                {isCompany ? (templateName ? `Template: ${templateName}` : 'Corporate Workspace') : 'Verified Personal Card'}
              </span>
            </div>
          </div>

          {/* NFC / Prepress badge */}
          <div className="flex items-center gap-1.5 opacity-70 shrink-0">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5A2.5 2.5 0 0 0 11 12a2.5 2.5 0 0 0-2.5-2.5M12 17.5a5.5 5.5 0 0 0 0-11M15.5 20.5a8.5 8.5 0 0 0 0-17" />
            </svg>
            <span className="text-3xs font-mono font-bold tracking-wider">300 DPI</span>
          </div>
        </div>

        {/* Card Body: Name & Title */}
        <div className="relative z-10 my-auto py-1">
          <h3
            className={cx(
              'text-lg sm:text-xl font-black tracking-tight leading-tight line-clamp-1',
              isClean ? 'text-slate-900' : 'text-white'
            )}
          >
            {displayName}
          </h3>
          <p className={cx('text-2xs sm:text-xs font-semibold tracking-wide uppercase mt-0.5 line-clamp-1', secondaryTextClass)}>
            {displayTitle}
          </p>
          <span className={cx('text-3xs tracking-wider block mt-0.5 line-clamp-1', subtleTextClass)}>
            {displayDept}
          </span>
        </div>

        {/* Card Footer: Contact & QR Code */}
        <div className="relative z-10 flex items-end justify-between gap-2 border-t pt-2.5 border-current/10">
          <div className="space-y-0.5 text-3xs min-w-0">
            <div className="flex items-center gap-1.5 font-mono truncate">
              <span className="opacity-60 shrink-0">TEL</span>
              <span className={cx('truncate', secondaryTextClass)}>{displayPhone}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono truncate">
              <span className="opacity-60 shrink-0">EMAIL</span>
              <span className={cx('truncate', secondaryTextClass)}>{displayEmail}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={cx(
                'size-8 rounded p-1 grid grid-cols-3 gap-0.5 place-items-center',
                isClean ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'
              )}
              title="Prepress certified QR code"
            >
              <span className="size-1.5 bg-current rounded-xs" />
              <span className="size-1 bg-current" />
              <span className="size-1.5 bg-current rounded-xs" />
              <span className="size-1 bg-current" />
              <span className="size-1 bg-current" />
              <span className="size-1 bg-current" />
              <span className="size-1.5 bg-current rounded-xs" />
              <span className="size-1 bg-current" />
              <span className="size-1.5 bg-current rounded-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* Prepress Specs Note */}
      <div className="mt-2.5 flex items-center justify-between text-3xs text-slate-500 font-mono px-1">
        <span>ISO/IEC 7810 ID-1 · 85.6 × 54 mm</span>
        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Prepress Vector Ready
        </span>
      </div>
    </div>
  );
}

export interface EmployeeDashboardProps {
  tab: string;
  setTab?: (tab: string) => void;
  user?: User | null;
}

export default function EmployeeDashboard({ tab, setTab, user }: EmployeeDashboardProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  // Card Studio view toggle ('order' or 'vault')
  const [cardSubView, setCardSubView] = useState<'order' | 'vault'>('order');

  // Card Type Selector Pattern ('PERSONAL' or 'COMPANY')
  const [cardOrderType, setCardOrderType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // Card Theme Palette for Live Interactive Preview
  const [cardTheme, setCardTheme] = useState<'navy' | 'clean' | 'royal'>('navy');

  // Request to Change Company workflow state
  const [changeCompanyOpen, setChangeCompanyOpen] = useState(false);

  // Modal state for joining a specific company
  const [targetCompany, setTargetCompany] = useState<any>(null);
  const [joinForm, setJoinForm] = useState({ official_email: '', employee_id: '', payer: 'COMPANY' });
  const [joinErrors, setJoinErrors] = useState<Record<string, string | undefined>>({});
  const [modalBusy, setModalBusy] = useState(false);
  const [modalApiError, setModalApiError] = useState('');

  const [order, setOrder] = useState({
    quantity: 1,
    template_id: '',
    payer: 'INDIVIDUAL',
    name: user?.username || '',
    designation: '',
    department: '',
    phone: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [directory, mine, companyCards, personalCards, orderData] = await Promise.all([
        api('/companies/directory'),
        api('/memberships/me'),
        api('/employee/cards'),
        api('/employee/personal-cards'),
        api('/employee/orders'),
      ]);
      setCompanies(directory as any[]);
      setMemberships(mine as any[]);
      setCards(companyCards as any[]);
      setPersonal(personalCards as any[]);
      setOrders(orderData as any[]);
      const active = (mine as any[]).find(item => item.status === 'APPROVED');
      if (active) {
        setSelected(String(active.company_id));
        setTemplates((await api(`/employee/templates/${active.company_id}`)) as any[]);
        setCardOrderType('COMPANY');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.username && !order.name) {
      setOrder(curr => ({ ...curr, name: user.username }));
    }
  }, [user]);

  // Determine actual membership state
  const activeMembership = memberships.find(m => m.status === 'APPROVED');
  const pendingMembership = memberships.find(m => m.status === 'PENDING');
  const rejectedMembership = memberships.find(m => m.status === 'REJECTED');

  const membershipState: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'NO_COMPANY' =
    activeMembership ? 'ACTIVE' : pendingMembership ? 'PENDING' : rejectedMembership ? 'REJECTED' : 'NO_COMPANY';

  const isCompanySponsored = order.payer === 'COMPANY' && activeMembership?.payer === 'COMPANY';
  const total = isCompanySponsored ? 0 : Number(order.quantity || 0) * PRICE;

  function openJoinModal(company: any) {
    setTargetCompany(company);
    setJoinForm({
      official_email: activeMembership?.official_email || '',
      employee_id: activeMembership?.employee_code || '',
      payer: 'COMPANY',
    });
    setJoinErrors({});
    setModalApiError('');
  }

  function closeJoinModal() {
    if (!modalBusy) {
      setTargetCompany(null);
      setModalApiError('');
      setJoinErrors({});
    }
  }

  async function handleJoinSubmit(e: any) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!joinForm.official_email.trim()) {
      errs.official_email = 'Official work email is required.';
    } else if (!isValidEmail(joinForm.official_email)) {
      errs.official_email = 'Enter a valid email address.';
    }
    if (!joinForm.employee_id.trim()) {
      errs.employee_id = 'Employee ID or registration number is required.';
    }
    setJoinErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setModalBusy(true);
    setModalApiError('');
    try {
      const result: any = await api(`/memberships/${targetCompany.id}`, {
        method: 'POST',
        body: JSON.stringify({
          official_email: joinForm.official_email.trim(),
          employee_id: joinForm.employee_id.trim(),
          payer: joinForm.payer,
        }),
      });
      setTargetCompany(null);
      setChangeCompanyOpen(false);
      if (result.status === 'APPROVED') {
        setMessage(`Success! Your details matched ${targetCompany.name}'s roster. Membership is now active.`);
      } else {
        setMessage(`Request submitted to ${targetCompany.name}. Your details will be reviewed by the administrator.`);
      }
      await load();
    } catch (err: any) {
      setModalApiError(err.message);
    } finally {
      setModalBusy(false);
    }
  }

  async function selectCompany(value: string) {
    setSelected(value);
    setTemplates(value ? ((await api(`/employee/templates/${value}`)) as any[]) : []);
    setOrder({ ...order, template_id: '' });
  }

  async function checkout(isCompany: boolean) {
    setBusy(true);
    setError('');
    try {
      if (isCompany) {
        const companyId = selected || activeMembership?.company_id;
        if (!companyId) throw new Error('No active company selected.');
        const tId = Number(order.template_id);
        if (!tId || tId <= 0) throw new Error('Please select an approved company template.');
        const body = {
          quantity: Math.max(1, Number(order.quantity) || 1),
          template_id: tId,
          payer: order.payer || 'INDIVIDUAL',
        };
        const result: any = await api(`/employee/checkout/company/${companyId}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(`Order confirmed! ${result.quantity} ${result.quantity === 1 ? 'card' : 'cards'} generated; total ৳${result.total_amount}.`);
      } else {
        const nameVal = order.name?.trim() || user?.username || '';
        if (!nameVal) throw new Error('Full Name is required for personal visiting cards.');
        // Strictly exclude template_id so backend validation succeeds!
        const body: Record<string, any> = {
          quantity: Math.max(1, Number(order.quantity) || 1),
          payer: 'INDIVIDUAL',
          name: nameVal,
        };
        if (order.designation?.trim()) body.designation = order.designation.trim();
        if (order.department?.trim()) body.department = order.department.trim();
        if (order.phone?.trim()) body.phone = order.phone.trim();

        const result: any = await api('/employee/checkout/personal', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(`Personal card order confirmed! ${result.quantity} ${result.quantity === 1 ? 'personal card' : 'personal cards'} generated; total ৳${result.total_amount}.`);
      }
      await load();
      setCardSubView('vault');
    } catch (err: any) {
      setError(err.message || 'Failed to place card order');
    } finally {
      setBusy(false);
    }
  }

  const cardRows = [
    ...cards.map(card => ({ ...card, kind: 'company' as const })),
    ...personal.map(card => ({ ...card, kind: 'personal' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestCard = cardRows[0];

  const filteredCompanies = companies.filter(
    c =>
      (c.name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(companySearch.toLowerCase()) ||
      String(c.id).includes(companySearch)
  );

  const employeeName = user?.username || 'Team Member';

  /* ==============================================================================================
     VIEW A: MY PROFILE (UX Corrections A.1 - A.6)
     ============================================================================================== */
  if (tab === 'profile') {
    return (
      <div className="space-y-6">
        <PageTitle
          title="My Profile"
          subtitle="Your personal account credentials and organizational employment record."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Account Identifier */}
          <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h2 className="text-3xs font-extrabold text-royal uppercase tracking-wider">
              ACCOUNT IDENTIFIER
            </h2>
            <div className="mt-4 flex items-center gap-3.5">
              <span className="grid size-12 place-items-center rounded-2xl bg-lilac font-display text-lg font-bold text-royal">
                {employeeName.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong className="block text-base font-bold text-slate-900">{employeeName}</strong>
                <span className="text-xs text-slate-500">ID: #{user?.id || '—'}</span>
              </div>
            </div>

            <dl className="mt-6 divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <dt className="text-slate-500">Account Role</dt>
                <dd className="font-semibold text-slate-800">Employee</dd>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <dt className="text-slate-500">Account / Login Email</dt>
                <dd className="font-medium text-slate-800">{user?.email || '—'}</dd>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <dt className="text-slate-500">Total Cards Ordered</dt>
                <dd className="font-semibold text-slate-800">
                  {cardRows.length} {cardRows.length === 1 ? 'card' : 'cards'}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <dt className="text-slate-500">Order Transactions</dt>
                <dd className="font-semibold text-slate-800">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Section 2: Company Association */}
          <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h2 className="text-3xs font-extrabold text-royal uppercase tracking-wider">
              COMPANY ASSOCIATION
            </h2>
            <div className="mt-4">
              {membershipState === 'ACTIVE' && activeMembership ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="block text-base font-bold text-slate-900">
                        {activeMembership.company?.name}
                      </strong>
                      <span className="text-2xs text-slate-500 font-mono">
                        Workspace ID: #{activeMembership.company_id}
                      </span>
                    </div>
                    <StatusBadge value="ACTIVE" />
                  </div>

                  <dl className="mt-4 divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 flex justify-between items-center">
                      <dt className="text-slate-500">Employee ID</dt>
                      <dd className="font-mono font-bold text-slate-900">{activeMembership.employee_code}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between items-center">
                      <dt className="text-slate-500">Official Work Email</dt>
                      <dd className="font-medium text-slate-800">{activeMembership.official_email}</dd>
                    </div>
                    <div className="py-2.5 flex justify-between items-start">
                      <dt className="text-slate-500">Billing Responsibility</dt>
                      <dd className="text-right">
                        <strong className="block font-bold text-slate-900">
                          {activeMembership.payer === 'COMPANY' ? 'Company Covered' : 'Employee Self-Paid'}
                        </strong>
                        <span className="text-2xs text-slate-500">
                          {activeMembership.payer === 'COMPANY'
                            ? 'Employee payable: ৳0 (100% employer sponsored)'
                            : 'Employee payable: ৳50 per card'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : membershipState === 'PENDING' && pendingMembership ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="block text-base font-bold text-slate-900">
                        {pendingMembership.company?.name}
                      </strong>
                      <span className="text-2xs text-slate-500 font-mono">
                        Workspace ID: #{pendingMembership.company_id}
                      </span>
                    </div>
                    <StatusBadge value="PENDING" />
                  </div>
                  <dl className="mt-3 divide-y divide-slate-100 text-xs">
                    <div className="py-2 flex justify-between">
                      <dt className="text-slate-500">Submitted Employee ID</dt>
                      <dd className="font-mono font-bold text-slate-800">{pendingMembership.employee_code}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-slate-500">Official Work Email</dt>
                      <dd className="text-slate-800">{pendingMembership.official_email}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-2xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    Association request submitted. Awaiting administrator review.
                  </p>
                </div>
              ) : membershipState === 'REJECTED' && rejectedMembership ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="block text-base font-bold text-slate-900">
                        {rejectedMembership.company?.name}
                      </strong>
                      <span className="text-2xs text-slate-500 font-mono">
                        Workspace ID: #{rejectedMembership.company_id}
                      </span>
                    </div>
                    <StatusBadge value="REJECTED" />
                  </div>
                  <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    Association request was not approved. Please verify details with your HR team.
                  </p>
                </div>
              ) : (
                <div className="text-center py-5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No company currently linked. You are using an independent employee account.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4 !text-xs font-bold"
                    onClick={() => setTab?.('company')}
                  >
                    Connect to a Company →
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* ==============================================================================================
     VIEW B: COMPANY PAGE (UX Corrections B.1 - B.8)
     ============================================================================================== */
  if (tab === 'company') {
    return (
      <div className="space-y-6">
        <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

        <PageTitle
          title="Company Workspace"
          subtitle="Manage your organizational connection, view verified company credentials, and explore approved workplaces."
        />

        {/* B.2: When membership is ACTIVE, show connected company as PRIMARY content */}
        {membershipState === 'ACTIVE' && activeMembership ? (
          <div className="space-y-6">
            <section className="rounded-[24px] border border-[#bfe5d3] bg-[#f2fbf7] p-7 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                  {/* B.7: Monogram / Initials fallback */}
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#080d26] font-display text-xl font-bold text-white border border-[#1a2462] shadow-xs">
                    {activeMembership.company?.name?.charAt(0) || '🏢'}
                  </span>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">{activeMembership.company?.name}</h2>
                    <p className="text-2xs text-slate-500 font-mono mt-0.5">
                      Company Workspace ID: #{activeMembership.company_id}
                    </p>

                    {/* B.8: Clearly distinguish company verification from employee verification */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-300 px-3 py-1 text-3xs font-bold text-slate-700 shadow-2xs">
                        <span className="size-1.5 rounded-full bg-emerald-600" />
                        Verified Company Workspace
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3fa] border border-[#d8e3f3] px-3 py-1 text-3xs font-bold text-[#28528d] shadow-2xs">
                        <span className="size-1.5 rounded-full bg-[#2d62a8]" />
                        Verified Employee Membership
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="sun"
                    className="!px-5 !py-2.5 !text-xs font-bold"
                    onClick={() => {
                      setTab?.('card');
                      setCardOrderType('COMPANY');
                    }}
                  >
                    Order Company Cards ↗
                  </Button>
                </div>
              </div>

              {/* Company Details Grid */}
              <div className="mt-6 pt-5 border-t border-[#bfe5d3]/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-3xs uppercase font-bold tracking-wider">Employee ID</span>
                  <strong className="mt-0.5 block font-mono text-slate-900">{activeMembership.employee_code}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-3xs uppercase font-bold tracking-wider">Official Work Email</span>
                  <span className="mt-0.5 block text-slate-800">{activeMembership.official_email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-3xs uppercase font-bold tracking-wider">Website</span>
                  <span className="mt-0.5 block text-slate-800">{activeMembership.company?.website || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-3xs uppercase font-bold tracking-wider">Billing Policy</span>
                  <strong className="mt-0.5 block text-emerald-800 font-bold">
                    {activeMembership.payer === 'COMPANY' ? 'Company Covered (৳0)' : 'Employee Self-Paid'}
                  </strong>
                </div>
              </div>
            </section>

            {/* B.3 & B.4: Single Active Membership Policy & Request to Change Company Workflow */}
            <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Single Active Organization Policy</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Your account is actively linked to <strong>{activeMembership.company?.name}</strong>.
                    To maintain brand standards and authorization limits, employees hold one active company membership at a time.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  className="!text-xs font-bold"
                  onClick={() => setChangeCompanyOpen(!changeCompanyOpen)}
                >
                  {changeCompanyOpen ? 'Hide Transfer Workflow' : 'Request to Change Company'}
                </Button>
              </div>

              {changeCompanyOpen && (
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 mb-5 text-xs text-amber-900 leading-relaxed">
                    <strong>Notice:</strong> Submitting a request to another organization will replace your active membership with <strong>{activeMembership.company?.name}</strong> upon approval by the new company administrator.
                  </div>

                  <SectionHeading
                    title="Select New Organization to Request Transfer"
                    copy="Search approved organizations to submit credentials."
                    action={
                      <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-slate-900">
                        <span className="text-sm text-slate-400">⌕</span>
                        <input
                          className="bg-transparent px-2 py-1.5 text-xs outline-none w-48 sm:w-64"
                          placeholder="Search organizations…"
                          value={companySearch}
                          onChange={e => setCompanySearch(e.target.value)}
                        />
                      </div>
                    }
                  />

                  {/* B.5 & B.6: Distinct company records (never merging by name) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mt-4">
                    {filteredCompanies
                      .filter(c => c.id !== activeMembership.company_id)
                      .map(company => (
                        <div
                          key={company.id}
                          className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-[#fafbfc] p-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="grid size-10 place-items-center rounded-xl bg-[#080d26] font-display text-xs font-bold text-white border border-[#1a2462]">
                                {company.name?.charAt(0) || '🏢'}
                              </span>
                              <span className="text-3xs font-mono text-slate-400">ID: #{company.id}</span>
                            </div>
                            <h4 className="mt-3 text-sm font-bold text-slate-900">{company.name}</h4>
                            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                              {company.description || company.website || 'Verified corporate workspace'}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            className="mt-4 w-full !py-2 !text-xs font-bold"
                            onClick={() => openJoinModal(company)}
                          >
                            Request Transfer →
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* When NOT active: Show Pending / Directory with Request to Join */
          <div className="space-y-6">
            {membershipState === 'PENDING' && pendingMembership && (
              <div className="rounded-[24px] border border-amber-300 bg-amber-50/70 p-6 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-3xs font-extrabold uppercase tracking-wider text-amber-800">
                      ASSOCIATION PENDING REVIEW
                    </span>
                    <h2 className="mt-1 text-base font-bold text-slate-900">
                      {pendingMembership.company?.name} (Workspace #{pendingMembership.company_id})
                    </h2>
                    <p className="mt-2 text-xs text-slate-600">
                      Submitted Employee ID: <strong className="font-mono">{pendingMembership.employee_code}</strong> · {pendingMembership.official_email}
                    </p>
                    <p className="mt-2 text-xs text-amber-900 leading-relaxed">
                      {MATCH_HINTS[pendingMembership.match_status]?.text ||
                        'Your details are awaiting review by the company administrator.'}
                    </p>
                  </div>
                  <StatusBadge value="PENDING" />
                </div>
              </div>
            )}

            {/* Organizations Directory */}
            <section className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
              <SectionHeading
                title="Approved Organizations Directory"
                copy="Find your employer to submit official credentials and unlock verified branding."
                action={
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-slate-900">
                    <span className="text-sm text-slate-400">⌕</span>
                    <input
                      className="bg-transparent px-2 py-1.5 text-xs outline-none w-48 sm:w-64"
                      placeholder="Search company or ID…"
                      value={companySearch}
                      onChange={e => setCompanySearch(e.target.value)}
                    />
                  </div>
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mt-5">
                {filteredCompanies.map(company => {
                  const membership = memberships.find(item => item.company_id === company.id);
                  const isPendingThisCompany = pendingMembership?.company_id === company.id;

                  return (
                    <div
                      key={company.id}
                      className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-[#fafbfc] p-5 hover:bg-white hover:shadow-xs transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-[#080d26] font-display text-xs font-bold text-white border border-[#1a2462]">
                            {company.name?.charAt(0) || '🏢'}
                          </span>
                          <span className="text-3xs font-mono text-slate-400">Workspace #{company.id}</span>
                        </div>

                        <h3 className="mt-3 text-sm font-bold text-slate-900">{company.name}</h3>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {company.description || company.website || 'Verified corporate workspace'}
                        </p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-200/60">
                        {isPendingThisCompany ? (
                          <span className="text-xs font-medium text-amber-700">⏳ Request Pending Review</span>
                        ) : (
                          <Button
                            variant="secondary"
                            className="w-full !py-2 !text-xs font-bold"
                            onClick={() => openJoinModal(company)}
                          >
                            Request to join →
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  /* ==============================================================================================
     VIEW C: MY CARD PAGE — VISITING CARD STUDIO (Interactive 2-Column Real-time Design Studio)
     ============================================================================================== */
  if (tab === 'card') {
    const isCompanySponsored = order.payer === 'COMPANY' && activeMembership?.payer === 'COMPANY';
    const total = isCompanySponsored ? 0 : Number(order.quantity || 1) * PRICE;
    const selectedTemplateObj = templates.find(t => String(t.id) === String(order.template_id));
    const QUANTITY_PRESETS = [20, 50, 100, 250, 500];

    return (
      <div className="space-y-6">
        <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

        {/* Top Header with Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageTitle
            title="Visiting Card Studio"
            subtitle="Design, preview in real-time, and order official 300 DPI vector business cards for personal or corporate use."
          />

          {/* Sub-toggle: Studio Designer vs Card Vault */}
          <div className="flex items-center rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xs">
            <button
              type="button"
              className={cx(
                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all',
                cardSubView === 'order'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
              onClick={() => setCardSubView('order')}
            >
              <span>✦</span> Card Designer
            </button>
            <button
              type="button"
              className={cx(
                'flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all',
                cardSubView === 'vault'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
              onClick={() => setCardSubView('vault')}
            >
              <span>🗄️</span> Card Vault
              <span
                className={cx(
                  'ml-1 rounded-full px-2 py-0.5 text-3xs font-extrabold',
                  cardSubView === 'vault' ? 'bg-[#2d62a8] text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                )}
              >
                {cardRows.length}
              </span>
            </button>
          </div>
        </div>

        {cardSubView === 'order' ? (
          <div className="space-y-6">
            {/* Step 1: Card-Type Selection Pattern */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 01: Personal Visiting Card */}
              <button
                type="button"
                onClick={() => setCardOrderType('PERSONAL')}
                className={cx(
                  'relative rounded-2xl border p-5 text-left transition-all',
                  cardOrderType === 'PERSONAL'
                    ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-xs'
                    : 'border-slate-200 bg-[#fafbfc] hover:border-slate-300 hover:bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-500">
                    Option 01
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-3xs font-bold text-slate-700">
                    ৳{PRICE} / card
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={cx(
                    'size-2.5 rounded-full',
                    cardOrderType === 'PERSONAL' ? 'bg-[#2d62a8]' : 'bg-slate-300'
                  )} />
                  <strong className="text-base font-bold text-slate-900">Personal Visiting Card</strong>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Direct personal contact card. Customize your designation, phone, and styling. Generated instantly without waiting for company approval.
                </p>
              </button>

              {/* Option 02: Company Branded Card */}
              <button
                type="button"
                disabled={membershipState !== 'ACTIVE'}
                onClick={() => setCardOrderType('COMPANY')}
                className={cx(
                  'relative rounded-2xl border p-5 text-left transition-all',
                  membershipState !== 'ACTIVE'
                    ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50'
                    : cardOrderType === 'COMPANY'
                    ? 'border-[#2d62a8] bg-white ring-2 ring-[#2d62a8]/15 shadow-xs'
                    : 'border-slate-200 bg-[#fafbfc] hover:border-slate-300 hover:bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-extrabold uppercase tracking-wider text-[#2d62a8]">
                    Option 02
                  </span>
                  {membershipState === 'ACTIVE' ? (
                    <span className="rounded-full bg-[#eef3fa] border border-[#d8e3f3] px-2.5 py-0.5 text-3xs font-bold text-[#28528d]">
                      {activeMembership?.payer === 'COMPANY' ? 'Company Covered (৳0)' : 'Self-Paid'}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-3xs font-bold text-amber-800">
                      Requires Active Company Member
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={cx(
                    'size-2.5 rounded-full',
                    cardOrderType === 'COMPANY' ? 'bg-royal' : 'bg-slate-300'
                  )} />
                  <strong className="text-base font-bold text-slate-900">Company Branded Card</strong>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Official corporate cards formatted to your verified organization&apos;s approved brand standard and verified templates.
                </p>
              </button>
            </div>

            {/* Step 2: Interactive 2-Column Studio Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Form & Configuration (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                {cardOrderType === 'PERSONAL' ? (
                  /* Personal Card Studio Controls */
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xs space-y-5">
                    <SectionHeading
                      title="Personal Card Customization"
                      copy="Fill in your contact and designation details. The live preview updates automatically."
                    />

                    {/* Inputs */}
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          placeholder="e.g. Alex Rahman"
                          value={order.name}
                          onChange={e => setOrder({ ...order, name: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                            Professional Title / Designation
                          </label>
                          <input
                            className={inputClass}
                            placeholder="e.g. Senior Software Architect"
                            value={order.designation}
                            onChange={e => setOrder({ ...order, designation: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                            Department / Field
                          </label>
                          <input
                            className={inputClass}
                            placeholder="e.g. Product Engineering"
                            value={order.department}
                            onChange={e => setOrder({ ...order, department: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                            Phone Number
                          </label>
                          <input
                            className={inputClass}
                            placeholder="e.g. +880 1712 345678"
                            value={order.phone}
                            onChange={e => setOrder({ ...order, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                            Contact Email (Pre-filled)
                          </label>
                          <input
                            className={cx(inputClass, 'bg-slate-50 text-slate-600 cursor-not-allowed')}
                            disabled
                            value={user?.email || 'contact@bizcard.me'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quantity Presets & Selector */}
                    <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          Print Batch Quantity
                        </label>
                        <span className="text-3xs font-mono text-slate-500">Rate: ৳{PRICE} / card</span>
                      </div>

                      {/* Preset Chips */}
                      <div className="flex flex-wrap gap-2">
                        {QUANTITY_PRESETS.map(qty => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => setOrder({ ...order, quantity: qty })}
                            className={cx(
                              'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                              Number(order.quantity) === qty
                                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            )}
                          >
                            {qty} cards
                          </button>
                        ))}
                      </div>

                      {/* Custom Stepper Input */}
                      <div className="pt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-500">Custom count:</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={order.quantity}
                          onChange={e =>
                            setOrder({
                              ...order,
                              quantity: Math.max(1, Math.min(1000, Number(e.target.value) || 1)),
                            })
                          }
                          className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-900"
                        />
                        <span className="text-3xs text-slate-400 font-mono">(1 - 1,000 max)</span>
                      </div>
                    </div>

                    {/* Order Price & Prepress Breakdown */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Unit Rate</span>
                        <span className="font-mono">৳{PRICE} / card</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Batch Size</span>
                        <span className="font-semibold text-slate-800">{Number(order.quantity || 1)} cards</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Vector Prepress (300 DPI PDF)</span>
                        <span className="font-bold text-emerald-700 text-3xs uppercase">Included (Free)</span>
                      </div>
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-900">Total Amount Payable</span>
                        <div className="text-right">
                          <strong className="text-lg font-extrabold text-slate-900">৳{total}</strong>
                          <span className="block text-3xs text-slate-400 font-mono">
                            ({Number(order.quantity || 1)} × ৳{PRICE})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Action Button */}
                    <Button
                      disabled={busy || !order.name.trim()}
                      variant="primary"
                      className="w-full !py-4 !text-sm font-bold shadow-sm"
                      onClick={() => checkout(false)}
                    >
                      {busy
                        ? 'Generating cards…'
                        : `Confirm & Order Personal Cards (৳${total}) →`}
                    </Button>
                  </div>
                ) : (
                  /* Company Branded Card Studio Controls */
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xs space-y-5">
                    <SectionHeading
                      title="Company Branded Card Order"
                      copy={`Official visiting cards locked to ${activeMembership?.company?.name || 'your company'} brand standard.`}
                    />

                    {membershipState !== 'ACTIVE' ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
                        <h4 className="text-sm font-bold text-amber-900">Active Membership Required</h4>
                        <p className="mt-1 text-xs text-amber-800 leading-relaxed max-w-md mx-auto">
                          Company branded cards require an approved employee membership. Connect with your organization in the Company tab to unlock corporate templates.
                        </p>
                        <Button
                          variant="secondary"
                          className="mt-4 !text-xs font-bold"
                          onClick={() => setTab?.('company')}
                        >
                          Go to Company Tab →
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Auto-populated Verified Profile Summary */}
                        <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-xs">
                          <span className="text-3xs font-extrabold uppercase tracking-wider text-royal block">
                            VERIFIED ROSTER IDENTITY
                          </span>
                          <div className="mt-2.5 grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-400 block text-3xs">Employee Name</span>
                              <strong className="text-slate-800">{user?.username}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-3xs">Verified Employee ID</span>
                              <strong className="font-mono text-slate-800">{activeMembership?.employee_code}</strong>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400 block text-3xs">Official Work Email</span>
                              <span className="text-slate-800 font-mono">{activeMembership?.official_email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Approved Template Selection */}
                        <div>
                          <label className="mb-1.5 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                            Approved Company Template <span className="text-red-500">*</span>
                          </label>
                          <select
                            className={inputClass}
                            value={order.template_id}
                            onChange={e => setOrder({ ...order, template_id: e.target.value })}
                          >
                            <option value="">Select an approved company template…</option>
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.style_key || 'Standard'})
                              </option>
                            ))}
                          </select>
                          {!order.template_id && (
                            <p className="mt-1.5 text-2xs text-amber-800">
                              Please select an approved brand template above to proceed with your order.
                            </p>
                          )}
                        </div>

                        {/* Billing Policy Display */}
                        <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Billing Responsibility</span>
                            <strong className="text-slate-900">
                              {activeMembership?.payer === 'COMPANY'
                                ? `Billed to ${activeMembership.company?.name}`
                                : 'Employee Self-Paid'}
                            </strong>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                            <span className="text-slate-500">Employee Cost</span>
                            <strong className={activeMembership?.payer === 'COMPANY' ? 'text-emerald-700' : 'text-slate-900'}>
                              {activeMembership?.payer === 'COMPANY' ? '৳0 (100% Company Covered)' : `৳${PRICE} / card`}
                            </strong>
                          </div>
                        </div>

                        {/* Quantity Presets & Selector */}
                        <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800">
                              Print Batch Quantity
                            </label>
                            <span className="text-3xs font-mono text-slate-500">Standard batch</span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {QUANTITY_PRESETS.map(qty => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => setOrder({ ...order, quantity: qty })}
                                className={cx(
                                  'px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                                  Number(order.quantity) === qty
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                )}
                              >
                                {qty} cards
                              </button>
                            ))}
                          </div>

                          <div className="pt-2 flex items-center gap-3">
                            <span className="text-xs text-slate-500">Custom count:</span>
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={order.quantity}
                              onChange={e =>
                                setOrder({
                                  ...order,
                                  quantity: Math.max(1, Math.min(1000, Number(e.target.value) || 1)),
                                })
                              }
                              className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-slate-900"
                            />
                            <span className="text-3xs text-slate-400 font-mono">(1 - 1,000 max)</span>
                          </div>
                        </div>

                        {/* Price Summary */}
                        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Batch Size</span>
                            <span className="font-semibold text-slate-800">{Number(order.quantity || 1)} cards</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Vector Prepress (300 DPI PDF)</span>
                            <span className="font-bold text-emerald-700 text-3xs uppercase">Included (Free)</span>
                          </div>
                          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                            <span className="font-bold text-slate-900">Total Payable</span>
                            {isCompanySponsored ? (
                              <div className="text-right">
                                <strong className="text-lg font-extrabold text-emerald-700">৳0</strong>
                                <span className="block text-3xs text-emerald-600">
                                  100% Covered by {activeMembership?.company?.name}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <strong className="text-lg font-extrabold text-slate-900">৳{total}</strong>
                                <span className="block text-3xs text-slate-400 font-mono">
                                  ({Number(order.quantity || 1)} × ৳{PRICE})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Primary Action Button */}
                        <Button
                          disabled={busy || !order.template_id}
                          variant="sun"
                          className="w-full !py-4 !text-sm font-bold shadow-sm"
                          onClick={() => checkout(true)}
                        >
                          {busy
                            ? 'Generating company cards…'
                            : order.template_id
                            ? `Confirm & Order Company Cards (${isCompanySponsored ? '৳0' : '৳' + total}) →`
                            : 'Select a template to place order'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Sticky Live Card Preview (lg:col-span-5) */}
              <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
                <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-700">
                        Live Interactive Card Studio
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-3xs font-mono font-bold text-slate-600">
                      300 DPI Prepress
                    </span>
                  </div>

                  {/* Real-time Card Mockup */}
                  <LiveCardPreview
                    theme={cardTheme}
                    name={order.name || user?.username || ''}
                    designation={order.designation}
                    department={order.department}
                    phone={order.phone}
                    email={
                      cardOrderType === 'COMPANY'
                        ? (activeMembership?.official_email || user?.email || '')
                        : (user?.email || 'contact@bizcard.me')
                    }
                    companyName={activeMembership?.company?.name}
                    isCompany={cardOrderType === 'COMPANY'}
                    templateName={selectedTemplateObj?.name}
                  />

                  {/* Theme Switcher for Personal Cards */}
                  {cardOrderType === 'PERSONAL' && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Card Aesthetic Finish
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'navy', label: 'TechKnowGram Navy', color: 'bg-[#080d26]', dot: 'bg-[#2d62a8]' },
                          { key: 'clean', label: 'Pure White', color: 'bg-white border border-slate-300', dot: 'bg-slate-900' },
                          { key: 'royal', label: 'Imperial Violet', color: 'bg-[#1d1338]', dot: 'bg-[#efb53e]' },
                        ].map(t => (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => setCardTheme(t.key as any)}
                            className={cx(
                              'flex items-center gap-2 p-2 rounded-xl text-left border text-3xs font-bold transition-all',
                              cardTheme === t.key
                                ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <span className={cx('size-3.5 rounded-full shrink-0 flex items-center justify-center', t.color)}>
                              <span className={cx('size-1 rounded-full', t.dot)} />
                            </span>
                            <span className="truncate text-slate-800">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="mt-4 text-center text-3xs text-slate-400 leading-relaxed">
                    ✦ Visual card updates in real-time as you enter contact and styling specifications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Card Vault Archive View */
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Visiting Card Archive Vault</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Download high-resolution 300 DPI vector PDF files ready for professional offset or digital printing.
                </p>
              </div>
              <Button
                variant="secondary"
                className="!text-xs font-bold"
                onClick={() => setCardSubView('order')}
              >
                + Order More Cards
              </Button>
            </div>

            {cardRows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                {cardRows.map(c => {
                  const isPersonal = c.kind === 'personal';
                  return (
                    <div
                      key={`${c.kind}-${c.id}`}
                      className="rounded-[22px] border border-slate-200/90 bg-[#fafbfc] p-5 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Mini Card Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cx(
                              'rounded-full px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider',
                              isPersonal
                                ? 'bg-slate-200/70 text-slate-700'
                                : 'bg-[#eef3fa] text-[#28528d] border border-[#d8e3f3]'
                            )}
                          >
                            {isPersonal ? 'Personal Card' : 'Company Branded'}
                          </span>
                          <span className="text-3xs font-mono text-slate-400">
                            #{c.id}
                          </span>
                        </div>

                        {/* Mini Card Mockup Representation */}
                        <div
                          className={cx(
                            'mt-3.5 aspect-[1.75/1] rounded-xl p-3.5 flex flex-col justify-between text-white shadow-inner select-none',
                            isPersonal
                              ? 'bg-gradient-to-br from-[#080d26] to-[#101845] border border-[#1a2462]'
                              : 'bg-gradient-to-br from-[#1c1438] to-[#0e071e] border border-[#392b63]'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#8eaee0] truncate">
                              {isPersonal ? 'Personal' : (activeMembership?.company?.name || 'Company')}
                            </span>
                            <span className="text-3xs font-mono opacity-60">300 DPI</span>
                          </div>
                          <div>
                            <strong className="block text-xs font-bold truncate">
                              {c.file_name}
                            </strong>
                            <span className="block text-3xs opacity-75">
                              {new Date(c.created_at).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-3xs opacity-70">
                            <span>Vector Print PDF</span>
                            <span>✓ Certified</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-3xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            Status: <StatusBadge value={c.status} />
                          </span>
                          <span className="font-mono">{c.file_size ? `${Math.ceil(c.file_size / 1024)} KB` : 'Vector PDF'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3.5 border-t border-slate-200/70 flex items-center gap-2">
                        <Button
                          variant="primary"
                          className="w-full !py-2 !text-xs font-bold"
                          onClick={() =>
                            download(
                              isPersonal
                                ? `/employee/personal-cards/${c.id}/download`
                                : `/employee/cards/${c.id}/download`,
                              c.file_name
                            )
                          }
                        >
                          Download PDF ↓
                        </Button>
                        {!isPersonal && c.verification_token && (
                          <a
                            href={`/verify/${c.verification_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-full border border-slate-200 text-3xs font-bold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            Verify ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <span className="text-3xl block mb-2">🗄️</span>
                <p className="text-sm font-bold text-slate-700">No visiting cards generated yet.</p>
                <p className="mt-1 text-xs text-slate-400">Order your first batch using the Card Designer.</p>
                <Button
                  variant="secondary"
                  className="mt-4 !text-xs font-bold"
                  onClick={() => setCardSubView('order')}
                >
                  Open Card Designer →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ==============================================================================================
     VIEW D: ORDERS (GOV.UK Table Standard)
     ============================================================================================== */
  if (tab === 'orders') {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Orders & Transactions"
          subtitle="Complete transparent record of personal checkouts and company-sponsored orders."
        />

        <div className="rounded-[24px] border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Order Reference</th>
                    <th className={thClass}>Quantity & Rate</th>
                    <th className={thClass}>Payer Account</th>
                    <th className={thClass}>Total Amount</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className={tdClass}>
                        <strong className="font-mono text-xs text-slate-900 font-bold">#{o.id}</strong>
                      </td>
                      <td className={tdClass}>
                        <span className="text-xs text-slate-700">
                          {o.quantity} {o.quantity === 1 ? 'card' : 'cards'} × ৳{o.unit_price}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-block rounded-md bg-lilac px-2.5 py-0.5 text-3xs font-semibold text-royal uppercase">
                          {o.payer === 'COMPANY' ? 'Company sponsored' : 'Self paid'}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <strong className="text-sm font-extrabold text-slate-900">৳{o.total_amount}</strong>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge value={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">No checkout orders placed yet.</div>
          )}
        </div>
      </div>
    );
  }

  /* ==============================================================================================
     VIEW E: HELP
     ============================================================================================== */
  if (tab === 'help') {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Employee Support & Guidance"
          subtitle="Frequently asked questions about company verification, card printing, and billing."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">How does company verification work?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              When you submit your official company email and employee ID, BizCard compares it against the company roster.
              If an exact match is found, your membership is activated immediately. If not, it is forwarded to your
              company administrator for manual approval.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">Can I order cards without a company?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Yes. You can order independent personal visiting cards at any time at the standard rate of ৳50 per card
              without joining or waiting for any organization approval.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">Who pays for my company cards?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              If your company has designated card orders as company-sponsored, the checkout total is ৳0 (Free for you).
              You can also select self-payment if you prefer to cover your own card orders.
            </p>
          </div>

          <div className="rounded-[20px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900">How do I download and print?</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Navigate to the &quot;My Card&quot; tab and select &quot;Card Vault&quot;. Click &quot;Download PDF&quot; on any card to get a 300
              DPI vector PDF file ready for any commercial printing house.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ==============================================================================================
     DEFAULT VIEW: OVERVIEW
     ============================================================================================== */
  return (
    <div className="space-y-6">
      <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

      <PageTitle
        title={`Welcome, ${employeeName}`}
        subtitle={
          membershipState === 'ACTIVE'
            ? `Verified employee at ${activeMembership.company?.name}. Access corporate templates or order personal cards below.`
            : membershipState === 'PENDING'
            ? `Your membership request with ${pendingMembership.company?.name} is currently under review.`
            : membershipState === 'REJECTED'
            ? 'Your previous company association request was not approved. You can correct details or connect with another company.'
            : 'You are using an independent account. Connect with your employer or order personal cards anytime.'
        }
      />

      {/* STATE B: PENDING REQUEST BANNER */}
      {membershipState === 'PENDING' && pendingMembership && (
        <div className="rounded-[24px] border border-amber-300 bg-amber-50/70 p-6 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-amber-800">
                MEMBERSHIP REQUEST UNDER REVIEW
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Awaiting approval by {pendingMembership.company?.name} (Workspace #{pendingMembership.company_id})
              </h2>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Submitted ID: </span>
                  <strong className="font-mono text-slate-800">{pendingMembership.employee_code}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Official Work Email: </span>
                  <span className="text-slate-800">{pendingMembership.official_email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Requested: </span>
                  <span>{new Date(pendingMembership.requested_at).toLocaleDateString()}</span>
                </div>
              </dl>
              <p className="mt-3 text-xs text-amber-900/90 leading-relaxed max-w-2xl">
                {MATCH_HINTS[pendingMembership.match_status]?.text ||
                  'Your request has been forwarded to the company administrator. No duplicate submission is needed.'}
              </p>
            </div>
            <StatusBadge value="PENDING" />
          </div>
        </div>
      )}

      {/* STATE D: REJECTED REQUEST BANNER */}
      {membershipState === 'REJECTED' && rejectedMembership && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-6 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-rose-800">
                MEMBERSHIP REQUEST NOT APPROVED
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Request rejected by {rejectedMembership.company?.name} (Workspace #{rejectedMembership.company_id})
              </h2>
              <p className="mt-2 text-xs text-slate-600">
                Submitted Employee ID: <strong className="font-mono">{rejectedMembership.employee_code}</strong> · {rejectedMembership.official_email}
              </p>
              <p className="mt-2 text-xs text-rose-800 leading-relaxed max-w-2xl">
                Please check with your company HR to verify your active employee ID and email, or browse other organizations in the Company tab.
              </p>
            </div>
            <StatusBadge value="REJECTED" />
          </div>
        </div>
      )}

      {/* STATE C: ACTIVE VERIFIED MEMBERSHIP HUB */}
      {membershipState === 'ACTIVE' && activeMembership && (
        <div className="rounded-[24px] border border-[#bfe5d3] bg-[#f2fbf7] p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#080d26] font-extrabold text-white shadow-xs text-lg border border-[#1a2462]">
                {activeMembership.company?.name?.charAt(0) || '🏢'}
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <strong className="text-base font-bold text-slate-900">{activeMembership.company?.name}</strong>
                  <StatusBadge value="ACTIVE" />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Employee ID: <strong className="font-mono text-slate-800">{activeMembership.employee_code}</strong> · {activeMembership.official_email} ·{' '}
                  <span className="font-semibold text-emerald-800">
                    {activeMembership.payer === 'COMPANY' ? 'Company Covered (৳0)' : 'Employee Self-Paid'}
                  </span>
                </p>
              </div>
            </div>

            <Button
              variant="sun"
              className="!px-6 !py-3 !text-sm font-bold shadow-xs"
              onClick={() => {
                setTab?.('card');
                setCardOrderType('COMPANY');
              }}
            >
              Order New Cards ↗
            </Button>
          </div>
        </div>
      )}

      {/* 2-COLUMN SUMMARY: LATEST CARD & RECENT ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Card Preview */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
          <SectionHeading
            title="My Visiting Card"
            copy="Instant download of your latest print-ready visiting card file."
            action={
              latestCard && (
                <button
                  type="button"
                  className="text-xs font-bold text-royal hover:underline"
                  onClick={() => setTab?.('card')}
                >
                  View all ({cardRows.length}) →
                </button>
              )
            }
          />

          {latestCard ? (
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-[#fafbfc] p-5">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-mono font-bold uppercase text-slate-400">
                  {latestCard.kind === 'personal' ? 'Personal Card' : 'Company Branded'}
                </span>
                <span className="text-3xs text-slate-400">{new Date(latestCard.created_at).toLocaleDateString()}</span>
              </div>
              <strong className="mt-2 block text-sm font-bold text-slate-900">{latestCard.file_name}</strong>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200/70">
                <span className="text-2xs text-slate-500 font-medium">Vector PDF · 300 DPI</span>
                <Button
                  variant="primary"
                  className="!px-3.5 !py-1.5 !text-xs font-bold"
                  onClick={() =>
                    download(
                      latestCard.kind === 'personal'
                        ? `/employee/personal-cards/${latestCard.id}/download`
                        : `/employee/cards/${latestCard.id}/download`,
                      latestCard.file_name
                    )
                  }
                >
                  Download PDF ↓
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
              No visiting cards generated yet.
              <div className="mt-3">
                <Button variant="secondary" className="!text-xs font-bold" onClick={() => setTab?.('card')}>
                  Order your first card →
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
          <SectionHeading
            title="Recent Orders"
            copy="Status of your recent visiting card print orders."
            action={
              orders.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-bold text-royal hover:underline"
                  onClick={() => setTab?.('orders')}
                >
                  View order history →
                </button>
              )
            }
          />

          {orders.length > 0 ? (
            <div className="mt-4 divide-y divide-slate-100">
              {orders.slice(0, 3).map(o => (
                <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <strong className="font-mono text-slate-900 font-bold">Order #{o.id}</strong>
                    <span className="ml-2 text-slate-500">
                      {o.quantity} {o.quantity === 1 ? 'card' : 'cards'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong className="font-extrabold text-slate-900">৳{o.total_amount}</strong>
                    <StatusBadge value={o.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
              No orders placed yet.
            </div>
          )}
        </div>
      </div>

      {/* STATE A / REJECTED: SEARCH & CONNECT TO A COMPANY */}
      {(membershipState === 'NO_COMPANY' || membershipState === 'REJECTED') && (
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
          <SectionHeading
            title="Connect to Your Company Workspace"
            copy="Find your employer and submit your official credentials to unlock corporate templates."
            action={
              <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-slate-900">
                <span className="text-sm text-slate-400">⌕</span>
                <input
                  className="bg-transparent px-2 py-1.5 text-xs outline-none w-48 sm:w-64"
                  placeholder="Search by company or ID…"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                />
              </div>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mt-5">
            {filteredCompanies.slice(0, 6).map(c => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-[#fafbfc] p-5 hover:bg-white hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-10 place-items-center rounded-xl bg-[#080d26] font-display text-xs font-bold text-white border border-[#1a2462]">
                      {c.name?.charAt(0) || '🏢'}
                    </span>
                    <span className="text-3xs font-mono text-slate-400">ID: #{c.id}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-900">{c.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{c.description || 'Corporate workspace'}</p>
                </div>
                <Button
                  variant="secondary"
                  className="mt-4 w-full !py-2 !text-xs font-bold"
                  onClick={() => openJoinModal(c)}
                >
                  Connect to {c.name} →
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: JOIN COMPANY VERIFICATION DIALOG */}
      {targetCompany && (
        <ReviewDialog
          title={`Connect to ${targetCompany.name}`}
          eyebrow="EMPLOYEE VERIFICATION"
          busy={modalBusy}
          onClose={closeJoinModal}
        >
          <p className="mb-5 text-xs leading-relaxed text-slate-600">
            Enter your official credentials for <strong>{targetCompany.name}</strong> (Workspace #{targetCompany.id}). If your details match the
            company roster, your membership activates automatically. Otherwise, it will be forwarded to the company
            administrator for manual review.
          </p>

          <form onSubmit={handleJoinSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Official Work Email <span className="text-red-500">*</span>
                </label>
                <input
                  className={cx(inputClass, joinErrors.official_email && 'border-red-500')}
                  type="email"
                  placeholder="e.g. yourname@company.com"
                  value={joinForm.official_email}
                  disabled={modalBusy}
                  onChange={e => {
                    setJoinForm({ ...joinForm, official_email: e.target.value });
                    setJoinErrors({ ...joinErrors, official_email: undefined });
                  }}
                />
                {joinErrors.official_email && (
                  <span className="mt-1 block text-3xs text-red-600">{joinErrors.official_email}</span>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Employee ID / Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  className={cx(inputClass, joinErrors.employee_id && 'border-red-500')}
                  type="text"
                  placeholder="e.g. BSH-1001 or EMP-001"
                  value={joinForm.employee_id}
                  disabled={modalBusy}
                  onChange={e => {
                    setJoinForm({ ...joinForm, employee_id: e.target.value });
                    setJoinErrors({ ...joinErrors, employee_id: undefined });
                  }}
                />
                {joinErrors.employee_id && (
                  <span className="mt-1 block text-3xs text-red-600">{joinErrors.employee_id}</span>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Card Sponsorship Preference</label>
                <select
                  className={inputClass}
                  value={joinForm.payer}
                  disabled={modalBusy}
                  onChange={e => setJoinForm({ ...joinForm, payer: e.target.value })}
                >
                  <option value="COMPANY">Company sponsored (Default)</option>
                  <option value="INDIVIDUAL">I pay for cards (Individual)</option>
                </select>
                <small className="mt-1 block text-3xs text-slate-400">
                  Select whether card orders are billed to the company or self-sponsored.
                </small>
              </div>
            </div>

            {modalApiError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                {modalApiError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5 border-t border-slate-100 pt-4">
              <Button variant="secondary" disabled={modalBusy} onClick={closeJoinModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={modalBusy}>
                {modalBusy ? 'Submitting…' : 'Submit Verification Request'}
              </Button>
            </div>
          </form>
        </ReviewDialog>
      )}
    </div>
  );
}
