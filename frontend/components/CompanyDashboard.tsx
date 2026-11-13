'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, download } from '../lib/api';
import type { CardRequest, Company, Employee, GeneratedCard, Template, User } from '../lib/types';
import type { EmployeeValues } from '../lib/validation';
import StatusBadge from './StatusBadge';
import EmployeeDialog from './EmployeeDialog';
import CompanyProfilePanel from './CompanyProfilePanel';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import CardStudio from './CardStudio';
import CsvImportDialog from './CsvImportDialog';
import RequestWizard from './RequestWizard';
import CompanyAdminShell from './CompanyAdminShell';
import { Button, Eyebrow, Panel, PanelHeader, buttonClass, cx, tableClass, tdClass, thClass } from './ui';
import { cellNoteClass, compactSelectClass, errorMessage, requestIconClass } from './CompanyDashboardParts';

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

const rowActionClass =
  'cursor-pointer rounded-lg bg-[#f6f8f7] px-2.5 py-1.5 text-3xs font-bold text-[#625a6c] hover:bg-[#e9e5fb] hover:text-[#5928b6] transition-colors';
const checkboxClass = 'size-4 accent-slate-900 rounded cursor-pointer';
const pagerButtonClass =
  'rounded-lg border border-[#e3e8e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#655e6d] hover:bg-[#f6f8f7] disabled:cursor-not-allowed disabled:opacity-40 transition-colors';

const MATCH_LABELS: Record<string, { label: string; tone: string }> = {
  ROSTER_MATCHED: { label: 'Roster verified', tone: 'bg-[#eef3fa] text-[#28528d] border-[#d8e3f3]' },
  ID_MISMATCH: { label: 'Email mismatch', tone: 'bg-[#fef9c3] text-[#854d0e] border-amber-200' },
  NOT_FOUND: { label: 'Not in roster', tone: 'bg-[#fee2e2] text-[#991b1b] border-rose-200' },
  INACTIVE_EMPLOYEE: { label: 'Inactive roster', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

function MatchBadge({ value }: { value: string }) {
  const info = MATCH_LABELS[value];
  if (!info) return null;
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider', info.tone)}>
      {info.label}
    </span>
  );
}

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = 'slate',
}: {
  label: string;
  value: ReactNode;
  note: string;
  tone?: 'slate' | 'mint' | 'amber' | 'violet';
}) {
  const toneBar = {
    slate: 'bg-slate-900',
    mint: 'bg-mint',
    amber: 'bg-amber-400',
    violet: 'bg-royal',
  }[tone];

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-xs">
      <div className={cx('absolute top-0 left-0 h-1 w-full', toneBar)} />
      <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
      <strong className="mt-2.5 block text-2xl font-black tracking-tight text-slate-900">{value}</strong>
      <small className="mt-1 block text-3xs text-slate-500 font-medium">{note}</small>
    </div>
  );
}

export const companyNav = [
  ['overview', 'overview', 'Overview'],
  ['employees', 'employees', 'Employees'],
  ['memberships', 'memberships', 'Membership Requests'],
  ['requests', 'requests', 'Card Orders'],
  ['templates', 'templates', 'Templates'],
  ['profile', 'profile', 'Company Profile'],
  ['billing', 'billing', 'Billing'],
  ['settings', 'settings', 'Settings'],
] as const;

export interface CompanyDashboardProps {
  tab: string;
  setTab: (tab: string) => void;
  user?: User | null;
  onLogout?: () => void;
}

interface RequestViewerState {
  request: CardRequest;
  cards: GeneratedCard[];
}

