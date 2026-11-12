// @ts-nocheck
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, download } from '../lib/api';
import StatusBadge from './StatusBadge';
import Toast from './Toast';
import ReviewDialog from './ReviewDialog';
import { isValidEmail } from '../lib/validation';
import { Button, Eyebrow, Panel, PanelHeader, cx, inputClass, tableClass, tdClass, thClass } from './ui';

const PRICE = 50;

type StatTone = 'violet' | 'cyan' | 'amber' | 'green';
const toneAccent: Record<StatTone, string> = {
  violet: 'bg-[#7c4be3]',
  cyan: 'bg-[#2bbbc4]',
  amber: 'bg-[#efb53e]',
  green: 'bg-[#47ae80]',
};

function StatCard({ label, value, note, tone }: { label: string; value: ReactNode; note: string; tone: StatTone }) {
  return (
    <article className="relative min-h-34 overflow-hidden rounded-[28px] border border-[#e3e8e6] bg-white p-5.5 shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.75 hover:shadow-lg max-sm:min-h-30 max-sm:p-4.5">
      <div className={cx('absolute top-0 left-0 h-1 w-full', toneAccent[tone])} />
      <p className="text-xs font-semibold text-[#756f80]">{label}</p>
      <strong className="mt-4.5 block overflow-hidden text-3xl leading-none font-extrabold tracking-tighter text-ellipsis whitespace-nowrap">
        {value}
      </strong>
      <small className="mt-2.5 block text-2xs text-[#7c8a90]">{note}</small>
    </article>
  );
}

function PanelTitle({ kicker, title, copy }: { kicker: string; title: string; copy?: string }) {
  return (
    <div>
      <span className="block text-3xs font-black tracking-2xl text-royal uppercase">{kicker}</span>
      <h2 className="mt-1 text-lg font-extrabold tracking-tighter text-slate-900">{title}</h2>
      {copy && <p className="mt-1 text-xs text-[#7c8a90]">{copy}</p>}
    </div>
  );
}

function Quantity({
  value,
  onChange,
  total,
  isCompanySponsored,
}: {
  value: number;
  onChange: (v: number) => void;
  total: number;
  isCompanySponsored?: boolean;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-[#e3e8e6] bg-[#fafbfc] p-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">Card quantity</label>
        <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Standard rate: ৳{PRICE}/card</span>
      </div>
      <input
        className="mt-2 w-full rounded-xl border border-black/20 bg-white px-3.5 py-2.5 text-sm font-semibold transition focus:border-royal focus:ring-2 focus:ring-lilac focus:outline-none"
        min="1"
        type="number"
        value={value}
        onChange={e => onChange(Math.max(1, Number(e.target.value)))}
      />
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 border border-slate-100">
        <span className="text-xs text-slate-500">Order total</span>
        {isCompanySponsored ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1 font-display text-xs font-bold text-slate-900">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            ৳0 (Free · Sponsored by company)
          </span>
        ) : (
          <p className="text-sm font-extrabold text-slate-900">
            ৳{total} <span className="text-xs font-normal text-slate-400">({value} × ৳{PRICE})</span>
          </p>
        )}
      </div>
    </div>
  );
}

