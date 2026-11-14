'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, downloadOrReport } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type {
  AdminPaymentRecord,
  AdminUserRecord,
  AuditLog,
  CardRequest,
  Company,
  Template,
  User,
} from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import CardPreview from '@/components/cards/CardPreview';
import ReviewDialog from '@/components/ui/ReviewDialog';
import Toast from '@/components/ui/Toast';
import AdminTemplateCollection from '@/components/admin/AdminTemplateCollection';
import SystemAdminShell from '@/components/layout/SystemAdminShell';
import { Button, cx, inputClass } from '@/components/ui';
import { PageHeader, SectionCard, StatTile, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable, { NameCell } from '@/components/dashboard/DataTable';
import { ActionBtn } from '@/components/dashboard/RowActions';
import AiDownloadButton, { templateHasAi } from '@/components/dashboard/AiDownloadButton';
import Icon from '@/components/ui/Icon';
import type { Column } from '@/components/dashboard/DataTable';
import { statusColor } from '@/components/dashboard/Charts';
import AdminOverview from '@/components/admin/AdminOverview';
import type { QueueItem } from '@/components/admin/AdminOverview';
import { dateTime, money, payerLabel, plural, roleLabel, sentenceCase, shortDate } from '@/components/admin/format';

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
  payments: AdminPaymentRecord[];
}

export interface AdminDashboardProps {
  children?: ReactNode;
  tab: string;
  setTab: (tab: string) => void;
  user: User;
  onLogout?: () => void;
}

export const systemAdminNavigation: ReadonlyArray<readonly [string, string, string]> = [
  ['overview', 'overview', 'Overview'],
  ['companies', 'companies', 'Companies'],
  ['users', 'users', 'Users'],
  ['requests', 'requests', 'Card orders'],
  ['templates', 'templates', 'Templates'],
  ['payments', 'payments', 'Payments'],
  ['reports', 'reports', 'Activity log'],
  ['settings', 'settings', 'Settings'],
] as const;

type Review = Partial<Company & CardRequest> & { id: number; kind: string };

/* ---------- Small presentational pieces ---------- */


export function ReviewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-navy-900 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function TimelineStep({ done, title, note }: { done: boolean; title: string; note: string }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span
        aria-hidden="true"
        className="relative z-10 mt-1 size-3 shrink-0 rounded-full border-2"
        style={done ? { background: statusColor.good, borderColor: statusColor.good } : { background: '#ffffff', borderColor: '#cbd5e1' }}
      />
      <div>
        <p className="text-sm font-medium text-navy-900">{title}</p>
        <p className="text-xs text-slate-500">{note}</p>
      </div>
    </li>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-slate-500">{children}</span>;
}

export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}

export function LoadingSkeleton() {
  const block = 'animate-pulse rounded-2xl bg-slate-200/70';
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className={cx(block, 'h-24')} />
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className={cx(block, 'h-28')} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className={cx(block, 'h-80')} />
        <div className={cx(block, 'h-80')} />
      </div>
      <div className={cx(block, 'h-72')} />
    </div>
  );
}

