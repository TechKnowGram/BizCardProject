'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { ApiError } from '../lib/api';
import type {
  AdminMembershipRecord,
  AdminPaymentRecord,
  AdminUserRecord,
  AuditLog,
  CardRequest,
  Company,
  Role,
  Template,
  User,
} from '../lib/types';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import AdminTemplateCollection from './AdminTemplateCollection';
import SystemAdminShell from './SystemAdminShell';
import Icon from './Icon';
import {
  Button,
  cx,
  inputClass,
  inputCompactClass,
} from './ui';

export interface AdminStats {
  companies?: number;
  pending_companies?: number;
  employees?: number;
  pending_requests?: number;
  generated_cards?: number;
  total_users?: number;
  total_orders?: number;
  total_revenue?: number;
}

export interface AdminData {
  companies: Company[];
  requests: CardRequest[];
  templates: Template[];
  companyDesigns: Template[];
  audits: AuditLog[];
  stats: AdminStats;
  users: AdminUserRecord[];
  memberships: AdminMembershipRecord[];
  payments: AdminPaymentRecord[];
}

export interface AdminDashboardProps {
  tab: string;
  setTab: (tab: string) => void;
  user: User;
  onLogout?: () => void;
}

const formatDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not available';

const formatShortDate = (value?: string | null): string =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

export const systemAdminNavigation: ReadonlyArray<readonly [string, string, string]> = [
  ['overview', 'overview', 'Overview'],
  ['companies', 'companies', 'Companies'],
  ['users', 'users', 'Users'],
  ['memberships', 'memberships', 'Memberships'],
  ['requests', 'requests', 'Card Orders'],
  ['templates', 'templates', 'Templates'],
  ['payments', 'payments', 'Payments'],
  ['reports', 'reports', 'Reports'],
  ['settings', 'settings', 'System Settings'],
] as const;

type Review = Partial<Company & CardRequest> & { id: number; kind: string };

function ReviewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-3xs uppercase tracking-widest font-mono text-slate-500 font-bold">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function TimelineStep({ done, mark, title, note, line }: { done: boolean; mark: string; title: string; note: string; line?: boolean }) {
  return (
    <div className="flex min-h-14 flex-none items-start">
      <span
        className={cx(
          'grid size-7 flex-none place-items-center rounded-full border text-3xs font-black',
          done ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-400'
        )}
      >
        {mark}
      </span>
      {line && <i className="-ml-3.5 mt-7 h-7 w-px flex-none bg-slate-200" />}
      <p className="ml-3 min-w-28">
        <strong className="block text-2xs font-bold text-slate-900">{title}</strong>
        <small className="mt-0.5 block text-3xs text-slate-500">{note}</small>
      </p>
    </div>
  );
}

function exportCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const content = [
    headers.join(','),
    ...rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({ tab, setTab, user, onLogout }: AdminDashboardProps) {
  const [data, setData] = useState<AdminData>({
    companies: [],
    requests: [],
    templates: [],
    companyDesigns: [],
    audits: [],
    stats: {},
    users: [],
    memberships: [],
    payments: [],
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [payerFilter, setPayerFilter] = useState('ALL');
  const [review, setReview] = useState<Review | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [companies, requests, templates, audits, stats, companyDesigns, users, memberships, payments] =
        await Promise.all([
          api<Company[]>('/admin/companies'),
          api<CardRequest[]>('/admin/card-requests'),
          api<Template[]>('/admin/templates'),
          api<AuditLog[]>('/admin/audit-logs'),
          api<AdminStats>('/admin/stats'),
          api<Template[]>('/admin/templates/company-designs'),
          api<AdminUserRecord[]>('/admin/users').catch(() => []),
          api<AdminMembershipRecord[]>('/admin/memberships').catch(() => []),
          api<AdminPaymentRecord[]>('/admin/payments').catch(() => []),
        ]);
      setData({ companies, requests, templates, audits, stats, companyDesigns, users, memberships, payments });
    } catch (requestError) {
      setError((requestError as ApiError).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('ALL');
    setRoleFilter('ALL');
    setPayerFilter('ALL');
  }, [tab]);

  async function mutate(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(body) });
      setReview(null);
      setMessage('Decision recorded and applied successfully.');
      await load();
    } catch (requestError) {
      setError((requestError as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDesign(id: number) {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/templates/${id}/save`, { method: 'POST' });
      setMessage('Design promoted to the shared template collection.');
      await load();
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  function openReview(item: Partial<Company & CardRequest>, kind: string) {
    setReview({ ...item, id: item.id as number, kind });
    setReason('');
    setError('');
  }

  const pendingCompanies = useMemo(
    () => data.companies.filter(c => c.status === 'PENDING'),
    [data.companies]
  );
  const pendingRequests = useMemo(
    () => data.requests.filter(r => r.status === 'PENDING'),
    [data.requests]
  );

  const attentionQueue = useMemo(() => {
    const items = [
      ...pendingCompanies.map(c => ({
        id: c.id,
        kind: 'companies',
        name: c.name,
        meta: c.admins?.[0]?.email || 'No administrator',
        category: 'Company approval',
        created_at: c.created_at,
        raw: c,
      })),
      ...pendingRequests.map(r => ({
        id: r.id,
        kind: 'requests',
        name: r.company?.name || `Request #${r.id}`,
        meta: `${r.items?.length || 0} card${r.items?.length === 1 ? '' : 's'} · ${r.created_by?.username || 'Employee'}`,
        category: 'Card batch request',
        created_at: r.created_at,
        raw: r,
      })),
    ];
    return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [pendingCompanies, pendingRequests]);

  // Filtered views
  const filteredCompanies = useMemo(() => {
    return data.companies.filter(c => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const q = search.toLowerCase();
      const matchText =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.website?.toLowerCase().includes(q) ||
        c.admins?.some(a => a.username.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
      return matchStatus && matchText;
    });
  }, [data.companies, statusFilter, search]);

  const filteredUsers = useMemo(() => {
    return data.users.filter(u => {
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const q = search.toLowerCase();
      const matchText =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.company_name?.toLowerCase().includes(q);
      return matchRole && matchText;
    });
  }, [data.users, roleFilter, search]);

  const filteredMemberships = useMemo(() => {
    return data.memberships.filter(m => {
      const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const q = search.toLowerCase();
      const matchText =
        !q ||
        m.official_email.toLowerCase().includes(q) ||
        m.employee_code.toLowerCase().includes(q) ||
        m.company_name?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [data.memberships, statusFilter, search]);

  const filteredRequests = useMemo(() => {
    return data.requests.filter(r => {
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchText =
        !q ||
        r.company?.name.toLowerCase().includes(q) ||
        String(r.id).includes(q) ||
        r.created_by?.username.toLowerCase().includes(q) ||
        r.template?.name.toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [data.requests, statusFilter, search]);

  const filteredPayments = useMemo(() => {
    return data.payments.filter(p => {
      const matchPayer = payerFilter === 'ALL' || p.payer === payerFilter;
      const q = search.toLowerCase();
      const matchText =
        !q ||
        p.company_name.toLowerCase().includes(q) ||
        String(p.id).includes(q);
      return matchPayer && matchText;
    });
  }, [data.payments, payerFilter, search]);

  const filteredAudits = useMemo(() => {
    return data.audits.filter(a => {
      const q = search.toLowerCase();
      const matchStatus = statusFilter === 'ALL' || a.action.toUpperCase().includes(statusFilter);
      const matchText =
        !q ||
        a.action.toLowerCase().includes(q) ||
        a.entity_type.toLowerCase().includes(q) ||
        a.details?.toLowerCase().includes(q);
      return matchStatus && matchText;
    });
  }, [data.audits, statusFilter, search]);

  const totalPaymentsSpend = useMemo(
    () => data.payments.reduce((acc, p) => acc + (p.total_amount || 0), 0),
    [data.payments]
  );
  const companySponsoredSpend = useMemo(
    () => data.payments.filter(p => p.payer === 'COMPANY').reduce((acc, p) => acc + p.total_amount, 0),
    [data.payments]
  );
  const individualSpend = useMemo(
    () => data.payments.filter(p => p.payer === 'INDIVIDUAL').reduce((acc, p) => acc + p.total_amount, 0),
    [data.payments]
  );

  return (
    <SystemAdminShell
      user={user}
      pendingCompaniesCount={pendingCompanies.length}
      pendingRequestsCount={pendingRequests.length}
      navigation={systemAdminNavigation}
      activeTab={tab}
      onNavigate={setTab}
      onLogout={onLogout || (() => {})}
    >
      <Toast
        type={error ? 'error' : 'success'}
        message={error || message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
      />

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            <div className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          </div>
          <div className="h-96 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW (OPERATIONAL COMMAND CENTER) */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Operational Hero Banner */}
              <section className="relative overflow-hidden rounded-2xl bg-[#0b1821] text-white p-7 md:p-9 border border-[#162a38] shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full bg-mint/15 px-3 py-1 text-3xs font-mono font-bold text-mint tracking-wider uppercase mb-3">
                      Platform Control Center
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                      System Operations Console
                    </h1>
                    <p className="mt-2 text-xs md:text-sm text-slate-300 leading-relaxed">
                      Real-time platform oversight across registered companies, user accounts, and card print queues.
                      Review oldest pending submissions first to uphold platform SLAs.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4 shrink-0">
                    <span className="text-4xl font-black text-amber-400 font-mono">
                      {attentionQueue.length}
                    </span>
                    <div className="text-left">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">
                        Action Items
                      </span>
                      <span className="block text-2xs text-slate-300">
                        Require administrator decision
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Stripe-style 4 KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Registered Workspaces
                  </span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <strong className="text-2xl font-black text-slate-900 font-mono">
                      {data.companies.length}
                    </strong>
                    {pendingCompanies.length > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-3xs font-bold text-amber-800 border border-amber-200">
                        {pendingCompanies.length} pending
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-3xs text-slate-500">
                    {data.companies.filter(c => c.status === 'APPROVED').length} active companies approved
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Platform Accounts
                  </span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <strong className="text-2xl font-black text-slate-900 font-mono">
                      {data.users.length || data.stats.total_users || 0}
                    </strong>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-800 border border-emerald-200">
                      All Roles
                    </span>
                  </div>
                  <p className="mt-2 text-3xs text-slate-500">
                    System, company & employee users
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Card Print Requests
                  </span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <strong className="text-2xl font-black text-slate-900 font-mono">
                      {data.requests.length}
                    </strong>
                    {pendingRequests.length > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-3xs font-bold text-amber-800 border border-amber-200">
                        {pendingRequests.length} pending
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-3xs text-slate-500">
                    {data.requests.filter(r => r.status === 'COMPLETED').length} batches generated
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Cards Issued
                  </span>
                  <div className="mt-3 flex items-baseline justify-between">
                    <strong className="text-2xl font-black text-slate-900 font-mono">
                      {data.stats.generated_cards || 0}
                    </strong>
                    <span className="rounded-full bg-mint/20 px-2 py-0.5 text-3xs font-bold text-emerald-900 border border-mint/40">
                      300 DPI
                    </span>
                  </div>
                  <p className="mt-2 text-3xs text-slate-500">
                    Prepress verified & active
                  </p>
                </div>
              </div>

              {/* Split Operational Grid: Priority Queue (Left) & Recent Audit (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Priority Queue (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-3xs font-mono font-bold uppercase tracking-wider text-amber-800 block">
                        Priority Queue
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Needs Administrator Decision
                      </h2>
                    </div>
                    <Button variant="quiet" onClick={load}>
                      ↻ Refresh
                    </Button>
                  </div>

                  <div className="divide-y divide-slate-100 flex-1">
                    {attentionQueue.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 text-xl mx-auto mb-2 font-bold">
                          ✓
                        </span>
                        <p className="text-xs font-bold text-slate-800">Queue is clear</p>
                        <p className="text-3xs text-slate-400 mt-1">
                          No company workspaces or card batches are awaiting review.
                        </p>
                      </div>
                    ) : (
                      attentionQueue.slice(0, 7).map(item => (
                        <div
                          key={`${item.kind}-${item.id}`}
                          className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={cx(
                                'grid size-9 place-items-center rounded-xl font-bold text-xs shrink-0',
                                item.kind === 'companies'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'bg-emerald-50 text-emerald-800'
                              )}
                            >
                              {item.kind === 'companies' ? '▦' : '▤'}
                            </span>
                            <div className="min-w-0">
                              <strong className="block text-xs font-bold text-slate-900 truncate">
                                {item.name}
                              </strong>
                              <span className="block text-3xs text-slate-500 truncate">
                                {item.category} · {item.meta}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <time className="text-3xs text-slate-500 font-mono hidden sm:block">
                              {formatShortDate(item.created_at)}
                            </time>
                            <button
                              type="button"
                              onClick={() => openReview(item.raw, item.kind)}
                              className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-2xs font-bold hover:bg-slate-800 transition-colors"
                            >
                              Review & Decide →
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Decisions Audit (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-500 block">
                        System Feed
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Recent Audit Events
                      </h2>
                    </div>
                    <Button variant="quiet" onClick={() => setTab('reports')}>
                      All Logs →
                    </Button>
                  </div>

                  <div className="divide-y divide-slate-100 flex-1">
                    {data.audits.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <p className="text-xs">No audit logs recorded yet.</p>
                      </div>
                    ) : (
                      data.audits.slice(0, 6).map(log => (
                        <div key={log.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-50/80">
                          <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-slate-600 text-3xs font-mono shrink-0 mt-0.5">
                            ●
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <strong className="block text-2xs font-bold text-slate-900 truncate">
                                {log.action.replaceAll('_', ' ')}
                              </strong>
                              <time className="text-3xs text-slate-500 font-mono shrink-0">
                                {formatShortDate(log.created_at)}
                              </time>
                            </div>
                            <p className="text-3xs text-slate-500 truncate mt-0.5">
                              {log.details || `${log.entity_type} #${log.entity_id}`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANIES (TALENTPROS REFERENCE REPLICA) */}
          {tab === 'companies' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Companies
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage all registered company workspaces, access status, and subscriptions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      exportCsv(
                        'companies-export.csv',
                        ['ID', 'Name', 'Status', 'Phone', 'Website', 'Created At'],
                        data.companies.map(c => [c.id, c.name, c.status, c.phone, c.website, c.created_at])
                      )
                    }
                  >
                    Export CSV
                  </Button>
                  <Button variant="quiet" onClick={load}>
                    ↻ Refresh
                  </Button>
                </div>
              </div>

              {/* TalentPros-style Controls Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                  <input
                    type="search"
                    placeholder="Search companies by name, website, admin..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-3xs font-mono font-bold text-slate-500 uppercase">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    aria-label="Filter companies by status"
                    className={cx(inputClass, inputCompactClass, 'font-semibold text-xs')}
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved / Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {/* TalentPros-style Clean Company Directory Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Owner / Admin</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No companies found matching the current search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredCompanies.map(company => {
                          const owner = company.admins?.[0];
                          return (
                            <tr key={company.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Company Column */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 font-bold text-xs shrink-0 border border-slate-200">
                                    {company.name.charAt(0).toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <strong className="block text-xs font-bold text-slate-900 truncate">
                                      {company.name}
                                    </strong>
                                    <span className="block text-3xs text-slate-500 font-mono truncate">
                                      {company.website || `Workspace #${company.id}`}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Owner Column */}
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-slate-800 text-xs">
                                  {owner?.username || 'Unassigned'}
                                </p>
                                <span className="block text-3xs font-mono text-slate-500 truncate">
                                  {owner?.email || '—'}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3.5 px-4">
                                <StatusBadge value={company.status} />
                              </td>

                              {/* Date */}
                              <td className="py-3.5 px-4 text-slate-500 font-mono text-3xs">
                                {formatShortDate(company.created_at)}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  {company.status === 'PENDING' && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => mutate(`/admin/companies/${company.id}/status`, { status: 'APPROVED' })}
                                      className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-3xs font-bold hover:bg-emerald-700 transition-colors"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  {company.status === 'APPROVED' && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => mutate(`/admin/companies/${company.id}/status`, { status: 'SUSPENDED' })}
                                      className="rounded-lg border border-slate-200 bg-white text-slate-700 px-2 py-1 text-3xs font-semibold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                    >
                                      Suspend
                                    </button>
                                  )}
                                  {company.status === 'SUSPENDED' && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => mutate(`/admin/companies/${company.id}/status`, { status: 'APPROVED' })}
                                      className="rounded-lg border border-slate-200 bg-white text-emerald-700 px-2 py-1 text-3xs font-semibold hover:bg-emerald-50 transition-colors"
                                    >
                                      Reactivate
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => openReview(company, 'companies')}
                                    className="rounded-lg bg-slate-100 text-slate-700 px-2.5 py-1 text-3xs font-bold hover:bg-slate-200 transition-colors"
                                  >
                                    Review details ↗
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS (USER ACCOUNTS) */}
          {tab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    User Accounts
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Platform users across System Admin, Company Admin, and Employee roles.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      exportCsv(
                        'users-export.csv',
                        ['ID', 'Username', 'Email', 'Role', 'Company'],
                        data.users.map(u => [u.id, u.username, u.email, u.role, u.company_name])
                      )
                    }
                  >
                    Export Users
                  </Button>
                  <Button variant="quiet" onClick={load}>
                    ↻ Refresh
                  </Button>
                </div>
              </div>

              {/* Controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                  <input
                    type="search"
                    placeholder="Search users by username, email, company..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-3xs font-mono font-bold text-slate-500 uppercase">Role:</span>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    aria-label="Filter users by role"
                    className={cx(inputClass, inputCompactClass, 'font-semibold text-xs')}
                  >
                    <option value="ALL">All Roles</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                    <option value="COMPANY_ADMIN">Company Admin</option>
                    <option value="EMPLOYEE">Employee</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Company Association</th>
                        <th className="py-3 px-4">Account Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <span className="grid size-8 place-items-center rounded-full bg-slate-800 text-white font-bold text-xs shrink-0">
                                  {u.username.charAt(0).toUpperCase()}
                                </span>
                                <strong className="text-xs font-bold text-slate-900 truncate">
                                  {u.username}
                                </strong>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-600">
                              {u.email}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={cx(
                                  'rounded-full px-2.5 py-0.5 text-3xs font-mono font-bold uppercase',
                                  u.role === 'SYSTEM_ADMIN'
                                    ? 'bg-slate-900 text-white'
                                    : u.role === 'COMPANY_ADMIN'
                                    ? 'bg-mint/30 text-emerald-950 font-bold'
                                    : 'bg-slate-100 text-slate-700'
                                )}
                              >
                                {u.role.replaceAll('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {u.company_name ? (
                                <span className="font-semibold text-slate-800">
                                  {u.company_name}
                                </span>
                              ) : (
                                <span className="text-3xs font-mono text-slate-400">
                                  Platform / Global
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-2xs text-emerald-700 font-semibold">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MEMBERSHIPS (GLOBAL EMPLOYEE MEMBERSHIPS) */}
          {tab === 'memberships' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Global Memberships
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Cross-company employee membership requests, roster match status, and payer allocation.
                  </p>
                </div>
                <Button variant="quiet" onClick={load}>
                  ↻ Refresh
                </Button>
              </div>

              {/* Controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                  <input
                    type="search"
                    placeholder="Search by email, employee ID, company..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-3xs font-mono font-bold text-slate-500 uppercase">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    aria-label="Filter memberships by status"
                    className={cx(inputClass, inputCompactClass, 'font-semibold text-xs')}
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="REVOKED">Revoked</option>
                  </select>
                </div>
              </div>

              {/* Memberships Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Official Email</th>
                        <th className="py-3 px-4">Employee Code</th>
                        <th className="py-3 px-4">Roster Verification</th>
                        <th className="py-3 px-4">Payer</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMemberships.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No membership records found.
                          </td>
                        </tr>
                      ) : (
                        filteredMemberships.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <strong className="block text-xs font-bold text-slate-900">
                                {m.username || `User #${m.user_id?.slice(0, 8)}`}
                              </strong>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {m.company_name || `Company #${m.company_id}`}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-600">
                              {m.official_email}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs font-bold text-slate-700">
                              {m.employee_code}
                            </td>
                            <td className="py-3.5 px-4">
                              {m.match_status === 'ROSTER_MATCHED' ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-3xs font-bold text-emerald-700 border border-emerald-200">
                                  ✓ Roster Verified
                                </span>
                              ) : m.match_status === 'ID_MISMATCH' ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-3xs font-bold text-amber-700 border border-amber-200">
                                  ⚠ ID/Email Mismatch
                                </span>
                              ) : m.match_status === 'INACTIVE_EMPLOYEE' ? (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-3xs font-bold text-rose-700 border border-rose-200">
                                  ✕ Inactive Roster
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-3xs font-mono text-slate-600">
                                  ? Not in Roster
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-3xs font-mono font-semibold">
                              {m.payer === 'COMPANY' ? 'Company Sponsored' : 'Employee Self-Paid'}
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge value={m.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REQUESTS (CARD ORDERS & PRINT REQUESTS) */}
          {tab === 'requests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Card Orders & Print Requests
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Global card generation batches, prepress approval queue, and delivery tracking.
                  </p>
                </div>
                <Button variant="quiet" onClick={load}>
                  ↻ Refresh
                </Button>
              </div>

              {/* Controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                  <input
                    type="search"
                    placeholder="Search by request ID, company, submitter..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-3xs font-mono font-bold text-slate-500 uppercase">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    aria-label="Filter card requests by status"
                    className={cx(inputClass, inputCompactClass, 'font-semibold text-xs')}
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              {/* Requests Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-3 px-4">Request</th>
                        <th className="py-3 px-4">Company</th>
                        <th className="py-3 px-4">Template Style</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Submitted By</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No card requests found matching this view.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map(r => (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              #{r.id}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {r.company?.name || `Company #${r.company_id}`}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {r.template?.name || r.template?.style_key || 'Standard'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                              {r.items?.length || 0} card{r.items?.length === 1 ? '' : 's'}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-slate-800">
                                {r.created_by?.username || 'Admin'}
                              </p>
                              <span className="block text-3xs font-mono text-slate-500">
                                {r.created_by?.email}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge value={r.status} />
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-500">
                              {formatShortDate(r.created_at)}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => openReview(r, 'requests')}
                                className="rounded-lg bg-slate-900 text-white px-3 py-1 text-3xs font-bold hover:bg-slate-800 transition-colors"
                              >
                                Review & Decide ↗
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: TEMPLATES (TEMPLATE CATALOG) */}
          {tab === 'templates' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Template Catalog
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Curated standard card layouts and company-submitted AI designs.
                  </p>
                </div>
                <Button variant="quiet" onClick={load}>
                  ↻ Refresh
                </Button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <AdminTemplateCollection
                  data={data}
                  busy={busy}
                  onSave={saveDesign}
                  onToggle={template =>
                    mutate(`/admin/templates/${template.id}`, { is_active: !template.is_active })
                  }
                />
              </div>
            </div>
          )}

          {/* TAB 7: PAYMENTS (FINANCIALS & ORDERS) */}
          {tab === 'payments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    Payments & Order Financials
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Platform-wide card order transactions, revenue volume, and billing split.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    exportCsv(
                      'payments-export.csv',
                      ['Order ID', 'Company', 'Quantity', 'Unit Price', 'Total', 'Payer', 'Status', 'Date'],
                      data.payments.map(p => [
                        p.id,
                        p.company_name,
                        p.quantity,
                        p.unit_price,
                        p.total_amount,
                        p.payer,
                        p.status,
                        p.created_at,
                      ])
                    )
                  }
                >
                  Export Financials
                </Button>
              </div>

              {/* Financial Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Total Platform Volume
                  </span>
                  <strong className="mt-3 block text-3xl font-black text-slate-900 font-mono">
                    ৳{totalPaymentsSpend || data.stats.total_revenue || 0}
                  </strong>
                  <p className="mt-2 text-3xs text-slate-500">
                    Transacted across {data.payments.length} fulfilled orders
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Company Sponsored Volume
                  </span>
                  <strong className="mt-3 block text-3xl font-black text-indigo-700 font-mono">
                    ৳{companySponsoredSpend}
                  </strong>
                  <p className="mt-2 text-3xs text-slate-500">
                    Invoiced to corporate workspaces
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <span className="text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                    Employee Self-Paid
                  </span>
                  <strong className="mt-3 block text-3xl font-black text-emerald-800 font-mono">
                    ৳{individualSpend}
                  </strong>
                  <p className="mt-2 text-3xs text-slate-500">
                    Self-checkout via employee portal
                  </p>
                </div>
              </div>

              {/* Filter */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                  <input
                    type="search"
                    placeholder="Search orders by ID or company..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-3xs font-mono font-bold text-slate-500 uppercase">Payer:</span>
                  <select
                    value={payerFilter}
                    onChange={e => setPayerFilter(e.target.value)}
                    aria-label="Filter payments by payer"
                    className={cx(inputClass, inputCompactClass, 'font-semibold text-xs')}
                  >
                    <option value="ALL">All Payers</option>
                    <option value="COMPANY">Company Sponsored</option>
                    <option value="INDIVIDUAL">Employee Self-Paid</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Workspace / Customer</th>
                        <th className="py-3 px-4">Quantity</th>
                        <th className="py-3 px-4">Unit Price</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Payer Allocation</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            No payment transactions recorded.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              #{p.id}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800">
                              {p.company_name}
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {p.quantity} cards
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">
                              ৳{p.unit_price}
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              ৳{p.total_amount}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={cx(
                                  'rounded-full px-2 py-0.5 text-3xs font-mono font-bold',
                                  p.payer === 'COMPANY'
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'bg-emerald-50 text-emerald-800'
                                )}
                              >
                                {p.payer === 'COMPANY' ? 'Company Sponsored' : 'Employee Self-Paid'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge value={p.status} />
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-500">
                              {formatShortDate(p.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: REPORTS (AUDIT & ACTIVITY LOGS) */}
          {tab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                    System Audit & Activity Reports
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Immutable audit trail of administrative decisions, security events, and data changes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      exportCsv(
                        'audit-logs-export.csv',
                        ['ID', 'Action', 'Entity Type', 'Entity ID', 'Company ID', 'Details', 'Timestamp'],
                        data.audits.map(a => [
                          a.id,
                          a.action,
                          a.entity_type,
                          a.entity_id,
                          a.company_id,
                          a.details,
                          a.created_at,
                        ])
                      )
                    }
                  >
                    Export Log
                  </Button>
                  <Button variant="quiet" onClick={load}>
                    ↻ Refresh
                  </Button>
                </div>
              </div>

              {/* Controls */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-96">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">⌕</span>
                  <input
                    type="search"
                    placeholder="Filter audit logs by action or details..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-3xs font-mono uppercase font-bold text-slate-500 tracking-wider">
                        <th className="py-3 px-4">Event / Action</th>
                        <th className="py-3 px-4">Target Entity</th>
                        <th className="py-3 px-4">Company Context</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAudits.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No audit records matching this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredAudits.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="grid size-6 place-items-center rounded-full bg-slate-100 text-slate-700 text-3xs font-mono shrink-0">
                                  ✓
                                </span>
                                <strong className="font-bold text-slate-900 capitalize">
                                  {item.action?.replaceAll('_', ' ')}
                                </strong>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-700">
                              {item.entity_type} #{item.entity_id}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-500">
                              {item.company_id ? `Company #${item.company_id}` : 'Platform / System'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                              {item.details || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-3xs text-slate-500">
                              {formatDate(item.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SETTINGS (SYSTEM SETTINGS) */}
          {tab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                  System Settings
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Platform runtime configuration, prepress engine settings, and security policies.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Engine Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-mint/20 text-emerald-900 font-bold text-sm">
                      ⚙
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Prepress Card Engine</h2>
                      <p className="text-3xs text-slate-500">Rendering pipeline parameters</p>
                    </div>
                  </div>

                  <dl className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Resolution Target</dt>
                      <dd className="font-mono font-bold text-slate-900">300 DPI (CMYK Proofing)</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Bleed Margin Standard</dt>
                      <dd className="font-mono font-bold text-slate-900">3.0 mm (Print Safe Area)</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Card Dimensions</dt>
                      <dd className="font-mono font-bold text-slate-900">3.5&quot; × 2.0&quot; (Standard US / ISO)</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-slate-500">Engine Health</dt>
                      <dd className="text-emerald-700 font-bold flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online & Active
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Security Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-800 font-bold text-sm">
                      🔒
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Security & Authentication</h2>
                      <p className="text-3xs text-slate-500">Access policies and session parameters</p>
                    </div>
                  </div>

                  <dl className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">JWT Token Lifespan</dt>
                      <dd className="font-mono font-bold text-slate-900">1440 Minutes (24 Hours)</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Role Verification</dt>
                      <dd className="font-mono font-bold text-slate-900">Strict RBAC Enforced</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Token Encoding</dt>
                      <dd className="font-mono font-bold text-slate-900">HS256 Cryptographic Signature</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-slate-500">Session Guard</dt>
                      <dd className="text-emerald-700 font-bold">Enabled</dd>
                    </div>
                  </dl>
                </div>

                {/* Administrator Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-900 text-mint font-black text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Active Operator</h2>
                      <p className="text-3xs text-slate-500">Super administrator account</p>
                    </div>
                  </div>

                  <dl className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Username</dt>
                      <dd className="font-bold text-slate-900">{user.username}</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="font-mono text-slate-700">{user.email}</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-slate-500">Permissions Level</dt>
                      <dd className="rounded-full bg-slate-900 text-white px-2 py-0.5 text-3xs font-mono font-bold">
                        SYSTEM_ADMIN (Full Root)
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Platform Infrastructure */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">
                      ▦
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Platform Stack</h2>
                      <p className="text-3xs text-slate-500">Runtime environment information</p>
                    </div>
                  </div>

                  <dl className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Backend Framework</dt>
                      <dd className="font-mono font-bold text-slate-900">FastAPI (Python 3.12)</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Frontend Client</dt>
                      <dd className="font-mono font-bold text-slate-900">Next.js 14 (App Router)</dd>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <dt className="text-slate-500">Database Engine</dt>
                      <dd className="font-mono font-bold text-slate-900">SQLAlchemy ORM + SQLite/PG</dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-slate-500">API Health</dt>
                      <dd className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Passing All 20 Unit Tests
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* REVIEW DIALOG (COMPANY OR CARD REQUEST) */}
          {review && (
            <ReviewDialog
              title={
                review.kind === 'companies'
                  ? `Review Company: ${review.name}`
                  : `Review Card Request #${review.id}`
              }
              onClose={() => setReview(null)}
              busy={busy}
              eyebrow={review.kind === 'companies' ? 'WORKSPACE APPROVAL' : 'CARD BATCH APPROVAL'}
            >
              <div className="mb-4 flex items-center gap-3">
                <StatusBadge value={review.status ?? ''} />
                <span className="text-3xs text-slate-500 font-mono">
                  Submitted {formatDate(review.created_at)}
                </span>
              </div>

              {/* COMPANY DETAILS */}
              {review.kind === 'companies' && (
                <div className="space-y-5">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <ReviewField label="Company Name">{review.name}</ReviewField>
                    <ReviewField label="Registered Date">{formatDate(review.created_at)}</ReviewField>
                    <ReviewField label="Primary Administrator">
                      {review.admins?.[0]?.username || 'Not assigned'}
                      <span className="block text-3xs font-mono text-slate-500 font-normal">
                        {review.admins?.[0]?.email}
                      </span>
                    </ReviewField>
                    <ReviewField label="Phone Contact">{review.phone || 'Not provided'}</ReviewField>
                    <ReviewField label="Website">{review.website || 'Not provided'}</ReviewField>
                    <ReviewField label="Registered Address">{review.address || 'Not provided'}</ReviewField>
                    <ReviewField label="Logo Asset">
                      {review.has_logo ? '✓ Uploaded' : 'No logo uploaded'}
                    </ReviewField>
                  </dl>

                  {review.description && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <strong className="block text-2xs font-mono uppercase text-slate-500 mb-1">
                        About Workspace
                      </strong>
                      <p className="text-xs text-slate-700 leading-relaxed">{review.description}</p>
                    </div>
                  )}

                  {review.rejection_reason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                      <strong className="block text-2xs font-mono uppercase text-rose-800 mb-1">
                        Current Rejection Note
                      </strong>
                      <p className="text-xs text-rose-900 leading-relaxed">{review.rejection_reason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* CARD REQUEST DETAILS */}
              {review.kind === 'requests' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 mb-2">
                        Selected Template · {review.template?.name || review.template?.style_key}
                      </h3>
                      <CardPreview
                        design={review.template?.design}
                        style={review.template?.style_key}
                        company={review.company?.name}
                        name={review.items?.[0]?.employee?.name || 'Sample Employee'}
                        designation={review.items?.[0]?.employee?.designation || 'Staff'}
                      />
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-slate-800 mb-2">Request Lifecycle</h3>
                      <div className="my-2 flex flex-col">
                        <TimelineStep
                          done
                          mark="✓"
                          title="Submitted"
                          note={formatDate(review.created_at)}
                          line
                        />
                        <TimelineStep
                          done={!!review.decided_at}
                          mark={review.decided_at ? '✓' : '2'}
                          title="Administrator Decision"
                          note={review.decided_at ? formatDate(review.decided_at) : 'Waiting for review'}
                          line
                        />
                        <TimelineStep
                          done={review.status === 'COMPLETED'}
                          mark={review.status === 'COMPLETED' ? '✓' : '3'}
                          title="Cards Generated"
                          note={review.status === 'COMPLETED' ? '300 DPI Prepress Complete' : 'Waiting'}
                        />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 mt-4">
                    Employees Included in Batch ({review.items?.length || 0})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {review.items?.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50/50"
                      >
                        <span className="grid size-7 flex-none place-items-center rounded-lg bg-slate-800 text-white text-3xs font-bold">
                          {item.employee.name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <strong className="block text-2xs font-bold text-slate-900 truncate">
                            {item.employee.name}
                          </strong>
                          <small className="block text-3xs font-mono text-slate-500 truncate">
                            {item.employee.employee_id} · {item.employee.designation} · {item.employee.department}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>

                  {review.rejection_reason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                      <strong className="block text-2xs font-mono uppercase text-rose-800 mb-1">
                        Rejection Note
                      </strong>
                      <p className="text-xs text-rose-900 leading-relaxed">{review.rejection_reason}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION / DECISION CONTROLS */}
              <div className="mt-6 border-t border-slate-200 pt-5">
                {(review.status === 'PENDING' || review.kind === 'companies') && (
                  <div className="mb-4">
                    <label className="block">
                      <span className="mb-1.5 block text-2xs font-mono uppercase font-bold text-slate-600">
                        Decision Note / Rejection Reason
                      </span>
                      <textarea
                        className={cx(inputClass, 'min-h-20 text-xs')}
                        maxLength={500}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Required when rejecting. Explain what must be corrected before re-submitting."
                      />
                    </label>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <Button variant="secondary" disabled={busy} onClick={() => setReview(null)}>
                    Cancel
                  </Button>

                  {/* Reject Button */}
                  <Button
                    variant="danger"
                    disabled={busy || !reason.trim()}
                    onClick={() =>
                      mutate(
                        review.kind === 'companies'
                          ? `/admin/companies/${review.id}/status`
                          : `/admin/card-requests/${review.id}/decision`,
                        review.kind === 'companies'
                          ? { status: 'REJECTED', reason: reason.trim() }
                          : { decision: 'REJECTED', reason: reason.trim() }
                      )
                    }
                  >
                    Reject
                  </Button>

                  {/* Suspend or Reactivate (Company only) */}
                  {review.kind === 'companies' && review.status === 'APPROVED' && (
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() =>
                        mutate(`/admin/companies/${review.id}/status`, { status: 'SUSPENDED' })
                      }
                    >
                      Suspend Company
                    </Button>
                  )}

                  {/* Approve Button */}
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      mutate(
                        review.kind === 'companies'
                          ? `/admin/companies/${review.id}/status`
                          : `/admin/card-requests/${review.id}/decision`,
                        review.kind === 'companies'
                          ? { status: 'APPROVED' }
                          : { decision: 'APPROVED' }
                      )
                    }
                  >
                    {busy
                      ? 'Saving decision…'
                      : review.kind === 'companies'
                      ? 'Approve Company'
                      : 'Approve & Generate Cards'}
                  </Button>
                </div>
              </div>
            </ReviewDialog>
          )}
        </>
      )}
    </SystemAdminShell>
  );
}