const MATCH_HINTS: Record<string, { text: string; tone: string }> = {
  ROSTER_MATCHED: { text: 'Verified with company roster. Membership activated automatically.', tone: 'bg-mint/20 text-slate-800 border-mint' },
  ID_MISMATCH: { text: 'Employee ID was recognized but email differs. Company admin will review.', tone: 'bg-lemon/30 text-amber-900 border-lemon' },
  NOT_FOUND: { text: 'Your details will be reviewed by the company administrator.', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  INACTIVE_EMPLOYEE: { text: 'Roster record is currently inactive. Awaiting administrator review.', tone: 'bg-blush/30 text-rose-900 border-blush' },
};

export interface EmployeeDashboardProps {
  tab: string;
  setTab?: (tab: string) => void;
}

export default function EmployeeDashboard({ tab, setTab }: EmployeeDashboardProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [companySearch, setCompanySearch] = useState('');

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
    name: '',
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

  const active = memberships.find(item => item.status === 'APPROVED' && String(item.company_id) === selected);
  const anyActive = memberships.find(item => item.status === 'APPROVED');
  const pendingMemberships = memberships.filter(item => item.status === 'PENDING');
  const isCompanySponsored = order.payer === 'COMPANY' && active?.payer === 'COMPANY';
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

  async function checkout(company: boolean) {
    setBusy(true);
    setError('');
    try {
      const path = company ? `/employee/checkout/company/${selected}` : '/employee/checkout/personal';
      const body = company
        ? { quantity: Number(order.quantity), template_id: Number(order.template_id), payer: order.payer }
        : { ...order, quantity: Number(order.quantity) };
      const result: any = await api(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage(`Payment successful! ${result.quantity} card${result.quantity > 1 ? 's' : ''} created; total ৳${result.total_amount}.`);
      await load();
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

  const filteredCompanies = companies.filter(
    c =>
      (c.name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(companySearch.toLowerCase())
  );

  if (tab === 'cards') {
    return (
      <div className="space-y-6">
        <Toast
          type={error ? 'error' : 'success'}
          message={error || message}
          onClose={() => {
            setError('');
            setMessage('');
          }}
        />

        <Panel>
          <PanelHeader className="max-sm:p-4.5">
            <PanelTitle
              kicker="CARD ARCHIVE"
              title="Generated visiting cards"
              copy="Every card generated for you remains available to download and verify."
            />
            <Button variant="sun" onClick={() => setTab?.('create')}>
              Create new card <span className="grid size-5 place-items-center rounded-full bg-[#21183d] text-white">↗</span>
            </Button>
          </PanelHeader>

          {cardRows.length > 0 ? (
            <div className="divide-y divide-[#e3e8e6]">
              {cardRows.map(card => (
                <div
                  key={`${card.kind}-${card.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4.5 transition-colors hover:bg-[#f6f8f7]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-11 place-items-center rounded-2xl bg-lilac text-lg text-royal font-bold">
                      ▤
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="block text-sm font-bold text-slate-900">{card.file_name}</strong>
                        <span
                          className={cx(
                            'rounded-full px-2.5 py-0.5 text-3xs font-semibold uppercase tracking-wider',
                            card.kind === 'personal'
                              ? 'bg-lilac text-royal'
                              : 'bg-mint/30 text-slate-900'
                          )}
                        >
                          {card.kind === 'personal' ? 'Personal card' : 'Company card'}
                        </span>
                      </div>
                      <small className="mt-1 block text-3xs text-[#7c8a90]">
                        Generated on {new Date(card.created_at).toLocaleDateString()} · High-resolution PDF ready for print
                      </small>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      className="!px-4 !py-2 !text-xs"
                      onClick={() =>
                        download(
                          card.kind === 'personal'
                            ? `/employee/personal-cards/${card.id}/download`
                            : `/employee/cards/${card.id}/download`,
                          card.file_name
                        )
                      }
                    >
                      Download PDF ↓
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center content-center p-9 text-center">
              <span className="mb-4 grid size-16 -rotate-6 place-items-center rounded-[32px] bg-lilac text-2xl text-royal">
                ◇
              </span>
              <h3 className="text-base font-extrabold text-slate-800">No cards generated yet</h3>
              <p className="mt-1.5 max-w-sm text-xs text-[#7c8a90]">
                Choose between personal or company-branded designs and generate your first set of cards.
              </p>
              <Button variant="sun" className="mt-5" onClick={() => setTab?.('create')}>
                Create card now →
              </Button>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader className="max-sm:p-4.5">
            <PanelTitle
              kicker="BILLING HISTORY"
              title="Order and checkout history"
              copy="Transparent receipt records for personal and company orders."
            />
          </PanelHeader>

          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className={tableClass}>
                <thead>
                  <tr>
                    <th className={thClass}>Order ID</th>
                    <th className={thClass}>Items & Pricing</th>
                    <th className={thClass}>Payer Account</th>
                    <th className={thClass}>Total Amount</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(item => (
                    <tr key={`order-${item.id}`} className="hover:bg-[#f6f8f7] transition-colors">
                      <td className={tdClass}>
                        <strong className="text-xs font-mono text-slate-800">#{item.id}</strong>
                      </td>
                      <td className={tdClass}>
                        <span className="text-xs font-medium text-slate-700">
                          {item.quantity} card{item.quantity > 1 ? 's' : ''} × ৳{item.unit_price}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-block rounded-md bg-lilac px-2.5 py-0.5 text-3xs font-semibold text-royal uppercase">
                          {item.payer === 'COMPANY' ? 'Company sponsored' : 'Self paid'}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <strong className="text-sm font-extrabold text-slate-900">৳{item.total_amount}</strong>
                      </td>
                      <td className={tdClass}>
                        <StatusBadge value={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">No orders placed yet.</div>
          )}
        </Panel>
      </div>
    );
  }

  if (tab === 'create') {
    return (
      <div className="space-y-6">
        <Toast
          type={error ? 'error' : 'success'}
          message={error || message}
          onClose={() => {
            setError('');
            setMessage('');
          }}
        />

        <Panel>
          <PanelHeader className="max-sm:p-4.5">
            <PanelTitle
              kicker="CREATE VISITING CARDS"
              title="Personal or company branded"
              copy="Choose personal styling for independent use, or access official corporate branding once connected to a company."
            />
          </PanelHeader>

          <div className="p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Option 1: Personal Card */}
              <div className="flex flex-col justify-between rounded-[28px] border border-[#e3e8e6] bg-white p-7 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-lilac px-3 py-1 font-display text-3xs font-bold text-royal uppercase tracking-wider">
                      Independent
                    </span>
                    <span className="text-2xs font-semibold text-slate-400">No approval required</span>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold text-slate-900">Personal Visiting Card</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Print custom cards with your personal details without joining an organization.
                  </p>

                  <div className="mt-6 space-y-3.5">
                    {(['name', 'designation', 'department', 'phone'] as const).map(key => (
                      <div key={key}>
                        <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                          {key === 'name' ? 'Full name' : key === 'designation' ? 'Designation / Title' : key === 'department' ? 'Department / Field' : 'Phone number'}
                        </label>
                        <input
                          className={inputClass}
                          placeholder={`Enter your ${key}`}
                          value={order[key]}
                          onChange={e => setOrder({ ...order, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>

                  <Quantity
                    value={order.quantity}
                    onChange={value => setOrder({ ...order, quantity: value })}
                    total={Number(order.quantity || 0) * PRICE}
                  />
                </div>

                <Button
                  disabled={busy || !order.name.trim()}
                  variant="primary"
                  className="mt-6 w-full !py-3.5"
                  onClick={() => checkout(false)}
                >
                  {busy ? 'Processing checkout…' : 'Mock checkout & create card'}
                </Button>
              </div>

              {/* Option 2: Company Branded Card */}
              <div className="flex flex-col justify-between rounded-[28px] border-2 border-royal/30 bg-gradient-to-b from-white to-[#faf9fe] p-7 shadow-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-mint/30 px-3 py-1 font-display text-3xs font-bold text-slate-900 uppercase tracking-wider">
                      Corporate Branding
                    </span>
                    <span className="text-2xs font-semibold text-emerald-700">Official Roster Required</span>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold text-slate-900">Company Branded Card</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Use verified corporate templates, logos, and print presets managed by your company.
                  </p>

                  {memberships.filter(item => item.status === 'APPROVED').length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center">
                      <span className="grid size-12 place-items-center mx-auto rounded-2xl bg-amber-100 text-xl text-amber-800">
                        🏢
                      </span>
                      <h4 className="mt-3 text-sm font-bold text-amber-900">No active company membership</h4>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        Request to join a registered company from the overview tab to unlock official corporate templates.
                      </p>
                      <Button
                        variant="secondary"
                        className="mt-4 !text-xs"
                        onClick={() => setTab?.('overview')}
                      >
                        Browse registered companies →
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                          Approved company workspace
                        </label>
                        <select
                          className={inputClass}
                          value={selected}
                          onChange={e => selectCompany(e.target.value)}
                        >
                          <option value="">Choose your approved company</option>
                          {memberships
                            .filter(item => item.status === 'APPROVED')
                            .map(item => (
                              <option key={item.id} value={item.company_id}>
                                {item.company?.name} (Employee ID: {item.employee_code})
                              </option>
                            ))}
                        </select>
                      </div>

                      {active && (
                        <>
                          <div>
                            <label className="mb-1 block text-3xs font-bold uppercase tracking-wider text-slate-500">
                              Select brand template
                            </label>
                            <select
                              className={inputClass}
                              value={order.template_id}
                              onChange={e => setOrder({ ...order, template_id: e.target.value })}
                            >
                              <option value="">Choose card template</option>
                              {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                  {template.name} ({template.style_key || 'Standard'})
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
                              <option value="COMPANY">Company sponsored (Default)</option>
                              <option value="INDIVIDUAL">Pay myself</option>
                            </select>
                          </div>

                          <Quantity
                            value={order.quantity}
                            onChange={value => setOrder({ ...order, quantity: value })}
                            total={total}
                            isCompanySponsored={isCompanySponsored}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>

                {memberships.filter(item => item.status === 'APPROVED').length > 0 && (
                  <Button
                    disabled={busy || !active || !order.template_id}
                    variant="sun"
                    className="mt-6 w-full !py-3.5"
                    onClick={() => checkout(true)}
                  >
                    {busy ? 'Processing checkout…' : 'Mock checkout & create branded card'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // Default: Overview Tab
  const stats: Array<[string, ReactNode, string, StatTone]> = [
    [
      'Active workspace',
      anyActive?.company?.name || 'Independent',
      anyActive ? `ID: ${anyActive.employee_code}` : 'No company linked',
      'violet',
    ],
    ['Cards ready', cardRows.length, `${cards.length} company · ${personal.length} personal`, 'green'],
    ['Orders placed', orders.length, 'Receipt records available', 'cyan'],
    [
      'Membership status',
      anyActive ? 'Approved' : pendingMemberships.length > 0 ? 'Pending' : 'Independent',
      anyActive ? 'Full brand access' : pendingMemberships.length > 0 ? 'Review in progress' : 'Join a company anytime',
      'amber',
    ],
  ];

  return (
    <div className="space-y-6">
      <Toast
        type={error ? 'error' : 'success'}
        message={error || message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
      />

      {/* Hero Navy Banner matching public enterprise look */}
      <section className="relative flex min-h-55 items-center justify-between gap-8 overflow-hidden rounded-[40px] bg-[linear-gradient(#10242f,#10242f)] p-8.5 text-white shadow-xl after:absolute after:-top-17.5 after:right-[33%] after:text-[length:calc(var(--spacing)*55)] after:text-[#ffffff0d] after:content-['✦'] max-md:flex-col max-md:items-start">
        <div className="relative z-2">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-[28px] border border-[#ffffff4d] bg-[#ffffff24] text-xl font-bold">
              {anyActive ? anyActive.company?.name.charAt(0) : 'E'}
            </span>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffffff15] px-3 py-0.5 text-3xs font-extrabold tracking-widest text-mint border border-mint/20">
                <span className="size-1.5 rounded-full bg-mint animate-pulse" />
                {anyActive ? 'VERIFIED EMPLOYEE WORKSPACE' : 'EMPLOYEE WORKSPACE'}
              </span>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight">
                {anyActive ? anyActive.company?.name : 'Your card identity, in one place.'}
              </h2>
            </div>
          </div>
          <p className="mt-4.5 max-w-147.5 text-sm leading-relaxed text-[#e2d9f7]">
            {anyActive
              ? `You are verified with ${anyActive.company?.name}. Create company-branded cards or independent personal cards anytime.`
              : 'Create independent personal cards or request to join a registered company to access official corporate branding.'}
          </p>
          <div className="mt-5.5 flex items-center gap-4.5">
            <Button variant="sun" onClick={() => setTab?.('create')}>
              Create card <span className="grid size-6 place-items-center rounded-full bg-[#21183d] text-white">↗</span>
            </Button>
            <button
              className="text-xs font-bold text-white underline underline-offset-4 hover:text-mint transition-colors"
              onClick={() => setTab?.('cards')}
            >
              View my cards ({cardRows.length})
            </button>
          </div>
        </div>

        <div className="relative z-2 flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm max-md:w-full">
          <span className="text-3xs font-bold uppercase tracking-wider text-[#a7b5bb]">Identity status</span>
          <div className="flex items-center gap-3">
            <div className={cx('size-3 rounded-full', anyActive ? 'bg-mint' : pendingMemberships.length ? 'bg-lemon' : 'bg-slate-400')} />
            <span className="font-display text-sm font-semibold text-white">
              {anyActive ? 'Active Company Member' : pendingMemberships.length ? 'Review in progress' : 'Independent Profile'}
            </span>
          </div>
          <div className="h-px w-full bg-white/10" />
          <div className="flex items-center justify-between gap-6 text-2xs text-[#d2dbe0]">
            <span>
              Cards ready: <strong className="text-white">{cardRows.length}</strong>
            </span>
            <span>
              Orders: <strong className="text-white">{orders.length}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">
        {stats.map(([label, value, note, tone]) => (
          <StatCard key={label} label={label} value={value} note={note} tone={tone} />
        ))}
      </div>

      {/* Active memberships banner */}
      {memberships.some(m => m.status === 'APPROVED') && (
        <Panel>
          <PanelHeader className="max-sm:p-4.5">
            <PanelTitle
              kicker="ACTIVE MEMBERSHIP"
              title="Connected company workspace"
              copy="Your verified company connection unlocks official branding and templates."
            />
          </PanelHeader>
          <div className="p-6">
            {memberships
              .filter(m => m.status === 'APPROVED')
              .map(m => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#bfe5d3] bg-[#f2fbf7] p-5.5 shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-12 place-items-center rounded-2xl bg-white font-extrabold text-royal shadow-xs text-lg">
                      {m.company?.name ? m.company.name.charAt(0) : '🏢'}
                    </span>
                    <div>
                      <strong className="block text-base font-bold text-slate-900">
                        {m.company?.name || `Company #${m.company_id}`}
                      </strong>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          ID: {m.employee_code}
                        </span>
                        <span>·</span>
                        <span>{m.official_email}</span>
                        <span>·</span>
                        <span className="font-semibold text-royal">
                          {m.payer === 'COMPANY' ? 'Company sponsored' : 'Self payer'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value="ACTIVE" />
                    <Button variant="sun" className="!text-xs !px-4 !py-2" onClick={() => setTab?.('create')}>
                      Create branded card →
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      )}

      {/* Pending membership requests */}
      {memberships.some(m => m.status === 'PENDING') && (
        <Panel>
          <PanelHeader className="max-sm:p-4.5">
            <PanelTitle
              kicker="PENDING REQUESTS"
              title="Awaiting company administrator review"
              copy="Your verification request has been delivered to the company admin."
            />
          </PanelHeader>
          <div className="p-6 space-y-3">
            {memberships
              .filter(m => m.status === 'PENDING')
              .map(m => {
                const hint = MATCH_HINTS[m.match_status];
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-amber-200 bg-[#fffdf5] p-5 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-11 place-items-center rounded-2xl bg-amber-100 text-lg font-bold text-amber-800">
                        ⏳
                      </span>
                      <div>
                        <strong className="block text-sm font-bold text-slate-900">
                          {m.company?.name || `Company #${m.company_id}`}
                        </strong>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                            ID: {m.employee_code}
                          </span>
                          <span>·</span>
                          <span>{m.official_email}</span>
                        </div>
                        {hint && (
                          <div className={cx('mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-3xs font-medium', hint.tone)}>
                            {hint.text}
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge value="PENDING" />
                  </div>
                );
              })}
          </div>
        </Panel>
      )}

      {/* Company Directory */}
      <Panel>
        <PanelHeader className="max-sm:p-4.5">
          <PanelTitle
            kicker="COMPANY DIRECTORY"
            title="Registered workspaces"
            copy="Request to join any organization to unlock official cards and verify your position."
          />
          <div className="flex items-center rounded-xl border border-[#e3e8e6] bg-white px-3 transition focus-within:border-royal focus-within:ring-3 focus-within:ring-lilac max-sm:w-full">
            <span className="text-base text-slate-400">⌕</span>
            <input
              className="bg-transparent px-2 py-2 text-xs outline-none"
              aria-label="Search companies"
              placeholder="Search companies…"
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
            />
          </div>
        </PanelHeader>

        <div className="p-6 md:p-7">
          {filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCompanies.map(company => {
                const membership = memberships.find(item => item.company_id === company.id);
                const initials = (company.name || 'C')
                  .split(' ')
                  .map((p: string) => p[0])
                  .slice(0, 2)
                  .join('');

                return (
                  <article
                    key={company.id}
                    className="flex flex-col justify-between rounded-[24px] border border-[#e3e8e6] bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.75 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-12 place-items-center rounded-2xl bg-lilac font-extrabold text-royal text-sm">
                          {initials}
                        </span>
                        {membership && <StatusBadge value={membership.status} />}
                      </div>

                      <h3 className="mt-4 text-base font-extrabold text-slate-900">{company.name}</h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                        {company.description || company.website || 'Registered corporate workspace'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {membership?.status === 'APPROVED' ? (
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                            ✓ Active member
                          </span>
                          <Button variant="secondary" className="!px-3 !py-1 !text-xs" onClick={() => setTab?.('create')}>
                            Create card →
                          </Button>
                        </div>
                      ) : membership?.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800">
                          ⏳ Under admin review
                        </span>
                      ) : membership?.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700">
                          ✕ Request rejected
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          className="w-full !text-xs"
                          onClick={() => openJoinModal(company)}
                        >
                          Request to join →
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">No registered companies found.</div>
          )}
        </div>
      </Panel>

      {/* Join Request Modal */}
      {targetCompany && (
        <ReviewDialog
          title={`Join ${targetCompany.name}`}
          eyebrow="VERIFY EMPLOYMENT"
          busy={modalBusy}
          onClose={closeJoinModal}
        >
          <p className="mb-5 text-xs leading-relaxed text-slate-600">
            Enter your official credentials for <strong>{targetCompany.name}</strong>. If your details match the
            company roster, your membership activates automatically. Otherwise, it will be forwarded to the company
            administrator for review.
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
                  <option value="COMPANY">Company sponsored (Recommended)</option>
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
                {modalBusy ? 'Verifying…' : 'Submit Verification Request'}
              </Button>
            </div>
          </form>
        </ReviewDialog>
      )}
    </div>
  );
}
