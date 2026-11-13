'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, downloadOrReport } from '../lib/api';
import type { CardRequest, Company, Employee, GeneratedCard, Template, User } from '../lib/types';
import type { EmployeeValues } from '../lib/validation';
import StatusBadge from './StatusBadge';
import EmployeeDialog from './EmployeeDialog';
import CompanyProfilePanel from './CompanyProfilePanel';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import CardStudio from './CardStudio';
import DesignUploader from './company/DesignUploader';
import CsvImportDialog from './CsvImportDialog';
import RequestWizard from './RequestWizard';
import CompanyAdminShell from './CompanyAdminShell';
import { Button, buttonClass, cx } from './ui';
import { CheckDot, errorMessage, formatDate } from './CompanyDashboardParts';
import OverviewTab, { type SetupStep } from './company/OverviewTab';
import PendingOverview from './company/PendingOverview';
import EmployeesTab from './company/EmployeesTab';
import MembershipsTab from './company/MembershipsTab';
import OrdersTab from './company/OrdersTab';
import BillingTab from './company/BillingTab';
import SettingsTab from './company/SettingsTab';
import { PageHeader } from './dashboard/Surface';

export const companyNav = [
  ['overview', 'overview', 'Overview'],
  ['employees', 'employees', 'Employees'],
  ['memberships', 'memberships', 'Membership requests'],
  ['requests', 'requests', 'Card orders'],
  ['templates', 'templates', 'Templates'],
  ['profile', 'profile', 'Company profile'],
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
      setMessage(editing ? 'Employee details updated.' : 'Employee added.');
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
      setMessage('Template selected for new card requests.');
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
      setMessage(decision === 'APPROVED' ? 'Request approved.' : decision === 'REJECTED' ? 'Request rejected.' : 'Access revoked.');
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

  const shellUser = user || { username: 'Admin', role: 'COMPANY_ADMIN' as const };
  const logoutHandler = onLogout || (() => {});

  if (loading) {
    return (
      <CompanyAdminShell user={shellUser} navigation={companyNav} activeTab={tab} onNavigate={setTab} onLogout={logoutHandler}>
        <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading company workspace">
          <div className="h-24 rounded-2xl bg-slate-200/70" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200/70" />)}
          </div>
          <div className="h-80 rounded-2xl bg-slate-200/70" />
        </div>
      </CompanyAdminShell>
    );
  }

  if (!company) {
    return (
      <CompanyAdminShell user={shellUser} navigation={companyNav} activeTab={tab} onNavigate={setTab} onLogout={logoutHandler}>
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-xs">
          {error ? (
            <>
              <p role="alert" className="mb-4 text-red-700">{error}</p>
              <Button variant="secondary" onClick={load}>Try again</Button>
            </>
          ) : (
            'Loading company workspace…'
          )}
        </div>
      </CompanyAdminShell>
    );
  }

  // Company is not approved yet: only the overview and the profile are useful.
  if (company.status !== 'APPROVED') {
    return (
      <CompanyAdminShell
        user={shellUser}
        companyName={company.name}
        companyStatus={company.status}
        navigation={companyNav}
        activeTab={tab}
        onNavigate={setTab}
        onLogout={logoutHandler}
      >
        <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
        {tab === 'profile' ? (
          <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
        ) : (
          <PendingOverview company={company} setTab={setTab} onRefresh={load} />
        )}
      </CompanyAdminShell>
    );
  }

  // Setup completion steps
  const profileComplete = Boolean(
    company.phone && company.address && company.website && company.description && company.has_logo
  );
  const setupSteps: SetupStep[] = [
    ['Workspace approved', true, 'overview'],
    ['Complete the company profile', profileComplete, 'profile'],
    ['Add or import employees', employees.length > 0, 'employees'],
    ['Choose a card template', Boolean(selectedTemplate), 'templates'],
    ['Review membership requests', pendingMemberships.length === 0 && memberships.length > 0, 'memberships'],
  ];

  return (
    <CompanyAdminShell
      user={shellUser}
      companyName={company.name}
      companyStatus={company.status}
      pendingMembershipsCount={pendingMemberships.length}
      pendingRequestsCount={pendingRequests.length}
      navigation={companyNav}
      activeTab={tab}
      onNavigate={setTab}
      onLogout={logoutHandler}
    >
      <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

      {tab === 'overview' && (
        <OverviewTab
          company={company}
          employees={employees}
          activeEmployees={activeEmployees}
          requests={requests}
          completedRequests={completedRequests}
          pendingMemberships={pendingMemberships}
          selectedTemplate={selectedTemplate}
          setupSteps={setupSteps}
          busy={busy}
          setTab={setTab}
          onCreateRequest={createRequest}
          onOpenRequest={openRequest}
          onDecideMembership={decideMembership}
        />
      )}

      {tab === 'employees' && (
        <EmployeesTab
          employees={employees}
          visibleEmployees={visibleEmployees}
          departments={departments}
          search={search}
          setSearch={setSearch}
          department={department}
          setDepartment={setDepartment}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          selectedEmployees={selectedEmployees}
          setSelectedEmployees={setSelectedEmployees}
          toggleEmployee={toggleEmployee}
          busy={busy}
          onExport={() => downloadOrReport('/employees/export', 'employees.csv', setError)}
          onImport={() => setCsvOpen(true)}
          onAdd={() => { setEmployeeError(''); setEmployeeEditor(null); }}
          onEdit={employee => { setEmployeeError(''); setEmployeeEditor(employee); }}
          onUploadPhoto={uploadPhoto}
          onChangeStatus={changeEmployeeStatus}
          onCreateRequest={createRequest}
        />
      )}

      {tab === 'memberships' && (
        <MembershipsTab
          memberships={memberships}
          membershipFilter={membershipFilter}
          setMembershipFilter={setMembershipFilter}
          busy={busy}
          onDecide={decideMembership}
        />
      )}

      {tab === 'requests' && (
        <OrdersTab
          requests={requests}
          orders={orders}
          view={ordersSubView}
          setView={setOrdersSubView}
          onCreateRequest={createRequest}
          onOpenRequest={openRequest}
          onDownload={(path: string, name: string) => downloadOrReport(path, name, setError)}
        />
      )}

      {tab === 'templates' && (
        <div className="space-y-6">
          <PageHeader
            title="Templates"
            description="Upload your own card design, check it, then choose the one your company uses for new card requests."
          />
          <CardStudio
            company={company}
            employees={employees}
            templates={templates}
            templateId={company.selected_template_id}
            onChoose={selectTemplate}
            busy={busy}
          />
          <DesignUploader
            company={company}
            employees={employees}
            onSaved={async () => {
              await load();
            }}
          />
        </div>
      )}

      {tab === 'profile' && <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />}

      {tab === 'billing' && (
        <BillingTab
          company={company}
          orders={orders}
          totalSpend={totalSpend}
          companySponsoredTotal={companySponsoredTotal}
          companySponsoredCount={companySponsoredOrders.length}
          selfPaidTotal={selfPaidTotal}
          selfPaidCount={selfPaidOrders.length}
        />
      )}

      {tab === 'settings' && (
        <SettingsTab
          company={company}
          username={user?.username}
          sponsorship={defaultSponsorship}
          onSponsorshipChange={value => {
            setDefaultSponsorship(value);
            setMessage(value === 'COMPANY' ? 'Default set to: company pays.' : 'Default set to: employees pay.');
          }}
          setTab={setTab}
        />
      )}

      {csvOpen && (
        <CsvImportDialog
          employees={employees}
          onClose={() => setCsvOpen(false)}
          onComplete={async count => {
            setCsvOpen(false);
            setMessage(`${count} employees imported.`);
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
          onClose={() => { setWizardOpen(false); load(); }}
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
        <RequestDetails viewer={requestViewer} onClose={() => setRequestViewer(null)} onDownload={(path: string, name: string) => downloadOrReport(path, name, setError)} />
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
    ['Platform decision', request.decided_at, Boolean(request.decided_at)],
    [
      request.status === 'REJECTED' ? 'Request rejected' : 'Cards generated',
      request.status === 'COMPLETED' ? request.decided_at : null,
      ['COMPLETED', 'REJECTED'].includes(request.status),
    ],
  ];
  return (
    <ReviewDialog title={`Card request #${request.id}`} eyebrow="Card request" onClose={onClose}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <StatusBadge value={request.status} />
          <p className="mt-2 text-sm text-slate-500">
            {request.items.length} employee{request.items.length === 1 ? '' : 's'}
            {request.template?.name ? ` · ${request.template.name}` : ''}
          </p>
        </div>
        {request.status === 'COMPLETED' && (
          <Button onClick={() => onDownload(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)}>
            Download all (ZIP)
          </Button>
        )}
      </div>

      <ol className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
        {steps.map(([label, time, done], index) => (
          <li key={label} className="flex items-start gap-3">
            <CheckDot done={done}>{index + 1}</CheckDot>
            <div>
              <p className={cx('text-sm font-medium', done ? 'text-navy-900' : 'text-slate-500')}>{label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{time ? formatDate(time) : 'Waiting'}</p>
            </div>
          </li>
        ))}
      </ol>

      {request.rejection_reason && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">Reason given</p>
          <p className="mt-1 text-sm leading-relaxed text-red-800">{request.rejection_reason}</p>
        </div>
      )}

      <h3 className="mt-6 mb-3 text-sm font-semibold text-navy-900">Employees included</h3>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {request.items.map(item => (
          <li className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5" key={item.id}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
              {item.employee.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy-900">{item.employee.name}</p>
              <p className="truncate text-xs text-slate-500">
                {item.employee.designation} · {item.employee.department}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {cards.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-sm font-semibold text-navy-900">Generated cards</h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {cards.map(card => (
              <li className="flex items-center justify-between gap-4 px-4 py-3 max-sm:flex-col max-sm:items-start" key={card.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">{card.file_name}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    {Math.ceil(card.file_size / 1024)} KB <StatusBadge value={card.status} />
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a className={buttonClass('secondary', 'px-3 py-1.5 text-xs')} href={`/verify/${card.verification_token}`} target="_blank">
                    Verify
                  </a>
                  <Button className="px-3 py-1.5 text-xs" onClick={() => onDownload(`/cards/${card.id}/download`, card.file_name)}>
                    Download PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </ReviewDialog>
  );
}
