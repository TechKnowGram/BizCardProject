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
  ROSTER_MATCHED: { text: 'Verified with company roster. Membership activated automatically.', tone: 'bg-mint/20 text-slate-800 border-mint' },
  ID_MISMATCH: { text: 'Employee ID was recognized but email differs. Company admin will review.', tone: 'bg-lemon/30 text-amber-900 border-lemon' },
  NOT_FOUND: { text: 'Your details will be reviewed by the company administrator.', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  INACTIVE_EMPLOYEE: { text: 'Roster record is currently inactive. Awaiting administrator review.', tone: 'bg-blush/30 text-rose-900 border-blush' },
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
    setJoinForm({ official_email: '', employee_id: '', payer: 'COMPANY' });
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
      errs.official_email = 'Official company email is required.';
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
      const path = isCompany ? `/employee/checkout/company/${selected}` : '/employee/checkout/personal';
      const body = isCompany
        ? { quantity: Number(order.quantity), template_id: Number(order.template_id), payer: order.payer }
        : { ...order, quantity: Number(order.quantity) };
      const result: any = await api(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage(`Payment complete! ${result.quantity} card${result.quantity > 1 ? 's' : ''} created; total ৳${result.total_amount}.`);
      await load();
      setCardSubView('vault');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const cardRows = [
    ...cards.map(card => ({ ...card, kind: 'company' })),
    ...personal.map(card => ({ ...card, kind: 'personal' })),
  ];
  const latestCard = cardRows[0];

  const filteredCompanies = companies.filter(
    c =>
      (c.name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(companySearch.toLowerCase())
  );

  const employeeName = user?.username || 'Team Member';

  /* ==============================================================================================
     VIEW: MY PROFILE
     ============================================================================================== */
  if (tab === 'profile') {
    return (
      <div className="space-y-6">
        <PageTitle
          title="My Profile"
          subtitle="Your personal account credentials and organizational employment record."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Account Credentials */}
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-3xs text-royal">
              ACCOUNT IDENTIFIER
            </h3>
            <div className="mt-4 flex items-center gap-3.5">
              <span className="grid size-12 place-items-center rounded-2xl bg-lilac font-display text-lg font-bold text-royal">
                {employeeName.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong className="block text-base font-bold text-slate-900">{employeeName}</strong>
                <span className="text-xs text-slate-500">{user?.email || 'Individual employee'}</span>
              </div>
            </div>

            <dl className="mt-6 divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Account Role</dt>
                <dd className="font-semibold text-slate-800">Employee Workspace</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Total Cards Ordered</dt>
                <dd className="font-semibold text-slate-800">{cardRows.length} cards</dd>
              </div>
              <div className="py-2.5 flex justify-between">
                <dt className="text-slate-500">Order Transactions</dt>
                <dd className="font-semibold text-slate-800">{orders.length} orders</dd>
              </div>
            </dl>
          </div>

          {/* Organizational Employment Record */}
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-3xs text-royal">
              COMPANY ASSOCIATION
            </h3>
            <div className="mt-4">
              {membershipState === 'ACTIVE' && activeMembership ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="block text-base font-bold text-slate-900">
                        {activeMembership.company?.name}
                      </strong>
                      <small className="text-xs text-emerald-700 font-semibold">✓ Verified Active Member</small>
                    </div>
                    <StatusBadge value="ACTIVE" />
                  </div>
                  <dl className="mt-4 divide-y divide-slate-100 text-xs">
                    <div className="py-2 flex justify-between">
                      <dt className="text-slate-500">Employee ID</dt>
                      <dd className="font-mono font-bold text-slate-900">{activeMembership.employee_code}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-slate-500">Official Email</dt>
                      <dd className="font-medium text-slate-800">{activeMembership.official_email}</dd>
                    </div>
                    <div className="py-2 flex justify-between">
                      <dt className="text-slate-500">Card Sponsorship</dt>
                      <dd className="font-bold text-emerald-700">
                        {activeMembership.payer === 'COMPANY' ? 'Company Sponsored (৳0)' : 'Self Paid'}
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
                      <small className="text-xs text-amber-700 font-medium">⏳ Association Under Review</small>
                    </div>
                    <StatusBadge value="PENDING" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Employee ID {pendingMembership.employee_code} was submitted for verification.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500">
                    No active company linked. You can search and connect with your employer in the Company tab.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4 !text-xs font-bold"
                    onClick={() => setTab?.('company')}
                  >
                    Browse Companies →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==============================================================================================
     VIEW: COMPANY (Directory & Association Hub)
     ============================================================================================== */
  if (tab === 'company') {
    return (
      <div className="space-y-6">
        <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

        <PageTitle
          title="Company Workspaces"
          subtitle="Explore registered corporate workspaces, verify your employment credentials, or inspect your connected organization."
        />

        {/* If Active, show Active Company Profile */}
        {membershipState === 'ACTIVE' && activeMembership && (
          <div className="rounded-[24px] border border-[#bfe5d3] bg-[#f2fbf7] p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-white font-extrabold text-royal shadow-xs text-lg">
                  {activeMembership.company?.name?.charAt(0) || '🏢'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-lg font-bold text-slate-900">{activeMembership.company?.name}</strong>
                    <StatusBadge value="ACTIVE" />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Verified Employee ID: <strong className="font-mono text-slate-900">{activeMembership.employee_code}</strong> · {activeMembership.official_email}
                  </p>
                </div>
              </div>

              <Button
                variant="sun"
                className="!px-5 !py-2 !text-xs font-bold"
                onClick={() => setTab?.('card')}
              >
                Order Company Cards ↗
              </Button>
            </div>
          </div>
        )}

        {/* Company Directory Search & List */}
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
          <SectionHeading
            title="Registered Organizations Directory"
            copy="Search approved organizations to submit credentials and verify employment."
            action={
              <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-slate-900">
                <span className="text-sm text-slate-400">⌕</span>
                <input
                  className="bg-transparent px-2 py-1.5 text-xs outline-none w-48 sm:w-64"
                  placeholder="Search by company name…"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                />
              </div>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mt-5">
            {filteredCompanies.map(company => {
              const membership = memberships.find(item => item.company_id === company.id);
              const initials = (company.name || 'C').split(' ').map((p: string) => p[0]).slice(0, 2).join('');

              return (
                <div
                  key={company.id}
                  className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-[#fafbfc] p-5 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-lilac font-extrabold text-royal text-xs">
                        {initials}
                      </span>
                      {membership && <StatusBadge value={membership.status} />}
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-slate-900">{company.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {company.description || company.website || 'Verified corporate workspace'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-200/60">
                    {membership?.status === 'APPROVED' ? (
                      <span className="text-xs font-semibold text-emerald-700">✓ Connected Member</span>
                    ) : membership?.status === 'PENDING' ? (
                      <span className="text-xs font-medium text-amber-700">⏳ Request Pending</span>
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
        </div>
      </div>
    );
  }

  /* ==============================================================================================
     VIEW: MY CARD (Visiting Card Studio & Archive)
     ============================================================================================== */
  if (tab === 'card') {
    return (
      <div className="space-y-6">
        <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageTitle
            title="My Visiting Cards"
            subtitle="Order new physical and digital visiting cards, or download print-ready PDFs."
          />

          {/* Sub-toggle: Order New Card vs Card Vault */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
            <button
              type="button"
              className={cx(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-colors',
                cardSubView === 'order' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              )}
              onClick={() => setCardSubView('order')}
            >
              Order New Cards
            </button>
            <button
              type="button"
              className={cx(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-colors',
                cardSubView === 'vault' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              )}
              onClick={() => setCardSubView('vault')}
            >
              Card Vault ({cardRows.length})
            </button>
          </div>
        </div>

        {cardSubView === 'order' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Option 1: Personal Visiting Card */}
            <div className="flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-7 shadow-2xs">
              <div>
                <span className="rounded-full bg-lilac px-3 py-1 font-display text-3xs font-bold text-royal uppercase tracking-wider">
                  Independent
                </span>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Personal Visiting Card</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Custom cards with your personal details without requiring company approval.
                </p>

                <div className="mt-5 space-y-3">
                  {(['name', 'designation', 'department', 'phone'] as const).map(key => (
                    <div key={key}>
                      <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                        {key === 'name' ? 'Full name' : key === 'designation' ? 'Title / Role' : key === 'department' ? 'Field' : 'Phone'}
                      </label>
                      <input
                        className={inputClass}
                        placeholder={`Enter your ${key}`}
                        value={order[key]}
                        onChange={e => setOrder({ ...order, [key]: e.target.value })}
                      />
                    </div>
                  ))}

                  <div className="mt-4 rounded-xl border border-slate-200 bg-[#fafbfc] p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Quantity (৳50/card)</span>
                      <strong className="text-slate-900">৳{Number(order.quantity || 1) * PRICE}</strong>
                    </div>
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                      min="1"
                      type="number"
                      value={order.quantity}
                      onChange={e => setOrder({ ...order, quantity: Math.max(1, Number(e.target.value)) })}
                    />
                  </div>
                </div>
              </div>

              <Button
                disabled={busy || !order.name.trim()}
                variant="primary"
                className="mt-6 w-full !py-3 font-bold"
                onClick={() => checkout(false)}
              >
                {busy ? 'Processing checkout…' : 'Mock Checkout & Create Personal Card'}
              </Button>
            </div>

            {/* Option 2: Company Branded Card */}
            <div className="flex flex-col justify-between rounded-[24px] border-2 border-royal/20 bg-gradient-to-b from-white to-[#faf9fe] p-7 shadow-2xs">
              <div>
                <span className="rounded-full bg-mint/30 px-3 py-1 font-display text-3xs font-bold text-slate-900 uppercase tracking-wider">
                  Official Corporate Branding
                </span>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Company Branded Card</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Verified corporate cards with your company logo and approved brand template.
                </p>

                {membershipState !== 'ACTIVE' ? (
                  <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
                    <span className="grid size-10 place-items-center mx-auto rounded-xl bg-amber-100 text-amber-800 text-lg">
                      🏢
                    </span>
                    <h4 className="mt-3 text-xs font-bold text-amber-900">
                      {membershipState === 'PENDING' ? 'Company approval in progress' : 'Not linked to a company yet'}
                    </h4>
                    <p className="mt-1 text-2xs leading-relaxed text-amber-800">
                      {membershipState === 'PENDING'
                        ? 'Your membership request is currently pending administrator review.'
                        : 'Connect with your company from the Overview or Company tab to unlock corporate cards.'}
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-4 !text-xs font-bold"
                      onClick={() => setTab?.('company')}
                    >
                      View Company Tab →
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3.5">
                    <div>
                      <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                        Select template
                      </label>
                      <select
                        className={inputClass}
                        value={order.template_id}
                        onChange={e => setOrder({ ...order, template_id: e.target.value })}
                      >
                        <option value="">Choose card template</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.style_key || 'Standard'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                        Billing preference
                      </label>
                      <select
                        className={inputClass}
                        value={order.payer}
                        onChange={e => setOrder({ ...order, payer: e.target.value })}
                      >
                        <option value="COMPANY">Company sponsored</option>
                        <option value="INDIVIDUAL">Pay myself</option>
                      </select>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Quantity</span>
                        {isCompanySponsored ? (
                          <span className="font-bold text-emerald-700">৳0 (Company Sponsored)</span>
                        ) : (
                          <strong className="text-slate-900">৳{total}</strong>
                        )}
                      </div>
                      <input
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold"
                        min="1"
                        type="number"
                        value={order.quantity}
                        onChange={e => setOrder({ ...order, quantity: Math.max(1, Number(e.target.value)) })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {membershipState === 'ACTIVE' && (
                <Button
                  disabled={busy || !order.template_id}
                  variant="sun"
                  className="mt-6 w-full !py-3 font-bold"
                  onClick={() => checkout(true)}
                >
                  {busy ? 'Processing checkout…' : 'Mock Checkout & Create Branded Card'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Card Vault */
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <SectionHeading
              title="Generated Visiting Cards"
              copy="Download high-resolution print PDFs for all your personal and corporate cards."
            />

            {cardRows.length > 0 ? (
              <div className="divide-y divide-slate-100 mt-4">
                {cardRows.map(c => (
                  <div key={`${c.kind}-${c.id}`} className="py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-11 place-items-center rounded-xl bg-lilac text-royal font-bold">
                        ▤
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-bold text-slate-900">{c.file_name}</strong>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-3xs font-semibold text-slate-600">
                            {c.kind === 'personal' ? 'Personal' : 'Company'}
                          </span>
                        </div>
                        <small className="text-3xs text-slate-400">
                          Created {new Date(c.created_at).toLocaleDateString()} · Vector PDF
                        </small>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      className="!px-4 !py-1.5 !text-xs font-bold"
                      onClick={() =>
                        download(
                          c.kind === 'personal'
                            ? `/employee/personal-cards/${c.id}/download`
                            : `/employee/cards/${c.id}/download`,
                          c.file_name
                        )
                      }
                    >
                      Download PDF ↓
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                No cards generated yet. Switch to &quot;Order New Cards&quot; to create your first card.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ==============================================================================================
     VIEW: ORDERS (GOV.UK Table Standard)
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
                          {o.quantity} card{o.quantity > 1 ? 's' : ''} × ৳{o.unit_price}
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
     VIEW: HELP
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
     DEFAULT VIEW: OVERVIEW (Adapting to the 4 Membership States)
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

      {/* ------------------------------------------------------------------------------------------
          STATE B: PENDING REQUEST BANNER
          ------------------------------------------------------------------------------------------ */}
      {membershipState === 'PENDING' && pendingMembership && (
        <div className="rounded-[24px] border border-amber-300 bg-amber-50/70 p-6 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-amber-800">
                MEMBERSHIP REQUEST UNDER REVIEW
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Awaiting approval by {pendingMembership.company?.name}
              </h2>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Submitted ID: </span>
                  <strong className="font-mono text-slate-800">{pendingMembership.employee_code}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Official Email: </span>
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

      {/* ------------------------------------------------------------------------------------------
          STATE D: REJECTED REQUEST BANNER
          ------------------------------------------------------------------------------------------ */}
      {membershipState === 'REJECTED' && rejectedMembership && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50/70 p-6 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-wider text-rose-800">
                MEMBERSHIP REQUEST NOT APPROVED
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                Request rejected by {rejectedMembership.company?.name}
              </h2>
              <p className="mt-2 text-xs text-slate-600">
                Submitted Employee ID: <strong className="font-mono">{rejectedMembership.employee_code}</strong> · {rejectedMembership.official_email}
              </p>
              <p className="mt-2 text-xs text-rose-800 leading-relaxed max-w-2xl">
                Please check with your company HR to verify your active employee ID and email, or browse other organizations below.
              </p>
            </div>
            <StatusBadge value="REJECTED" />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------
          STATE C: ACTIVE VERIFIED MEMBERSHIP HUB
          ------------------------------------------------------------------------------------------ */}
      {membershipState === 'ACTIVE' && activeMembership && (
        <div className="rounded-[24px] border border-[#bfe5d3] bg-[#f2fbf7] p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-white font-extrabold text-royal shadow-xs text-lg">
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
                    {activeMembership.payer === 'COMPANY' ? 'Company Sponsored (Free ৳0)' : 'Self Paid'}
                  </span>
                </p>
              </div>
            </div>

            <Button
              variant="sun"
              className="!px-6 !py-3 !text-sm font-bold shadow-xs"
              onClick={() => setTab?.('card')}
            >
              Order New Cards ↗
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------
          2-COLUMN SUMMARY: LATEST CARD & RECENT ORDERS
          ------------------------------------------------------------------------------------------ */}
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
                    <span className="ml-2 text-slate-500">{o.quantity} cards</span>
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

      {/* ------------------------------------------------------------------------------------------
          STATE A / REJECTED: SEARCH & CONNECT TO A COMPANY
          ------------------------------------------------------------------------------------------ */}
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
                  placeholder="Search by company name…"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                />
              </div>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 mt-5">
            {filteredCompanies.slice(0, 6).map(c => {
              const initials = (c.name || 'C').split(' ').map((p: string) => p[0]).slice(0, 2).join('');
              return (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-[20px] border border-slate-200/80 bg-[#fafbfc] p-5 hover:bg-white hover:shadow-xs transition-all"
                >
                  <div>
                    <span className="grid size-10 place-items-center rounded-xl bg-lilac font-extrabold text-royal text-xs">
                      {initials}
                    </span>
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
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------
          MODAL: JOIN COMPANY VERIFICATION DIALOG
          ------------------------------------------------------------------------------------------ */}
      {targetCompany && (
        <ReviewDialog
          title={`Connect to ${targetCompany.name}`}
          eyebrow="EMPLOYEE VERIFICATION"
          busy={modalBusy}
          onClose={closeJoinModal}
        >
          <p className="mb-5 text-xs leading-relaxed text-slate-600">
            Enter your official credentials for <strong>{targetCompany.name}</strong>. If your details match the
            company roster, your membership activates automatically. Otherwise, it will be forwarded to the company
            administrator for manual review.
          </p>

          <form onSubmit={handleJoinSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Official Company Email <span className="text-red-500">*</span>
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
