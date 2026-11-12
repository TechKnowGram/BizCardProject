'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, download } from '../lib/api';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import EmployeeDialog from './EmployeeDialog';
import CompanyProfilePanel from './CompanyProfilePanel';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import CardStudio from './CardStudio';
import CsvImportDialog from './CsvImportDialog';
import RequestWizard from './RequestWizard';
import CompanyMemberships from './CompanyMemberships';

const PAGE_SIZE = 10;
const formatDate = value => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

function StatCard({ label, value, note, tone = 'default' }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export default function CompanyDashboard({ tab, setTab }) {
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeEditor, setEmployeeEditor] = useState(undefined);
  const [employeeError, setEmployeeError] = useState('');
  const [requestViewer, setRequestViewer] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const companyData = await api('/company/profile');
      setCompany(companyData);
      if (companyData.status === 'APPROVED') {
        const [employeeData, templateData, requestData] = await Promise.all([
          api('/employees'),
          api('/templates'),
          api('/card-requests'),
        ]);
        setEmployees(employeeData);
        setTemplates(templateData);
        setRequests(requestData);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, department, statusFilter]);

  async function saveEmployee(values) {
    setBusy(true);
    setEmployeeError('');
    const editing = Boolean(employeeEditor?.id);
    try {
      await api(editing ? `/employees/${employeeEditor.id}` : '/employees', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      });
      setEmployeeEditor(undefined);
      setMessage(editing ? 'Employee details updated.' : 'Employee added successfully.');
      await load();
    } catch (requestError) {
      setEmployeeError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(employee, file) {
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
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeEmployeeStatus(employee) {
    if (employee.is_active && !window.confirm(`Deactivate ${employee.name}? Existing cards will also become inactive.`)) return;
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
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function selectTemplate(id) {
    setBusy(true);
    setError('');
    try {
      await api(`/templates/${id}/select`, { method: 'POST' });
      setMessage('Your card template has been updated.');
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleEmployee(id) {
    setSelectedEmployees(current =>
      current.includes(id) ? current.filter(value => value !== id) : [...current, id]
    );
  }

  function createRequest() {
    setWizardOpen(true);
  }

  async function openRequest(request) {
    let cards = [];
    if (request.status === 'COMPLETED') {
      try {
        cards = await api(`/card-requests/${request.id}/cards`);
      } catch (requestError) {
        setError(requestError.message);
        return;
      }
    }
    setRequestViewer({ request, cards });
  }

  const departments = useMemo(() => [...new Set(employees.map(item => item.department))].filter(Boolean).sort(), [employees]);

  const visibleEmployees = useMemo(() => employees.filter(employee => {
    const term = search.toLowerCase();
    const matchesSearch = [employee.name, employee.employee_id, employee.email, employee.designation, employee.department || '']
      .some(value => (value || '').toLowerCase().includes(term));
    const matchesDept = department === 'ALL' || employee.department === department;
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? employee.is_active : !employee.is_active);
    return matchesSearch && matchesDept && matchesStatus;
  }), [employees, search, department, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(visibleEmployees.length / PAGE_SIZE));
  const pageEmployees = visibleEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeOnPage = pageEmployees.filter(item => item.is_active);
  const pageSelected = activeOnPage.length > 0 && activeOnPage.every(item => selectedEmployees.includes(item.id));

  const totalHeadcount = employees.length;
  const activeCount = employees.filter(item => item.is_active).length;
  const inactiveCount = totalHeadcount - activeCount;
  const photoCount = employees.filter(item => item.has_photo).length;

  if (loading) return <div className="dashboard-skeleton"><i /><i /><i /><div /></div>;
  if (!company) return (
    <div className="panel empty-state">
      {error ? (
        <>
          <p role="alert" className="text-red-600 font-medium">{error}</p>
          <button className="btn-secondary mt-4" onClick={load}>Try again</button>
        </>
      ) : 'Loading company workspace…'}
    </div>
  );

  if (tab === 'memberships') return <CompanyMemberships />;

  if (company.status !== 'APPROVED') return (
    <>
      <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
      <section className="review-waiting panel p-8 text-center max-w-xl mx-auto">
        <div className="waiting-icon mb-4 text-3xl">{company.status === 'PENDING' ? '⏳' : '⚠️'}</div>
        <StatusBadge value={company.status} />
        <h2 className="text-xl font-bold text-slate-900 mt-4">
          {company.status === 'PENDING' ? 'Workspace Verification in Progress' : 'Workspace Attention Required'}
        </h2>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          {company.status === 'PENDING'
            ? 'Complete your profile details while the System Admin verifies your company workspace. Directory and card generation tools unlock immediately upon approval.'
            : `Your company status is currently ${company.status}.${company.rejection_reason ? ` Reason: ${company.rejection_reason}` : ''}`}
        </p>
        <div className="flex justify-center gap-3">
          <button className="btn-primary" onClick={() => setTab('profile')}>Complete Company Profile</button>
          <button className="btn-secondary" onClick={load}>Refresh Status</button>
        </div>
      </section>
      <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
    </>
  );

  const selectedTemplate = templates.find(template => template.id === company.selected_template_id);
  const profileComplete = Boolean(company.phone && company.address && company.website && company.description && company.has_logo);
  const setupSteps = [
    ['Company approved', true, 'profile'],
    ['Complete company profile', profileComplete, 'profile'],
    ['Add your employees', employees.length > 0, 'employees'],
    ['Choose a card template', Boolean(selectedTemplate), 'templates'],
    ['Create your first request', requests.length > 0, 'employees'],
  ];
  const completeCount = setupSteps.filter(item => item[1]).length;

  return (
    <>
      <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="dashboard-overview space-y-6">
          <section className="company-banner">
            <div>
              <div className="flex items-center gap-3">
                <span className="company-mark">{company.name.charAt(0).toUpperCase()}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Verified Organization</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mt-0.5">{company.name}</h2>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-300 max-w-xl leading-relaxed">
                Enterprise visiting card hub. Maintain verified employee rosters, enforce corporate brand standards, and manage card approvals.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <button className="btn-primary bg-white !text-slate-900 border-white hover:!bg-slate-100" onClick={() => setTab('employees')}>
                  Manage Team Roster →
                </button>
                <button className="btn-secondary bg-transparent !text-white border-slate-700 hover:!bg-slate-800" onClick={() => setTab('requests')}>
                  View Card Requests
                </button>
              </div>
            </div>
            <div className="workflow hidden lg:flex items-center gap-3">
              <span className={employees.length ? 'done' : 'current'}>1 <small>Roster</small></span>
              <i />
              <span className={selectedTemplate ? 'done' : employees.length ? 'current' : ''}>2 <small>Template</small></span>
              <i />
              <span className={requests.length ? 'done' : selectedTemplate ? 'current' : ''}>3 <small>Request</small></span>
            </div>
          </section>

          <div className="stats-grid">
            <StatCard label="Active Roster" value={activeCount} note={`${totalHeadcount} total employee records`} />
            <StatCard label="Brand Template" value={selectedTemplate?.name || 'Not Selected'} note={selectedTemplate ? 'Active brand standard' : 'Action required'} />
            <StatCard label="Pending Approvals" value={requests.filter(r => r.status === 'PENDING').length} note="With System Admin" />
            <StatCard label="Ready for Download" value={requests.filter(r => r.status === 'COMPLETED').length} note="Completed card batches" />
          </div>

          <div className="overview-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="panel">
              <div className="panel-header flex items-center justify-between">
                <div>
                  <span className="panel-kicker">ONBOARDING READINESS</span>
                  <h2>Workspace Setup</h2>
                  <p>{completeCount} of {setupSteps.length} milestones complete</p>
                </div>
                <span className="text-lg font-bold text-slate-900 tabular-nums">
                  {Math.round((completeCount / setupSteps.length) * 100)}%
                </span>
              </div>
              <div className="px-6 py-4">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(completeCount / setupSteps.length) * 100}%` }}
                  />
                </div>
                <div className="checklist mt-4 space-y-2">
                  {setupSteps.map(([label, done, target]) => (
                    <button
                      key={label}
                      className={`w-full flex items-center justify-between p-3 rounded-md border text-xs transition-colors ${
                        done ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-900 font-medium'
                      }`}
                      onClick={() => setTab(target)}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${done ? 'bg-emerald-100 text-emerald-700 font-bold' : 'border border-slate-300'}`}>
                          {done ? '✓' : ''}
                        </span>
                        <span>{label}</span>
                      </div>
                      <span className="text-slate-400">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header flex items-center justify-between">
                <div>
                  <span className="panel-kicker">ACTIVITY LOG</span>
                  <h2>Recent Card Requests</h2>
                </div>
                <button className="btn-quiet text-xs" onClick={() => setTab('requests')}>View all</button>
              </div>
              <div className="p-4 space-y-2">
                {requests.slice(0, 4).map(request => (
                  <button
                    key={request.id}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-left transition-colors"
                    onClick={() => openRequest(request)}
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">Request #{request.id}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {request.items.length} card{request.items.length === 1 ? '' : 's'} · {formatDate(request.created_at)}
                      </p>
                    </div>
                    <StatusBadge value={request.status} />
                  </button>
                ))}
                {!requests.length && (
                  <div className="py-12 text-center text-xs text-slate-500">
                    <p>No card requests submitted yet.</p>
                    <button className="btn-secondary mt-3 text-xs" onClick={() => setTab('employees')}>
                      Select employees to begin
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />}

      {/* EMPLOYEES TAB (REPRESENTATIVE PAGE - POLARIS / PRIMER / RIPPLING REDESIGN) */}
      {tab === 'employees' && (
        <div className="space-y-6">
          {/* Headcount Health Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total Headcount</span>
              <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalHeadcount}</p>
              <span className="text-[11px] text-slate-400">Imported & manual records</span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Active Members</span>
              <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">{activeCount}</p>
              <span className="text-[11px] text-slate-400">Eligible for visiting cards</span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Inactive Records</span>
              <p className="text-xl font-bold text-slate-600 mt-1 tabular-nums">{inactiveCount}</p>
              <span className="text-[11px] text-slate-400">Deactivated or unverified</span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">With Profile Photo</span>
              <p className="text-xl font-bold text-blue-700 mt-1 tabular-nums">{photoCount}</p>
              <span className="text-[11px] text-slate-400">Photo cards ready</span>
            </div>
          </div>

          {/* Main IndexTable Panel */}
          <section className="panel">
            {/* Panel Header */}
            <div className="panel-header flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="panel-kicker">EMPLOYEE DIRECTORY</span>
                <h2>Company Roster</h2>
                <p>Manage verified employee records, upload photos, and initiate bulk card orders.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-secondary" onClick={() => download('/employees/export', 'employees.csv')}>
                  <span>↓ Export CSV</span>
                </button>
                <button className="btn-secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(null); }}>
                  <span>+ Add Employee</span>
                </button>
                <button className="btn-primary" onClick={() => setCsvOpen(true)}>
                  <span>↑ Import CSV Roster</span>
                </button>
              </div>
            </div>

            {employees.length > 0 ? (
              <>
                {/* Search & Filter Controls Toolbar */}
                <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex flex-1 flex-wrap items-center gap-2.5">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-xs">⌕</span>
                      <input
                        aria-label="Search employees"
                        placeholder="Search name, ID, email, role…"
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
                      />
                    </div>

                    {/* Department Dropdown */}
                    <select
                      aria-label="Filter by department"
                      className="px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                      value={department}
                      onChange={event => setDepartment(event.target.value)}
                    >
                      <option value="ALL">All Departments ({departments.length})</option>
                      {departments.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>

                    {/* Status Filter Chips */}
                    <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-white">
                      <button
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                          statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setStatusFilter('ACTIVE')}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                          statusFilter === 'ACTIVE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Active ({activeCount})
                      </button>
                      <button
                        onClick={() => setStatusFilter('INACTIVE')}
                        className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                          statusFilter === 'INACTIVE' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Inactive ({inactiveCount})
                      </button>
                    </div>

                    {(search || department !== 'ALL' || statusFilter !== 'ALL') && (
                      <button
                        className="text-xs text-blue-600 hover:underline font-medium ml-1"
                        onClick={() => { setSearch(''); setDepartment('ALL'); setStatusFilter('ALL'); }}
                      >
                        Reset filters
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 tabular-nums self-end md:self-auto">
                    Showing {visibleEmployees.length} of {employees.length} records
                  </span>
                </div>

                {/* Batch Action Toolbar (Polaris IndexTable Standard) */}
                {selectedEmployees.length > 0 && (
                  <div className="selection-bar animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{selectedEmployees.length}</span>
                      <span>employee{selectedEmployees.length === 1 ? '' : 's'} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={busy}
                        onClick={createRequest}
                        className="btn-primary !py-1.5 !px-3 !text-xs !bg-blue-600 !border-blue-600 hover:!bg-blue-700"
                      >
                        {busy ? 'Processing…' : 'Create Card Request for Selected →'}
                      </button>
                      <button
                        onClick={() => setSelectedEmployees([])}
                        className="btn-secondary !py-1.5 !px-3 !text-xs"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                )}

                {/* Data Table */}
                {visibleEmployees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="w-10">
                            <input
                              aria-label="Select all employees on this page"
                              type="checkbox"
                              checked={pageSelected}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              onChange={() =>
                                setSelectedEmployees(current =>
                                  pageSelected
                                    ? current.filter(id => !activeOnPage.some(item => item.id === id))
                                    : [...new Set([...current, ...activeOnPage.map(item => item.id)])]
                                )
                              }
                            />
                          </th>
                          <th className="w-24"># ID</th>
                          <th>Employee</th>
                          <th>Role & Department</th>
                          <th>Contact</th>
                          <th>Status</th>
                          <th className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageEmployees.map(employee => {
                          const isSelected = selectedEmployees.includes(employee.id);
                          const initials = employee.name
                            .split(' ')
                            .map(part => part[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();
                          return (
                            <tr key={employee.id} className={isSelected ? 'selected-row' : ''}>
                              <td>
                                <input
                                  disabled={!employee.is_active}
                                  aria-label={`Select ${employee.name}`}
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleEmployee(employee.id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                                />
                              </td>
                              <td>
                                <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {employee.employee_id}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs flex-none">
                                    {initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">{employee.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{employee.email}</p>
                                    {employee.has_photo && (
                                      <span className="inline-block mt-0.5 text-[10px] text-blue-600 font-medium">
                                        📷 Photo attached
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <p className="font-medium text-slate-900">{employee.designation || 'Staff'}</p>
                                {employee.department && (
                                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {employee.department}
                                  </span>
                                )}
                              </td>
                              <td>
                                <p className="text-xs text-slate-700">{employee.phone || '—'}</p>
                              </td>
                              <td>
                                <StatusBadge value={employee.is_active ? 'ACTIVE' : 'INACTIVE'} />
                              </td>
                              <td className="text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                    onClick={() => { setEmployeeError(''); setEmployeeEditor(employee); }}
                                  >
                                    Edit
                                  </button>
                                  <label className="cursor-pointer px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 hover:border-slate-300 transition-colors">
                                    Photo
                                    <input
                                      className="hidden"
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      onChange={event => uploadPhoto(employee, event.target.files?.[0])}
                                    />
                                  </label>
                                  <button
                                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                      employee.is_active
                                        ? 'text-red-600 bg-red-50/50 hover:bg-red-100/60'
                                        : 'text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/60'
                                    }`}
                                    onClick={() => changeEmployeeStatus(employee)}
                                  >
                                    {employee.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-800">No employees match your filter</p>
                    <p className="text-slate-500 mt-1">Try clearing your search query or department selection.</p>
                    <button
                      className="btn-secondary mt-3 text-xs"
                      onClick={() => { setSearch(''); setDepartment('ALL'); setStatusFilter('ALL'); }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}

                {/* Table Footer with Pagination */}
                <div className="table-footer">
                  <span>
                    Showing {visibleEmployees.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{' '}
                    {Math.min(page * PAGE_SIZE, visibleEmployees.length)} of {visibleEmployees.length} employees
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>
                      ← Previous
                    </button>
                    <span className="text-xs px-2 text-slate-700 font-medium">
                      Page {page} of {pageCount}
                    </span>
                    <button disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>
                      Next →
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon="👥"
                title="Your company roster is empty"
                copy="Import your employee roster via CSV (supports thousands of records) or add individual staff members manually."
                action="Import CSV Roster"
                onAction={() => setCsvOpen(true)}
              />
            )}
          </section>
        </div>
      )}

      {/* TEMPLATES TAB */}
      {tab === 'templates' && (
        <CardStudio
          onSaved={async () => { await load(); }}
          company={company}
          employees={employees}
          templates={templates}
          templateId={company.selected_template_id}
          onChoose={selectTemplate}
          busy={busy}
        />
      )}

      {/* REQUESTS TAB */}
      {tab === 'requests' && (
        <section className="panel">
          <div className="panel-header flex items-center justify-between">
            <div>
              <span className="panel-kicker">CARD ISSUANCE</span>
              <h2>Card Request History</h2>
              <p>Track administrative approvals, print processing, and download finalized PDF card bundles.</p>
            </div>
            <button className="btn-secondary" onClick={createRequest}>
              + Create New Request
            </button>
          </div>
          {requests.length ? (
            <div className="p-4 space-y-3">
              {requests.map(request => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-mono text-slate-700 flex-none">
                      #{request.id}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-slate-900">Request #{request.id}</strong>
                        <StatusBadge value={request.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(request.created_at)} · {request.items.length} employee{request.items.length === 1 ? '' : 's'} · Style: {request.template?.name || `Template #${request.template_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      className="btn-secondary !text-xs !py-1.5 !px-3"
                      onClick={() => openRequest(request)}
                    >
                      View Details
                    </button>
                    {request.status === 'COMPLETED' && (
                      <button
                        className="btn-primary !text-xs !py-1.5 !px-3"
                        onClick={() => download(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)}
                      >
                        Download ZIP
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="💳"
              title="No card requests submitted yet"
              copy="Select active team members from your roster to create a branded visiting card order."
              action="Select Employees"
              onAction={() => setTab('employees')}
            />
          )}
        </section>
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
        <RequestDetails
          viewer={requestViewer}
          onClose={() => setRequestViewer(null)}
          onDownload={download}
        />
      )}
    </>
  );
}

function EmptyState({ icon, title, copy, action, onAction }) {
  return (
    <div className="py-16 px-6 text-center max-w-md mx-auto">
      <span className="text-4xl block mb-3">{icon}</span>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">{copy}</p>
      {action && (
        <button className="btn-primary text-xs" onClick={onAction}>
          {action} →
        </button>
      )}
    </div>
  );
}

function RequestDetails({ viewer, onClose, onDownload }) {
  const { request, cards } = viewer;
  const steps = [
    ['Request submitted', request.created_at, true],
    ['Administrator decision', request.decided_at, Boolean(request.decided_at)],
    [
      request.status === 'REJECTED' ? 'Request rejected' : 'Cards generated',
      request.status === 'COMPLETED' ? request.decided_at : null,
      ['COMPLETED', 'REJECTED'].includes(request.status),
    ],
  ];

  return (
    <ReviewDialog title={`Card Request #${request.id}`} onClose={onClose}>
      <div className="request-detail-head flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <StatusBadge value={request.status} />
          <p className="text-xs text-slate-500 mt-1.5">
            {request.items.length} employee{request.items.length === 1 ? '' : 's'} · {request.template?.name}
          </p>
        </div>
        {request.status === 'COMPLETED' && (
          <button
            className="btn-primary !text-xs !py-1.5 !px-3"
            onClick={() => onDownload(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)}
          >
            Download all ZIP
          </button>
        )}
      </div>

      <div className="request-timeline my-5 flex items-center justify-between gap-2">
        {steps.map(([label, time, done], index) => (
          <div className={`flex-1 text-center p-2 rounded border ${done ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 opacity-60'}`} key={label}>
            <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[11px] font-bold ${done ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-500'}`}>
              {done ? '✓' : index + 1}
            </span>
            <p className="text-xs font-semibold text-slate-900 mt-1">{label}</p>
            <small className="text-[10px] text-slate-500">{time ? formatDate(time) : 'Waiting'}</small>
          </div>
        ))}
      </div>

      {request.rejection_reason && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 mb-4">
          <strong className="block font-semibold">Decision note</strong>
          <p className="mt-0.5">{request.rejection_reason}</p>
        </div>
      )}

      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Employees included</h3>
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md mb-5">
        {request.items.map(item => (
          <div key={item.id} className="p-2.5 flex items-center justify-between text-xs bg-white">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
                {item.employee.name.charAt(0)}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{item.employee.name}</p>
                <p className="text-[11px] text-slate-500">{item.employee.designation} · {item.employee.department}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {cards.length > 0 && (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Generated Cards</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cards.map(card => (
              <article className="p-2.5 rounded-md border border-slate-200 bg-white flex items-center justify-between text-xs" key={card.id}>
                <div>
                  <strong className="font-semibold text-slate-900 block">{card.file_name}</strong>
                  <p className="text-[11px] text-slate-500">
                    {Math.ceil(card.file_size / 1024)} KB · <StatusBadge value={card.status} />
                  </p>
                </div>
                <div className="flex gap-2">
                  <a className="btn-secondary !text-xs !py-1 !px-2.5" href={`/verify/${card.verification_token}`} target="_blank">
                    Verify
                  </a>
                  <button className="btn-primary !text-xs !py-1 !px-2.5" onClick={() => onDownload(`/cards/${card.id}/download`, card.file_name)}>
                    Download
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </ReviewDialog>
  );
}