export function useAdminController({ tab, setTab, user }: { tab: string; setTab: (tab: string) => void; user: User }) {
  const [data, setData] = useState<AdminData>({
    companies: [],
    requests: [],
    templates: [],
    companyDesigns: [],
    audits: [],
    stats: {},
    users: [],
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
      const [companies, requests, templates, audits, stats, companyDesigns, users, payments] =
        await Promise.all([
          api<Company[]>('/admin/companies'),
          api<CardRequest[]>('/admin/card-requests'),
          api<Template[]>('/admin/templates'),
          api<AuditLog[]>('/admin/audit-logs'),
          api<AdminStats>('/admin/stats'),
          api<Template[]>('/admin/templates/company-designs'),
          api<AdminUserRecord[]>('/admin/users').catch(() => []),
          api<AdminPaymentRecord[]>('/admin/payments').catch(() => []),
        ]);
      setData({ companies, requests, templates, audits, stats, companyDesigns, users, payments });
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
      setMessage('Your decision has been saved.');
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
      setMessage('Design added to the shared templates.');
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

  const attentionQueue = useMemo<QueueItem[]>(() => {
    const items: QueueItem[] = [
      ...pendingCompanies.map(c => ({
        id: c.id,
        kind: 'companies' as const,
        name: c.name,
        sub: c.admins?.[0]?.email || 'No administrator',
        created_at: c.created_at,
        raw: c,
      })),
      ...pendingRequests.map(r => ({
        id: r.id,
        kind: 'requests' as const,
        name: r.company?.name || `Request #${r.id}`,
        sub: `${plural(r.items?.length || 0, 'card')} · ${r.created_by?.username || 'Employee'}`,
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

  const companyName = useCallback(
    (id: number | null | undefined) => (id ? data.companies.find(c => c.id === id)?.name || `Company #${id}` : null),
    [data.companies]
  );


  /* ---------- Table columns ---------- */

  const companyColumns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      sortValue: c => c.name.toLowerCase(),
      className: 'max-w-72',
      render: c => <NameCell name={c.name} sub={c.website || 'No website'} />,
    },
    {
      key: 'admin',
      header: 'Admin',
      hideOnMobile: true,
      render: c => {
        const owner = c.admins?.[0];
        return owner ? (
          <div className="min-w-0">
            <p className="truncate font-medium text-navy-900">{owner.username}</p>
            <p className="truncate text-xs text-slate-500">{owner.email}</p>
          </div>
        ) : (
          <Muted>No admin yet</Muted>
        );
      },
    },
    { key: 'status', header: 'Status', sortValue: c => c.status, render: c => <StatusBadge value={c.status} /> },
    {
      key: 'registered',
      header: 'Registered',
      sortValue: c => c.created_at,
      render: c => <span className="whitespace-nowrap tabular-nums">{shortDate(c.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: c => (
        <div className="inline-flex items-center justify-end gap-1.5">
          <ActionBtn label={`Review ${c.name}`} tone="blue" onClick={() => openReview(c, 'companies')}>
            <Icon name="eye" size={14} />
          </ActionBtn>
          {c.status === 'PENDING' && (
            <ActionBtn label={`Approve ${c.name}`} tone="emerald" disabled={busy} onClick={() => mutate(`/admin/companies/${c.id}/status`, { status: 'APPROVED' })}>
              <Icon name="check" size={14} />
            </ActionBtn>
          )}
          {c.status === 'APPROVED' && (
            <ActionBtn label={`Suspend ${c.name}`} tone="rose" disabled={busy} onClick={() => { if (window.confirm(`Suspend ${c.name}? Its admins and employees lose access until you reactivate it.`)) mutate(`/admin/companies/${c.id}/status`, { status: 'SUSPENDED' }); }}>
              <Icon name="ban" size={14} />
            </ActionBtn>
          )}
          {c.status === 'SUSPENDED' && (
            <ActionBtn label={`Reactivate ${c.name}`} tone="amber" disabled={busy} onClick={() => mutate(`/admin/companies/${c.id}/status`, { status: 'APPROVED' })}>
              <Icon name="undo" size={14} />
            </ActionBtn>
          )}
        </div>
      ),
    },
  ];

  const userColumns: Column<AdminUserRecord>[] = [
    {
      key: 'user',
      header: 'User',
      sortValue: u => u.username.toLowerCase(),
      className: 'max-w-80',
      render: u => <NameCell name={u.username} sub={u.email} />,
    },
    { key: 'role', header: 'Role', sortValue: u => u.role, render: u => roleLabel[u.role] ?? sentenceCase(u.role) },
    {
      key: 'company',
      header: 'Company',
      sortValue: u => u.company_name ?? '',
      render: u => u.company_name || <Muted>No company</Muted>,
    },
  ];


  const requestColumns: Column<CardRequest>[] = [
    {
      key: 'id',
      header: 'Request',
      sortValue: r => r.id,
      render: r => <span className="font-medium text-navy-900 tabular-nums">#{r.id}</span>,
    },
    {
      key: 'company',
      header: 'Company',
      sortValue: r => r.company?.name ?? '',
      render: r => r.company?.name || `Company #${r.company_id}`,
    },
    {
      key: 'template',
      header: 'Template',
      hideOnMobile: true,
      render: r => r.template?.name || r.template?.style_key || 'Standard',
    },
    {
      key: 'cards',
      header: 'Cards',
      align: 'right',
      sortValue: r => r.items?.length || 0,
      render: r => <span className="tabular-nums">{r.items?.length || 0}</span>,
    },
    {
      key: 'by',
      header: 'Submitted by',
      hideOnMobile: true,
      render: r => (
        <div className="min-w-0">
          <p className="truncate font-medium text-navy-900">{r.created_by?.username || 'Admin'}</p>
          {r.created_by?.email && <p className="truncate text-xs text-slate-500">{r.created_by.email}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortValue: r => r.status, render: r => <StatusBadge value={r.status} /> },
    {
      key: 'date',
      header: 'Date',
      sortValue: r => r.created_at,
      render: r => <span className="whitespace-nowrap tabular-nums">{shortDate(r.created_at)}</span>,
    },
    {
      key: 'review',
      header: '', srHeader: 'Actions',
      align: 'right',
      render: r => (
        <ActionBtn label={`Review request #${r.id}`} tone="blue" onClick={() => openReview(r, 'requests')}>
          <Icon name="eye" size={14} />
        </ActionBtn>
      ),
    },
  ];

  const paymentColumns: Column<AdminPaymentRecord>[] = [
    { key: 'id', header: 'Order', sortValue: p => p.id, render: p => <span className="font-medium text-navy-900 tabular-nums">#{p.id}</span> },
    { key: 'company', header: 'Company', sortValue: p => p.company_name.toLowerCase(), render: p => p.company_name },
    { key: 'qty', header: 'Cards', align: 'right', sortValue: p => p.quantity, render: p => <span className="tabular-nums">{p.quantity}</span> },
    { key: 'unit', header: 'Unit price', align: 'right', hideOnMobile: true, render: p => <span className="text-slate-500 tabular-nums">{money(p.unit_price)}</span> },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: p => p.total_amount,
      render: p => <span className="font-medium text-navy-900 tabular-nums">{money(p.total_amount)}</span>,
    },
    { key: 'payer', header: 'Paid by', render: p => payerLabel[p.payer] ?? sentenceCase(p.payer) },
    { key: 'status', header: 'Status', sortValue: p => p.status, render: p => <StatusBadge value={p.status} /> },
    {
      key: 'date',
      header: 'Date',
      sortValue: p => p.created_at ?? '',
      render: p => <span className="whitespace-nowrap tabular-nums">{shortDate(p.created_at)}</span>,
    },
  ];

  const auditColumns: Column<AuditLog>[] = [
    { key: 'event', header: 'Event', sortValue: a => a.action, render: a => <span className="font-medium text-navy-900">{sentenceCase(a.action)}</span> },
    { key: 'entity', header: 'Entity', render: a => <span className="whitespace-nowrap">{sentenceCase(a.entity_type)} #{a.entity_id}</span> },
    { key: 'company', header: 'Company', hideOnMobile: true, render: a => companyName(a.company_id) || <Muted>Platform</Muted> },
    {
      key: 'details',
      header: 'Details',
      className: 'max-w-xs',
      render: a => (a.details ? <p className="truncate text-slate-600" title={a.details}>{a.details}</p> : <Muted>—</Muted>),
    },
    {
      key: 'time',
      header: 'Time',
      sortValue: a => a.created_at,
      render: a => <span className="whitespace-nowrap text-slate-500 tabular-nums">{dateTime(a.created_at)}</span>,
    },
  ];

  /* ---------- Users stat hint (only from loaded data) ---------- */
  const companyAdminCount = data.users.filter(u => u.role === 'COMPANY_ADMIN').length;
  const employeeCount = data.users.filter(u => u.role === 'EMPLOYEE').length;
  const usersHint = data.users.length
    ? `${plural(companyAdminCount, 'company admin')}, ${plural(employeeCount, 'employee')}`
    : undefined;

  return { setTab, user, data, setData, search, setSearch, statusFilter, setStatusFilter, roleFilter, setRoleFilter, payerFilter, setPayerFilter, review, setReview, reason, setReason, error, setError, message, setMessage, busy, setBusy, loading, setLoading, load, mutate, saveDesign, openReview, pendingCompanies, pendingRequests, attentionQueue, filteredCompanies, filteredUsers, filteredRequests, filteredPayments, filteredAudits, totalPaymentsSpend, companySponsoredSpend, individualSpend, companyName, companyColumns, userColumns, requestColumns, paymentColumns, auditColumns, companyAdminCount, employeeCount, usersHint };
}

const AdminContext = createContext<ReturnType<typeof useAdminController> | null>(null);

/** Everything the platform admin pages share: loaded data, filters, table columns and actions. */
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside AdminDashboard');
  return value;
}

export default function AdminDashboard({ tab, setTab, user, onLogout, children }: AdminDashboardProps) {
  const controller = useAdminController({ tab, setTab, user });
  const { data, setData, search, setSearch, statusFilter, setStatusFilter, roleFilter, setRoleFilter, payerFilter, setPayerFilter, review, setReview, reason, setReason, error, setError, message, setMessage, busy, setBusy, loading, setLoading, load, mutate, saveDesign, openReview, pendingCompanies, pendingRequests, attentionQueue, filteredCompanies, filteredUsers, filteredRequests, filteredPayments, filteredAudits, totalPaymentsSpend, companySponsoredSpend, individualSpend, companyName, companyColumns, userColumns, requestColumns, paymentColumns, auditColumns, companyAdminCount, employeeCount, usersHint } = controller;

  return (
    <AdminContext.Provider value={controller}>
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
        <LoadingSkeleton />
      ) : (
        <>
          {children}

          {review && (
            <ReviewDialog
              title={review.kind === 'companies' ? review.name : `Card request #${review.id}`}
              onClose={() => setReview(null)}
              busy={busy}
              eyebrow={review.kind === 'companies' ? 'Company' : 'Card request'}
            >
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <StatusBadge value={review.status ?? ''} />
                <span className="text-sm text-slate-500">Submitted {dateTime(review.created_at)}</span>
              </div>

              {review.kind === 'companies' && (
                <div className="space-y-4">
                  <dl className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
                    <ReviewField label="Company name">{review.name}</ReviewField>
                    <ReviewField label="Registered">{shortDate(review.created_at)}</ReviewField>
                    <ReviewField label="Admin">
                      {review.admins?.[0]?.username || 'Not assigned'}
                      {review.admins?.[0]?.email && (
                        <span className="block text-xs font-normal text-slate-500">{review.admins[0].email}</span>
                      )}
                    </ReviewField>
                    <ReviewField label="Phone">{review.phone || 'Not provided'}</ReviewField>
                    <ReviewField label="Website">{review.website || 'Not provided'}</ReviewField>
                    <ReviewField label="Address">{review.address || 'Not provided'}</ReviewField>
                    <ReviewField label="Logo">{review.has_logo ? 'Uploaded' : 'Not uploaded'}</ReviewField>
                  </dl>

                  {review.description && <Note title="About the company">{review.description}</Note>}
                  {review.rejection_reason && <Note title="Reason given for the last rejection">{review.rejection_reason}</Note>}
                </div>
              )}

              {review.kind === 'requests' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.4fr_1fr]">
                    <div>
                      <p className="mb-2 text-sm font-medium text-navy-900">
                        Template: {review.template?.name || review.template?.style_key}
                      </p>
                      <CardPreview
                        design={review.template?.design}
                        style={review.template?.style_key}
                        company={review.company?.name}
                        name={review.items?.[0]?.employee?.name || 'Sample Employee'}
                        designation={review.items?.[0]?.employee?.designation || 'Staff'}
                      />
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-navy-900">Progress</p>
                      <ol className="relative before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-slate-200">
                        <TimelineStep done title="Submitted" note={dateTime(review.created_at)} />
                        <TimelineStep
                          done={!!review.decided_at}
                          title="Decision"
                          note={review.decided_at ? dateTime(review.decided_at) : 'Waiting for review'}
                        />
                        <TimelineStep
                          done={review.status === 'COMPLETED'}
                          title="Cards generated"
                          note={review.status === 'COMPLETED' ? 'PDFs ready' : 'Not yet'}
                        />
                      </ol>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-navy-900">
                        Employees in this request ({review.items?.length || 0})
                      </p>
                      {templateHasAi(review.template) && (review.items?.length || 0) > 1 && (
                        <AiDownloadButton label="Download all (.ai ZIP)" path={`/admin/card-requests/${review.id}/ai`} fileName={`card-request-${review.id}-ai.zip`} onDownload={(path, name) => downloadOrReport(path, name, setError)} />
                      )}
                    </div>
                    <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                      {review.items?.map(item => (
                        <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <NameCell
                            name={item.employee.name}
                            sub={[item.employee.employee_id, item.employee.designation, item.employee.department].filter(Boolean).join(' · ')}
                          />
                          {templateHasAi(review.template) && (
                            <AiDownloadButton label="Download .ai" path={`/admin/card-requests/${review.id}/items/${item.id}/ai`} fileName={`${item.employee.employee_id}_card.ai`} onDownload={(path, name) => downloadOrReport(path, name, setError)} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {review.rejection_reason && <Note title="Reason given for rejection">{review.rejection_reason}</Note>}
                </div>
              )}

              <div className="mt-6 border-t border-slate-200 pt-5">
                {(() => {
                  const isCompany = review.kind === 'companies';
                  const pending = review.status === 'PENDING';
                  const canReject = pending;
                  const companyPath = `/admin/companies/${review.id}/status`;
                  const requestPath = `/admin/card-requests/${review.id}/decision`;
                  return (
                    <>
                      {canReject && (
                        <label className="mb-4 block">
                          <span className="mb-1.5 block text-sm font-medium text-slate-700">Note to the company <span className="font-normal text-slate-400">(required to reject)</span></span>
                          <textarea
                            className={cx(inputClass, 'min-h-20')}
                            maxLength={500}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Say what needs to change before they send it again."
                          />
                        </label>
                      )}
                      {!pending && !isCompany && (
                        <p className="mb-4 text-sm text-slate-500">This request has already been decided. No further action is needed.</p>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        <Button variant="quiet" disabled={busy} onClick={() => setReview(null)}>
                          {pending || isCompany ? 'Cancel' : 'Close'}
                        </Button>
                        {canReject && (
                          <Button
                            variant="danger"
                            disabled={busy || !reason.trim()}
                            onClick={() => {
                              if (!window.confirm(isCompany ? 'Reject this company? They will see your note.' : 'Reject this card request? The company will see your note.')) return;
                              mutate(isCompany ? companyPath : requestPath, isCompany ? { status: 'REJECTED', reason: reason.trim() } : { decision: 'REJECTED', reason: reason.trim() });
                            }}
                          >
                            Reject
                          </Button>
                        )}
                        {isCompany && review.status === 'APPROVED' && (
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm('Suspend this company? Its admins and employees lose access until you reactivate it.')) return;
                              mutate(companyPath, { status: 'SUSPENDED' });
                            }}
                          >
                            Suspend company
                          </Button>
                        )}
                        {isCompany && review.status !== 'APPROVED' && (
                          <Button variant="primary" disabled={busy} onClick={() => mutate(companyPath, { status: 'APPROVED' })}>
                            {busy ? 'Saving…' : review.status === 'SUSPENDED' ? 'Reactivate company' : 'Approve company'}
                          </Button>
                        )}
                        {!isCompany && pending && (
                          <Button variant="primary" disabled={busy} onClick={() => mutate(requestPath, { decision: 'APPROVED' })}>
                            {busy ? 'Saving…' : 'Approve and generate cards'}
                          </Button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </ReviewDialog>
          )}
        </>
      )}
    </SystemAdminShell>
    </AdminContext.Provider>
  );
}