export default function CompanyDashboard({ tab, setTab, user, onLogout }: CompanyDashboardProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [membershipFilter, setMembershipFilter] = useState('ALL');
  const [ordersSubView, setOrdersSubView] = useState<'requests' | 'checkouts'>('requests');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [employeeEditor, setEmployeeEditor] = useState<Employee | null | undefined>(undefined);
  const [employeeError, setEmployeeError] = useState('');
  const [requestViewer, setRequestViewer] = useState<RequestViewerState | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  // Sponsorship policy setting
  const [defaultSponsorship, setDefaultSponsorship] = useState<'COMPANY' | 'INDIVIDUAL'>('COMPANY');

  const load = useCallback(async () => {
    setError('');
    try {
      const companyData = await api<Company>('/company/profile');
      setCompany(companyData);
      if (companyData.status === 'APPROVED') {
        const [employeeData, templateData, requestData, membershipData, orderData] = await Promise.all([
          api<Employee[]>('/employees'),
          api<Template[]>('/templates'),
          api<CardRequest[]>('/card-requests'),
          api<any[]>('/company/memberships').catch(() => []),
          api<any[]>('/company/card-orders').catch(() => []),
        ]);
        setEmployees(employeeData);
        setTemplates(templateData);
        setRequests(requestData);
        setMemberships(membershipData);
        setOrders(orderData);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, department, statusFilter]);

  async function saveEmployee(values: EmployeeValues) {
    setBusy(true);
    setEmployeeError('');
    const editing = Boolean(employeeEditor?.id);
    try {
      await api(editing ? `/employees/${employeeEditor!.id}` : '/employees', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      });
      setEmployeeEditor(undefined);
      setMessage(editing ? 'Employee details updated.' : 'Employee added successfully.');
      await load();
    } catch (requestError) {
      setEmployeeError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(employee: Employee, file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    setError('');
    try {
      await api(`/employees/${employee.id}/photo`, { method: 'POST', body: form });
      setMessage(`${employee.name}’s photo was updated.`);
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function changeEmployeeStatus(employee: Employee) {
    if (employee.is_active && !window.confirm(`Deactivate ${employee.name}? Existing cards will also become inactive.`))
      return;
    setBusy(true);
    setError('');
    try {
      await api(`/employees/${employee.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !employee.is_active }),
      });
      setSelectedEmployees(current => current.filter(id => id !== employee.id));
      setMessage(`${employee.name} is now ${employee.is_active ? 'inactive' : 'active'}.`);
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function selectTemplate(id: number) {
    setBusy(true);
    setError('');
    try {
      await api(`/templates/${id}/select`, { method: 'POST' });
      setMessage('Your brand card template standard has been updated.');
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function decideMembership(id: number, decision: string) {
    setBusy(true);
    setError('');
    try {
      await api(`/company/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ decision }) });
      setMessage(`Membership ${decision.toLowerCase()} successfully.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleEmployee(id: number) {
    setSelectedEmployees(current => (current.includes(id) ? current.filter(value => value !== id) : [...current, id]));
  }

  function createRequest() {
    setWizardOpen(true);
  }

  async function openRequest(request: CardRequest) {
    let cards: GeneratedCard[] = [];
    if (request.status === 'COMPLETED') {
      try {
        cards = await api<GeneratedCard[]>(`/card-requests/${request.id}/cards`);
      } catch (requestError) {
        setError(errorMessage(requestError));
        return;
      }
    }
    setRequestViewer({ request, cards });
  }

  // Filtered employees
  const departments = useMemo(() => [...new Set(employees.map(item => item.department))].sort(), [employees]);
  const visibleEmployees = useMemo(
    () =>
      employees.filter(employee => {
        const term = search.toLowerCase();
        const matchesTerm =
          !term ||
          [employee.name, employee.employee_id, employee.email, employee.designation].some(val =>
            (val || '').toLowerCase().includes(term)
          );
        const matchesDept = department === 'ALL' || employee.department === department;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'ACTIVE' && employee.is_active) ||
          (statusFilter === 'INACTIVE' && !employee.is_active);
        return matchesTerm && matchesDept && matchesStatus;
      }),
    [employees, search, department, statusFilter]
  );

  const pageCount = Math.max(1, Math.ceil(visibleEmployees.length / pageSize));
  const pageEmployees = visibleEmployees.slice((page - 1) * pageSize, page * pageSize);
  const activeOnPage = pageEmployees.filter(item => item.is_active);
  const pageSelected = activeOnPage.length > 0 && activeOnPage.every(item => selectedEmployees.includes(item.id));

  // Key metrics
  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);
  const pendingMemberships = useMemo(() => memberships.filter(m => m.status === 'PENDING'), [memberships]);
  const pendingRequests = useMemo(() => requests.filter(r => r.status === 'PENDING'), [requests]);
  const completedRequests = useMemo(() => requests.filter(r => r.status === 'COMPLETED'), [requests]);
  const selectedTemplate = templates.find(template => template.id === company?.selected_template_id);

  // Billing calculation
  const totalSpend = useMemo(() => orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0), [orders]);
  const companySponsoredOrders = useMemo(() => orders.filter(o => o.payer === 'COMPANY'), [orders]);
  const companySponsoredTotal = useMemo(
    () => companySponsoredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    [companySponsoredOrders]
  );
  const selfPaidOrders = useMemo(() => orders.filter(o => o.payer === 'INDIVIDUAL'), [orders]);
  const selfPaidTotal = useMemo(
    () => selfPaidOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0),
    [selfPaidOrders]
  );

  if (loading) {
    return (
      <CompanyAdminShell
        user={user || { username: 'Admin', role: 'COMPANY_ADMIN' }}
        navigation={companyNav}
        activeTab={tab}
        onNavigate={setTab}
        onLogout={onLogout || (() => {})}
      >
        <div className="grid grid-cols-4 gap-4 animate-pulse">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="col-span-full h-96 rounded-2xl bg-slate-200 mt-4" />
        </div>
      </CompanyAdminShell>
    );
  }

  if (!company) {
    return (
      <CompanyAdminShell
        user={user || { username: 'Admin', role: 'COMPANY_ADMIN' }}
        navigation={companyNav}
        activeTab={tab}
        onNavigate={setTab}
        onLogout={onLogout || (() => {})}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          {error ? (
            <>
              <p role="alert" className="text-rose-600 font-semibold mb-3">
                {error}
              </p>
              <Button variant="secondary" onClick={load}>
                Retry loading workspace
              </Button>
            </>
          ) : (
            'Loading company workspace…'
          )}
        </div>
      </CompanyAdminShell>
    );
  }

  // If company is not yet approved
  if (company.status !== 'APPROVED') {
    return (
      <CompanyAdminShell
        user={user || { username: 'Admin', role: 'COMPANY_ADMIN' }}
        companyName={company.name}
        companyStatus={company.status}
        navigation={companyNav}
        activeTab={tab}
        onNavigate={setTab}
        onLogout={onLogout || (() => {})}
      >
        <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
        <div className="space-y-6">
          <div className="rounded-[24px] border border-amber-300 bg-amber-50/70 p-8 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-500 text-white font-bold text-xl">
                ⏳
              </span>
              <div>
                <StatusBadge value={company.status} />
                <h2 className="mt-1 text-2xl font-black text-slate-900">
                  {company.status === 'PENDING' ? 'Workspace Under Review' : 'Workspace Requires Attention'}
                </h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 max-w-2xl leading-relaxed">
              {company.status === 'PENDING'
                ? 'Your company profile has been submitted and is currently being verified by the System Administrator. Complete your company profile information below while review is in progress.'
                : `Your workspace is not currently approved. Reason: ${company.rejection_reason || 'Under administrative check'}`}
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="primary" onClick={() => setTab('profile')}>
                Complete Company Profile
              </Button>
              <Button variant="secondary" onClick={load}>
                Check Status
              </Button>
            </div>
          </div>
          <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
        </div>
      </CompanyAdminShell>
    );
  }

  // Setup completion steps
  const profileComplete = Boolean(
    company.phone && company.address && company.website && company.description && company.has_logo
  );
  const setupSteps: Array<[string, boolean, string]> = [
    ['Company workspace approved', true, 'overview'],
    ['Complete company branding profile', profileComplete, 'profile'],
    ['Add or import employee roster', employees.length > 0, 'employees'],
    ['Set active card template standard', Boolean(selectedTemplate), 'templates'],
    ['Review membership requests', pendingMemberships.length === 0 && memberships.length > 0, 'memberships'],
  ];
  const completedSetupCount = setupSteps.filter(s => s[1]).length;

  return (
    <CompanyAdminShell
      user={user || { username: 'Admin', role: 'COMPANY_ADMIN' }}
      companyName={company.name}
      companyStatus={company.status}
      pendingMembershipsCount={pendingMemberships.length}
      pendingRequestsCount={pendingRequests.length}
      navigation={companyNav}
      activeTab={tab}
      onNavigate={setTab}
      onLogout={onLogout || (() => {})}
    >
      <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

      {/* ==============================================================================================
         TAB 1: OVERVIEW
         ============================================================================================== */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Workspace Hero Banner (TechKnowGram Theme) */}
          <div className="relative overflow-hidden rounded-[24px] bg-[#080d26] text-white p-7 sm:p-8 shadow-xs border border-[#1a2462]">
            <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-[#101845] text-white font-display text-2xl font-black border border-[#1a2462] shrink-0 shadow-xs">
                  {company.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xs font-extrabold tracking-widest uppercase text-[#8eaee0]">
                      VERIFIED WORKSPACE #{company.id}
                    </span>
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                    {company.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 max-w-xl leading-relaxed">
                    Corporate headquarters workspace is operational. Manage roster verification, issue card requests, and oversee team branding.
                  </p>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="primary"
                  className="!text-xs font-bold shadow-xs"
                  onClick={() => setTab('employees')}
                >
                  + Add Employees
                </Button>
                <Button
                  variant="secondary"
                  className="!text-xs font-bold !bg-white/10 !text-white !border-white/20 hover:!bg-white/20"
                  onClick={() => setTab('requests')}
                >
                  Card Orders →
                </Button>
              </div>
            </div>

            {/* Quick Setup Progression */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Workspace Setup:</span>
                <strong className="text-[#8eaee0] font-mono font-bold">
                  {completedSetupCount} of {setupSteps.length} complete ({Math.round((completedSetupCount / setupSteps.length) * 100)}%)
                </strong>
              </div>
              <div className="flex items-center gap-1.5">
                {setupSteps.map(([label, done, target]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setTab(target)}
                    title={label}
                    className={cx(
                      'size-3 rounded-full transition-transform',
                      done ? 'bg-[#2d62a8]' : 'bg-white/20 hover:scale-125'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 4 Key Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Employees"
              value={activeEmployees.length}
              note={`${employees.length} total team records`}
              tone="mint"
            />
            <StatCard
              label="Pending Memberships"
              value={pendingMemberships.length}
              note={pendingMemberships.length ? 'Action required in requests' : 'All requests resolved'}
              tone={pendingMemberships.length ? 'amber' : 'slate'}
            />
            <StatCard
              label="Active Card Style"
              value={selectedTemplate?.name || 'Not Selected'}
              note={selectedTemplate ? 'Brand standard active' : 'Template configuration needed'}
              tone="violet"
            />
            <StatCard
              label="Completed Requests"
              value={completedRequests.length}
              note={`${requests.length} total card requests`}
              tone="slate"
            />
          </div>

          {/* 2-Column Operational Grid: Pending Requests & Recent Card Delivery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Queue: Pending Membership Requests */}
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pending Membership Requests</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Employees waiting for workspace verification.</p>
                </div>
                {pendingMemberships.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTab('memberships')}
                    className="text-xs font-bold text-royal hover:underline"
                  >
                    View all ({pendingMemberships.length}) →
                  </button>
                )}
              </div>

              {pendingMemberships.length > 0 ? (
                <div className="space-y-3">
                  {pendingMemberships.slice(0, 4).map(m => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-[#fafbfc] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-slate-900">
                            {m.user?.username || m.official_email}
                          </strong>
                          <MatchBadge value={m.match_status} />
                        </div>
                        <p className="text-3xs text-slate-500 font-mono mt-0.5">
                          ID: {m.employee_code} · {m.official_email}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => decideMembership(m.id, 'APPROVED')}
                          className="px-3 py-1 rounded-lg bg-[#2d62a8] text-white font-bold text-3xs hover:bg-[#28528d] disabled:opacity-50 transition-colors shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => decideMembership(m.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 font-semibold text-3xs hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <span className="text-2xl block mb-1">✓</span>
                  No pending membership requests awaiting review.
                </div>
              )}
            </div>

            {/* Right Queue: Recent Card Delivery Requests */}
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Recent Card Orders</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Status of batch printing and digital PDF deliveries.</p>
                </div>
                {requests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTab('requests')}
                    className="text-xs font-bold text-royal hover:underline"
                  >
                    View all ({requests.length}) →
                  </button>
                )}
              </div>

              {requests.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {requests.slice(0, 4).map(req => (
                    <div
                      key={req.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono font-bold text-slate-900">
                            Request #{req.id}
                          </strong>
                          <StatusBadge value={req.status} />
                        </div>
                        <small className="text-3xs text-slate-500 mt-0.5 block">
                          {req.items.length} employee{req.items.length === 1 ? '' : 's'} · {formatDate(req.created_at)}
                        </small>
                      </div>

                      <button
                        type="button"
                        onClick={() => openRequest(req)}
                        className="text-3xs font-bold text-royal hover:underline shrink-0"
                      >
                        Inspect details →
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <span className="text-2xl block mb-1">▤</span>
                  No card delivery requests created yet.
                  <div className="mt-3">
                    <Button variant="secondary" className="!text-xs font-bold" onClick={() => setTab('employees')}>
                      Select employees to begin →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================================
         TAB 2: EMPLOYEES DIRECTORY
         ============================================================================================== */}
      {tab === 'employees' && (
        <div className="space-y-6">
          <PageHeader
            title="Employees Directory"
            subtitle="Manage your company people roster, upload photos, and select verified employees for card printing."
            actions={
              <>
                <Button variant="secondary" className="!text-xs font-bold" onClick={() => download('/employees/export', 'employees.csv')}>
                  Export CSV
                </Button>
                <Button variant="secondary" className="!text-xs font-bold" onClick={() => setCsvOpen(true)}>
                  Import CSV
                </Button>
                <Button
                  variant="primary"
                  className="!text-xs font-bold"
                  onClick={() => {
                    setEmployeeError('');
                    setEmployeeEditor(null);
                  }}
                >
                  + Add Employee
                </Button>
              </>
            }
          />

          <div className="rounded-[24px] border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            {/* Filter Toolbar (ikelma style) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-[#fafbfc] px-6 py-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {/* Search */}
                <div className="flex min-w-64 items-center rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
                  <span className="text-sm text-slate-400">⌕</span>
                  <input
                    className="w-full bg-transparent px-2 py-2 text-xs outline-none"
                    placeholder="Search name, ID, email, role…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                {/* Department filter */}
                <select
                  className={compactSelectClass}
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                >
                  <option value="ALL">All departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Status filter */}
                <select
                  className={compactSelectClass}
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">All statuses</option>
                  <option value="ACTIVE">Active employees</option>
                  <option value="INACTIVE">Inactive employees</option>
                </select>

                {(search || department !== 'ALL' || statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setDepartment('ALL');
                      setStatusFilter('ALL');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-500 font-medium shrink-0">
                Showing {visibleEmployees.length} of {employees.length} records
              </span>
            </div>

            {/* High-efficiency Data Table */}
            {employees.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={cx(thClass, 'w-12 text-center')}>
                          <input
                            type="checkbox"
                            className={checkboxClass}
                            aria-label="Select all on this page"
                            checked={pageSelected}
                            onChange={() =>
                              setSelectedEmployees(curr =>
                                pageSelected
                                  ? curr.filter(id => !activeOnPage.some(item => item.id === id))
                                  : [...new Set([...curr, ...activeOnPage.map(item => item.id)])]
                              )
                            }
                          />
                        </th>
                        <th className={thClass}>Employee</th>
                        <th className={thClass}>Role & Department</th>
                        <th className={thClass}>Contact</th>
                        <th className={thClass}>Status</th>
                        <th className={cx(thClass, 'text-right')}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pageEmployees.map(emp => {
                        const isSelected = selectedEmployees.includes(emp.id);
                        return (
                          <tr
                            key={emp.id}
                            className={cx(
                              'hover:bg-[#fafbfc] transition-colors',
                              isSelected && 'bg-[#f0fdf4]'
                            )}
                          >
                            <td className={cx(tdClass, 'text-center')}>
                              <input
                                type="checkbox"
                                disabled={!emp.is_active}
                                checked={isSelected}
                                onChange={() => toggleEmployee(emp.id)}
                                className={checkboxClass}
                              />
                            </td>
                            <td className={tdClass}>
                              <div className="flex items-center gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#080d26] text-[#8eaee0] font-display text-2xs font-bold border border-[#1a2462]">
                                  {emp.name
                                    .split(' ')
                                    .map(p => p[0])
                                    .slice(0, 2)
                                    .join('')}
                                </span>
                                <div>
                                  <strong className="block text-xs font-bold text-slate-900">{emp.name}</strong>
                                  <span className="text-3xs text-slate-500 font-mono">
                                    {emp.employee_id} {emp.has_photo ? '· Photo ready' : ''}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className={tdClass}>
                              <span className="block text-xs font-medium text-slate-800">{emp.designation}</span>
                              <span className="block text-3xs text-slate-500">{emp.department}</span>
                            </td>
                            <td className={tdClass}>
                              <span className="block text-xs font-mono text-slate-700">{emp.email}</span>
                              <span className="block text-3xs text-slate-400 font-mono">{emp.phone}</span>
                            </td>
                            <td className={tdClass}>
                              <StatusBadge value={emp.is_active ? 'ACTIVE' : 'INACTIVE'} />
                            </td>
                            <td className={cx(tdClass, 'text-right')}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  className={rowActionClass}
                                  onClick={() => {
                                    setEmployeeError('');
                                    setEmployeeEditor(emp);
                                  }}
                                >
                                  Edit
                                </button>
                                <label className={rowActionClass}>
                                  Photo
                                  <input
                                    className="hidden"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={e => uploadPhoto(emp, e.target.files?.[0])}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className={rowActionClass}
                                  onClick={() => changeEmployeeStatus(emp)}
                                >
                                  {emp.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                      value={pageSize}
                      onChange={e => setPageSize(Number(e.target.value))}
                    >
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span className="ml-2 font-mono">
                      Page {page} of {pageCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className={pagerButtonClass}
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      className={pagerButtonClass}
                      disabled={page === pageCount}
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {/* Sticky Selection Action Bar */}
                {selectedEmployees.length > 0 && (
                  <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-slate-900 bg-slate-900 text-white px-6 py-3.5 shadow-xl">
                    <p className="text-xs font-semibold">
                      <strong className="text-[#8eaee0] font-bold">{selectedEmployees.length}</strong> active employee
                      {selectedEmployees.length !== 1 ? 's' : ''} selected for card printing
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployees([])}
                        className="text-xs text-slate-400 hover:text-white underline mr-2"
                      >
                        Clear
                      </button>
                      <Button
                        variant="sun"
                        disabled={busy}
                        onClick={createRequest}
                        className="!text-xs font-bold"
                      >
                        {busy ? 'Submitting…' : `Create Card Request (${selectedEmployees.length}) →`}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <span className="text-3xl block mb-2">♙</span>
                <p className="text-sm font-bold text-slate-700">No employees added yet.</p>
                <p className="mt-1 text-xs text-slate-500">Add an employee manually or import a team CSV.</p>
                <Button
                  variant="primary"
                  className="mt-4 !text-xs font-bold"
                  onClick={() => setEmployeeEditor(null)}
                >
                  + Add First Employee
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================================
         TAB 3: MEMBERSHIP REQUESTS
         ============================================================================================== */}
      {tab === 'memberships' && (
        <div className="space-y-6">
          <PageHeader
            title="Membership Requests"
            subtitle="Review submitted employee credentials against your company roster. Approved employees unlock verified branding and templates."
            actions={
              <select
                className={compactSelectClass}
                value={membershipFilter}
                onChange={e => setMembershipFilter(e.target.value)}
              >
                <option value="ALL">All requests</option>
                <option value="PENDING">Pending review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            }
          />

          <div className="rounded-[24px] border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            {memberships.filter(m => (membershipFilter === 'ALL' ? true : m.status === membershipFilter)).length > 0 ? (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Employee User</th>
                      <th className={thClass}>Submitted Credentials</th>
                      <th className={thClass}>Roster Verification</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Requested</th>
                      <th className={cx(thClass, 'text-right')}>Decision Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {memberships
                      .filter(m => (membershipFilter === 'ALL' ? true : m.status === membershipFilter))
                      .map(m => (
                        <tr key={m.id} className="hover:bg-[#fafbfc] transition-colors">
                          <td className={tdClass}>
                            <strong className="block text-xs font-bold text-slate-900">
                              {m.user?.username || m.official_email}
                            </strong>
                            <span className="text-3xs text-slate-400 font-mono">
                              User Account #{m.user_id}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <span className="block text-xs font-mono font-bold text-slate-800">
                              ID: {m.employee_code}
                            </span>
                            <span className="block text-3xs font-mono text-slate-500">
                              {m.official_email}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <MatchBadge value={m.match_status} />
                          </td>
                          <td className={tdClass}>
                            <StatusBadge value={m.status} />
                          </td>
                          <td className={tdClass}>
                            <span className="text-xs text-slate-600 font-mono">
                              {new Date(m.requested_at).toLocaleDateString()}
                            </span>
                          </td>
                          <td className={cx(tdClass, 'text-right')}>
                            {m.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="sun"
                                  className="!px-3 !py-1 !text-2xs font-bold"
                                  disabled={busy}
                                  onClick={() => decideMembership(m.id, 'APPROVED')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  className="!px-3 !py-1 !text-2xs font-semibold"
                                  disabled={busy}
                                  onClick={() => decideMembership(m.id, 'REJECTED')}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : m.status === 'APPROVED' ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => decideMembership(m.id, 'REVOKED')}
                                className="text-3xs font-bold text-rose-600 hover:underline"
                              >
                                Revoke Access
                              </button>
                            ) : (
                              <span className="text-3xs text-slate-400">Archived</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <span className="text-3xl block mb-2">✓</span>
                <p className="text-sm font-bold text-slate-700">No membership requests found.</p>
                <p className="mt-1 text-xs text-slate-500">When employees submit requests to link with your company, they will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================================
         TAB 4: CARD ORDERS & REQUESTS
         ============================================================================================== */}
      {tab === 'requests' && (
        <div className="space-y-6">
          <PageHeader
            title="Card Orders & Delivery"
            subtitle="Follow batch request status, inspect generated employee cards, and review checkout records."
            actions={
              <Button variant="primary" className="!text-xs font-bold" onClick={createRequest}>
                + Create New Card Request
              </Button>
            }
          />

          {/* Sub-view switcher */}
          <div className="flex items-center rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xs max-w-md">
            <button
              type="button"
              onClick={() => setOrdersSubView('requests')}
              className={cx(
                'flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center',
                ordersSubView === 'requests' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Batch Card Requests ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setOrdersSubView('checkouts')}
              className={cx(
                'flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center',
                ordersSubView === 'checkouts' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Employee Orders ({orders.length})
            </button>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            {ordersSubView === 'requests' ? (
              requests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={thClass}>Request ID</th>
                        <th className={thClass}>Submitted</th>
                        <th className={thClass}>Employees</th>
                        <th className={thClass}>Design Template</th>
                        <th className={thClass}>Status</th>
                        <th className={cx(thClass, 'text-right')}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requests.map(req => (
                        <tr key={req.id} className="hover:bg-[#fafbfc] transition-colors">
                          <td className={tdClass}>
                            <strong className="font-mono text-xs font-bold text-slate-900">
                              #{req.id}
                            </strong>
                          </td>
                          <td className={tdClass}>
                            <span className="text-xs text-slate-700 font-mono">
                              {formatDate(req.created_at)}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <span className="text-xs font-semibold text-slate-800">
                              {req.items.length} employee{req.items.length === 1 ? '' : 's'}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <span className="text-xs text-slate-600">
                              {req.template?.name || `Template #${req.template_id}`}
                            </span>
                          </td>
                          <td className={tdClass}>
                            <StatusBadge value={req.status} />
                          </td>
                          <td className={cx(tdClass, 'text-right')}>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="secondary"
                                className="!px-3 !py-1 !text-2xs font-bold"
                                onClick={() => openRequest(req)}
                              >
                                View Details
                              </Button>
                              {req.status === 'COMPLETED' && (
                                <Button
                                  variant="primary"
                                  className="!px-3 !py-1 !text-2xs font-bold"
                                  onClick={() =>
                                    download(
                                      `/card-requests/${req.id}/cards/download`,
                                      `card-request-${req.id}.zip`
                                    )
                                  }
                                >
                                  Download ZIP ↓
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <span className="text-3xl block mb-2">▤</span>
                  <p className="text-sm font-bold text-slate-700">No card requests created yet.</p>
                  <p className="mt-1 text-xs text-slate-500">Select active employees from the directory to create your first batch card request.</p>
                </div>
              )
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Order Reference</th>
                      <th className={thClass}>Created</th>
                      <th className={thClass}>Batch Quantity</th>
                      <th className={thClass}>Billing Account</th>
                      <th className={thClass}>Total Amount</th>
                      <th className={thClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-[#fafbfc] transition-colors">
                        <td className={tdClass}>
                          <strong className="font-mono text-xs font-bold text-slate-900">
                            #{o.id}
                          </strong>
                        </td>
                        <td className={tdClass}>
                          <span className="text-xs text-slate-700 font-mono">
                            {formatDate(o.created_at)}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <span className="text-xs text-slate-800 font-semibold">
                            {o.quantity} {o.quantity === 1 ? 'card' : 'cards'}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <span
                            className={cx(
                              'inline-block rounded px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider',
                              o.payer === 'COMPANY'
                                ? 'bg-[#eef3fa] text-[#28528d] border border-[#d8e3f3]'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {o.payer === 'COMPANY' ? 'Company Covered' : 'Employee Self-Paid'}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <strong className="text-sm font-extrabold text-slate-900">
                            ৳{o.total_amount}
                          </strong>
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
              <div className="py-16 text-center text-slate-400">
                <span className="text-3xl block mb-2">💳</span>
                <p className="text-sm font-bold text-slate-700">No checkout orders placed yet.</p>
                <p className="mt-1 text-xs text-slate-500">Employee self-service orders will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================================
         TAB 5: TEMPLATES STUDIO
         ============================================================================================== */}
      {tab === 'templates' && (
        <CardStudio
          onSaved={async () => {
            await load();
          }}
          company={company}
          employees={employees}
          templates={templates}
          templateId={company.selected_template_id}
          onChoose={selectTemplate}
          busy={busy}
        />
      )}

      {/* ==============================================================================================
         TAB 6: COMPANY PROFILE
         ============================================================================================== */}
      {tab === 'profile' && company && (
        <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
      )}

      {/* ==============================================================================================
         TAB 7: BILLING & SPONSORSHIP (NEW)
         ============================================================================================== */}
      {tab === 'billing' && (
        <div className="space-y-6">
          <PageHeader
            title="Billing & Sponsorship Overview"
            subtitle="Transparent account expenditures, breakdown of company-sponsored card runs, and payment receipts."
          />

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Card Expenditure"
              value={`৳${totalSpend}`}
              note={`${orders.length} total card orders recorded`}
              tone="slate"
            />
            <StatCard
              label="Company Sponsored"
              value={`৳${companySponsoredTotal}`}
              note={`${companySponsoredOrders.length} orders covered 100% by company`}
              tone="mint"
            />
            <StatCard
              label="Employee Self-Paid"
              value={`৳${selfPaidTotal}`}
              note={`${selfPaidOrders.length} orders paid directly by employees`}
              tone="slate"
            />
          </div>

          {/* Current Prepress Plan Banner */}
          <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs">
            <h3 className="text-base font-extrabold text-slate-900">Current Print & Prepress Standard</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-[#fafbfc]">
                <span className="text-3xs uppercase font-extrabold text-slate-400 block">PRICING PLAN</span>
                <strong className="text-sm font-bold text-slate-900 mt-1 block">Pay-As-You-Go</strong>
                <p className="mt-1 text-slate-500">৳50 per card. No recurring subscription fees or minimum commitments.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-[#fafbfc]">
                <span className="text-3xs uppercase font-extrabold text-slate-400 block">PREPRESS SERVICE</span>
                <strong className="text-sm font-bold text-slate-900 mt-1 block">Vector PDF (300 DPI)</strong>
                <p className="mt-1 text-slate-500">Prepress inspection and high-resolution prepress rendering included for free.</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-[#fafbfc]">
                <span className="text-3xs uppercase font-extrabold text-slate-400 block">BILLING ENTITY</span>
                <strong className="text-sm font-bold text-slate-900 mt-1 block">{company.name}</strong>
                <p className="mt-1 text-slate-500">Workspace #{company.id} · Official Account</p>
              </div>
            </div>
          </div>

          {/* Detailed Receipts Table */}
          <div className="rounded-[24px] border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Print Order Invoices & Receipts</h3>
              <span className="text-xs text-slate-500">{orders.length} transactions</span>
            </div>

            {orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <thead>
                    <tr>
                      <th className={thClass}>Order ID</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Quantity</th>
                      <th className={thClass}>Payer Account</th>
                      <th className={thClass}>Total Amount</th>
                      <th className={thClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-[#fafbfc] transition-colors">
                        <td className={tdClass}>
                          <strong className="font-mono text-xs font-bold text-slate-900">
                            #{o.id}
                          </strong>
                        </td>
                        <td className={tdClass}>
                          <span className="text-xs text-slate-700 font-mono">
                            {formatDate(o.created_at)}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <span className="text-xs text-slate-800">
                            {o.quantity} {o.quantity === 1 ? 'card' : 'cards'}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <span
                            className={cx(
                              'inline-block rounded px-2.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider',
                              o.payer === 'COMPANY'
                                ? 'bg-[#eef3fa] text-[#28528d] border border-[#d8e3f3]'
                                : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {o.payer === 'COMPANY' ? 'Company Covered' : 'Employee Self-Paid'}
                          </span>
                        </td>
                        <td className={tdClass}>
                          <strong className="text-sm font-extrabold text-slate-900">
                            ৳{o.total_amount}
                          </strong>
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
              <div className="py-12 text-center text-slate-400 text-xs">
                No billing transactions recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================================
         TAB 8: WORKSPACE SETTINGS (NEW)
         ============================================================================================== */}
      {tab === 'settings' && (
        <div className="space-y-6">
          <PageHeader
            title="Workspace Settings"
            subtitle="Configure organizational preferences, employee card policy defaults, and administrative controls."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Legal Entity */}
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Workspace Identification</h3>
              <dl className="divide-y divide-slate-100 text-xs">
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Company Name</dt>
                  <dd className="font-bold text-slate-900">{company.name}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Workspace ID</dt>
                  <dd className="font-mono text-slate-800">#{company.id}</dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Workspace Verification</dt>
                  <dd>
                    <StatusBadge value={company.status} />
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between">
                  <dt className="text-slate-500">Administrator</dt>
                  <dd className="font-semibold text-slate-800">{user?.username}</dd>
                </div>
              </dl>
              <Button variant="secondary" className="w-full !text-xs font-bold" onClick={() => setTab('profile')}>
                Edit Company Profile Information →
              </Button>
            </div>

            {/* Employee Card Policy */}
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Card Sponsorship Policy</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose the default billing preference presented to employees when they request official corporate visiting cards.
              </p>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-[#fafbfc] cursor-pointer hover:bg-white transition-colors">
                  <input
                    type="radio"
                    name="sponsorship"
                    checked={defaultSponsorship === 'COMPANY'}
                    onChange={() => {
                      setDefaultSponsorship('COMPANY');
                      setMessage('Default policy set to Company Sponsored.');
                    }}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">
                      Company Sponsored (Default)
                    </strong>
                    <span className="block text-3xs text-slate-500 mt-0.5">
                      Card orders placed by approved employees are billed directly to the company (৳0 for employee).
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-[#fafbfc] cursor-pointer hover:bg-white transition-colors">
                  <input
                    type="radio"
                    name="sponsorship"
                    checked={defaultSponsorship === 'INDIVIDUAL'}
                    onChange={() => {
                      setDefaultSponsorship('INDIVIDUAL');
                      setMessage('Default policy set to Employee Self-Paid.');
                    }}
                    className="mt-0.5 accent-slate-900"
                  />
                  <div>
                    <strong className="block text-xs font-bold text-slate-900">
                      Employee Self-Paid
                    </strong>
                    <span className="block text-3xs text-slate-500 mt-0.5">
                      Employees pay individually for their card orders at ৳50 per card.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIALOGS */}
      {csvOpen && (
        <CsvImportDialog
          employees={employees}
          onClose={() => setCsvOpen(false)}
          onComplete={async count => {
            setCsvOpen(false);
            setMessage(`${count} employees imported successfully.`);
            await load();
          }}
        />
      )}

      {wizardOpen && (
        <RequestWizard
          company={company}
          employees={employees}
          templates={templates}
          initialIds={selectedEmployees}
          onClose={() => setWizardOpen(false)}
          onComplete={async () => {
            setWizardOpen(false);
            setSelectedEmployees([]);
            setTab('requests');
            await load();
          }}
        />
      )}

      {employeeEditor !== undefined && (
        <EmployeeDialog
          employee={employeeEditor}
          busy={busy}
          apiError={employeeError}
          onSave={saveEmployee}
          onClose={() => setEmployeeEditor(undefined)}
        />
      )}

      {requestViewer && (
        <RequestDetails viewer={requestViewer} onClose={() => setRequestViewer(null)} onDownload={download} />
      )}
    </CompanyAdminShell>
  );
}

interface RequestDetailsProps {
  viewer: RequestViewerState;
  onClose: () => void;
  onDownload: (path: string, filename: string) => void | Promise<void>;
}

function RequestDetails({ viewer, onClose, onDownload }: RequestDetailsProps) {
  const { request, cards } = viewer;
  const steps: Array<[string, string | null, boolean]> = [
    ['Request submitted', request.created_at, true],
    ['Administrator decision', request.decided_at, Boolean(request.decided_at)],
    [
      request.status === 'REJECTED' ? 'Request rejected' : 'Cards generated',
      request.status === 'COMPLETED' ? request.decided_at : null,
      ['COMPLETED', 'REJECTED'].includes(request.status),
    ],
  ];
  return (
    <ReviewDialog title={`Card request #${request.id}`} onClose={onClose}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <StatusBadge value={request.status} />
          <p className="mt-2 text-xs text-[#8a8391]">
            {request.items.length} employee{request.items.length === 1 ? '' : 's'} · {request.template?.name}
          </p>
        </div>
        {request.status === 'COMPLETED' && (
          <Button
            onClick={() =>
              onDownload(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)
            }
          >
            Download all ZIP
          </Button>
        )}
      </div>
      <div className="mt-5.5 mb-7 flex max-md:flex-col max-md:gap-0">
        {steps.map(([label, time, done], index) => (
          <div className="flex flex-1 items-start max-md:min-h-16 max-md:flex-none" key={label}>
            <span
              className={cx(
                'grid size-7.5 shrink-0 place-items-center rounded-full border text-3xs font-extrabold',
                done ? 'border-[#b8e2ce] bg-[#e9f8f0] text-[#20805a]' : 'border-[#e3e8e6] bg-white text-[#7c8a90]'
              )}
            >
              {done ? '✓' : index + 1}
            </span>
            <i className="mx-2 mt-4 h-px flex-1 bg-[#e3e8e6] max-md:mx-0 max-md:mt-7.5 max-md:-ml-4 max-md:h-8.5 max-md:w-px max-md:flex-none" />
            <p className="ml-2 min-w-26.5">
              <strong className="block text-2xs">{label}</strong>
              <small className="mt-1 block text-3xs text-[#7c8a90]">{time ? formatDate(time) : 'Waiting'}</small>
            </p>
          </div>
        ))}
      </div>
      {request.rejection_reason && (
        <div className="my-5 rounded-r-lg border-l-3 border-[#e05d68] bg-[#fff4f5] px-4 py-3.5">
          <strong className="text-xs text-[#98404a]">Decision note</strong>
          <p className="mt-1.5 text-xs leading-relaxed text-[#8b6267]">{request.rejection_reason}</p>
        </div>
      )}
      <h3 className="mt-6 mb-3 text-sm font-extrabold">Employees included</h3>
      <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
        {request.items.map(item => (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#e3e8e6] p-2.5" key={item.id}>
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e9e5fb] text-2xs font-extrabold text-[#6431c2]">
              {item.employee.name.charAt(0)}
            </span>
            <p>
              <strong className="block text-2xs">{item.employee.name}</strong>
              <small className="mt-1 block text-3xs text-[#97909d]">
                {item.employee.designation} · {item.employee.department}
              </small>
            </p>
          </div>
        ))}
      </div>
      {cards.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-sm font-extrabold">Generated cards</h3>
          <div className="space-y-3">
            {cards.map(card => (
              <article
                className="flex items-center justify-between gap-5 rounded-xl border border-[#e7e9ef] p-4 max-sm:flex-col max-sm:items-start"
                key={card.id}
              >
                <div>
                  <strong>{card.file_name}</strong>
                  <p className="mt-1.5 flex items-center gap-2 text-xs text-[#8a90a0]">
                    {Math.ceil(card.file_size / 1024)} KB · <StatusBadge value={card.status} />
                  </p>
                </div>
                <div className="flex gap-2">
                  <a className={buttonClass('secondary')} href={`/verify/${card.verification_token}`} target="_blank">
                    Verify
                  </a>
                  <Button onClick={() => onDownload(`/cards/${card.id}/download`, card.file_name)}>
                    Download
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </ReviewDialog>
  );
}
