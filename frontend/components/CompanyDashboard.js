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

const PAGE_SIZE = 8;
const formatDate = value => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

function StatCard({ label, value, note, tone }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-accent" /><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

export default function CompanyDashboard({ tab, setTab }) {
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
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
        const [employeeData, templateData, requestData] = await Promise.all([api('/employees'), api('/templates'), api('/card-requests')]);
        setEmployees(employeeData); setTemplates(templateData); setRequests(requestData);

      }
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, department]);

  async function saveEmployee(values) {
    setBusy(true); setEmployeeError('');
    const editing = Boolean(employeeEditor?.id);
    try {
      await api(editing ? `/employees/${employeeEditor.id}` : '/employees', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(values) });
      setEmployeeEditor(undefined); setMessage(editing ? 'Employee details updated.' : 'Employee added successfully.'); await load();
    } catch (requestError) { setEmployeeError(requestError.message); }
    finally { setBusy(false); }
  }

  async function uploadPhoto(employee, file) {
    if (!file) return;
    const form = new FormData(); form.append('file', file); setBusy(true); setError('');
    try { await api(`/employees/${employee.id}/photo`, { method: 'POST', body: form }); setMessage(`${employee.name}’s photo was updated.`); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function changeEmployeeStatus(employee) {
    if (employee.is_active && !window.confirm(`Deactivate ${employee.name}? Existing cards will also become inactive.`)) return;
    setBusy(true); setError('');
    try {
      await api(`/employees/${employee.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !employee.is_active }) });
      setSelectedEmployees(current => current.filter(id => id !== employee.id));
      setMessage(`${employee.name} is now ${employee.is_active ? 'inactive' : 'active'}.`); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function selectTemplate(id) {
    setBusy(true); setError('');
    try { await api(`/templates/${id}/select`, { method: 'POST' }); setMessage('Your card template has been updated.'); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  function toggleEmployee(id) {
    setSelectedEmployees(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  function createRequest() { setWizardOpen(true); }

  async function openRequest(request) {
    let cards = [];
    if (request.status === 'COMPLETED') {
      try { cards = await api(`/card-requests/${request.id}/cards`); }
      catch (requestError) { setError(requestError.message); return; }
    }
    setRequestViewer({ request, cards });
  }

  const departments = useMemo(() => [...new Set(employees.map(item => item.department))].sort(), [employees]);
  const visibleEmployees = useMemo(() => employees.filter(employee => {
    const term = search.toLowerCase();
    return (department === 'ALL' || employee.department === department) &&
      [employee.name, employee.employee_id, employee.email, employee.designation].some(value => value.toLowerCase().includes(term));
  }), [employees, search, department]);
  const pageCount = Math.max(1, Math.ceil(visibleEmployees.length / PAGE_SIZE));
  const pageEmployees = visibleEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeOnPage = pageEmployees.filter(item => item.is_active);
  const pageSelected = activeOnPage.length > 0 && activeOnPage.every(item => selectedEmployees.includes(item.id));

  if (loading) return <div className="dashboard-skeleton"><i /><i /><i /><div /></div>;
  if (!company) return <div className="panel empty-state">{error ? <><p role="alert">{error}</p><button className="btn-secondary mt-4" onClick={load}>Try again</button></> : 'Loading company workspace…'}</div>;

  if (company.status !== 'APPROVED') return <>
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
    <section className="review-waiting panel"><div className="waiting-icon">{company.status === 'PENDING' ? '⌛' : '!'}</div><StatusBadge value={company.status} /><p className="eyebrow">COMPANY REVIEW</p><h2>{company.status === 'PENDING' ? 'Your workspace is being reviewed.' : 'Your workspace needs attention.'}</h2><p>{company.status === 'PENDING' ? 'Complete the profile while the System Admin reviews your company. Employee and card tools unlock immediately after approval.' : `Your company is not currently approved.${company.rejection_reason ? ` Reason: ${company.rejection_reason}` : ''}`}</p><div className="waiting-actions"><button className="btn-primary" onClick={() => setTab('profile')}>Complete company profile</button><button className="btn-secondary" onClick={load}>Check status</button></div></section>
    <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
  </>;

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
  const stats = [
    ['Active people', employees.filter(item => item.is_active).length, `${employees.length} total records`, 'violet'],
    ['Card style', selectedTemplate?.name || 'Not selected', selectedTemplate ? 'Brand standard ready' : 'Action needed', 'cyan'],
    ['Awaiting approval', requests.filter(request => request.status === 'PENDING').length, 'With System Admin', 'amber'],
    ['Ready to download', requests.filter(request => request.status === 'COMPLETED').length, 'Completed requests', 'green'],
  ];

  return <>
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

    {tab === 'overview' && <div className="dashboard-overview">
      <section className="company-banner"><div><div className="flex items-center gap-3"><span className="company-mark">{company.name.charAt(0)}</span><div><p>APPROVED WORKSPACE</p><h2>{company.name}</h2></div></div><p className="banner-copy">Your team’s brand workspace is ready. Keep the profile current, add people and create your next card request.</p><div className="banner-actions"><button className="btn-sun" onClick={() => setTab('employees')}>Add employees <span>↗</span></button><button className="banner-link" onClick={() => setTab('requests')}>View requests</button></div></div><div className="workflow"><span className={employees.length ? 'done' : 'current'}>1 <small>People</small></span><i /><span className={selectedTemplate ? 'done' : employees.length ? 'current' : ''}>2 <small>Design</small></span><i /><span className={requests.length ? 'done' : selectedTemplate ? 'current' : ''}>3 <small>Request</small></span></div></section>
      <div className="stats-grid">{stats.map(([label, value, note, tone]) => <StatCard key={label} label={label} value={value} note={note} tone={tone} />)}</div>
      <div className="overview-grid">
        <section className="panel onboarding-panel"><div className="panel-header"><div><span className="panel-kicker">GET STARTED</span><h2>Workspace setup</h2><p>{completeCount} of {setupSteps.length} steps complete</p></div><strong>{Math.round((completeCount / setupSteps.length) * 100)}%</strong></div><div className="progress-track"><i style={{ width: `${(completeCount / setupSteps.length) * 100}%` }} /></div><div className="checklist">{setupSteps.map(([label, done, target]) => <button key={label} className={done ? 'done' : ''} onClick={() => setTab(target)}><span>{done ? '✓' : '○'}</span><p>{label}</p><b>→</b></button>)}</div></section>
        <section className="panel recent-panel"><div className="panel-header"><div><span className="panel-kicker">RECENT ACTIVITY</span><h2>Latest requests</h2></div><button className="btn-quiet" onClick={() => setTab('requests')}>View all</button></div>{requests.slice(0, 4).map(request => <button className="recent-row" key={request.id} onClick={() => openRequest(request)}><span className="request-icon">▤</span><div><strong>Request #{request.id}</strong><small>{request.items.length} card{request.items.length === 1 ? '' : 's'} · {formatDate(request.created_at)}</small></div><StatusBadge value={request.status} /></button>)}{!requests.length && <div className="mini-empty"><span>◇</span><p>No requests yet.</p><button onClick={() => setTab('employees')}>Select employees to begin</button></div>}</section>
      </div>
    </div>}

    {tab === 'profile' && <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />}

    {tab === 'employees' && <section className="panel">
      <div className="panel-header"><div><span className="panel-kicker">TEAM DIRECTORY</span><h2>Your people</h2><p>Add people manually or import a complete team CSV.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => download('/employees/export', 'employees.csv')}>Export CSV</button><button className="btn-secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(null); }}>Add manually</button><button className="btn-primary" onClick={() => setCsvOpen(true)}>Import CSV</button></div></div>
      {employees.length ? <><div className="filter-bar"><div className="search-field"><span>⌕</span><input aria-label="Search employees" placeholder="Search name, ID, email…" value={search} onChange={event => setSearch(event.target.value)} /></div><select className="input compact" value={department} onChange={event => setDepartment(event.target.value)}><option value="ALL">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select>{(search || department !== 'ALL') && <button className="btn-quiet" onClick={() => { setSearch(''); setDepartment('ALL'); }}>Clear filters</button>}<span>{visibleEmployees.length} result{visibleEmployees.length === 1 ? '' : 's'}</span></div>
      <div className="overflow-x-auto"><table className="data-table employee-table"><thead><tr><th><input aria-label="Select all employees on this page" type="checkbox" checked={pageSelected} onChange={() => setSelectedEmployees(current => pageSelected ? current.filter(id => !activeOnPage.some(item => item.id === id)) : [...new Set([...current, ...activeOnPage.map(item => item.id)])])} /></th><th>Employee</th><th>Role</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageEmployees.map(employee => <tr key={employee.id} className={selectedEmployees.includes(employee.id) ? 'selected-row' : ''}><td><input disabled={!employee.is_active} aria-label={`Select ${employee.name}`} type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} /></td><td><div className="employee-cell"><span className="employee-avatar">{employee.name.split(' ').map(part => part[0]).slice(0,2).join('')}</span><div><strong>{employee.name}</strong><small>{employee.employee_id}{employee.has_photo ? ' · Photo ready' : ''}</small></div></div></td><td>{employee.designation}<small>{employee.department}</small></td><td>{employee.email}<small>{employee.phone}</small></td><td><StatusBadge value={employee.is_active ? 'ACTIVE' : 'INACTIVE'} /></td><td><div className="row-actions"><button onClick={() => { setEmployeeError(''); setEmployeeEditor(employee); }}>Edit</button><label>Photo<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadPhoto(employee, event.target.files?.[0])} /></label><button onClick={() => changeEmployeeStatus(employee)}>{employee.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div>
      <div className="table-footer"><span>Page {page} of {pageCount}</span><div><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>← Previous</button><button disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>Next →</button></div></div>
      <div className="selection-bar"><p><strong>{selectedEmployees.length}</strong> active employee{selectedEmployees.length !== 1 ? 's' : ''} selected</p><button disabled={busy || !selectedEmployees.length} onClick={createRequest} className="btn-primary">{busy ? 'Submitting…' : 'Create card request'}</button></div></> : <EmptyState icon="♙" title="Add your team to get started" copy="Add one employee manually or import a validated CSV file." action="Add first employee" onAction={() => setEmployeeEditor(null)} />}</section>}

    {tab === 'templates' && <CardStudio onSaved={async () => { await load(); }} company={company} employees={employees} templates={templates} templateId={company.selected_template_id} onChoose={selectTemplate} busy={busy} />}

    {tab === 'requests' && <section className="panel"><div className="panel-header"><div><span className="panel-kicker">CARD DELIVERY</span><h2>Card request history</h2><p>Follow every decision and download completed cards.</p></div><button className="btn-secondary" onClick={createRequest}>Create new request</button></div>{requests.length ? <div className="request-list">{requests.map(request => <button className="request-card" key={request.id} onClick={() => openRequest(request)}><span className="request-icon">▤</span><div className="request-summary"><strong>Request #{request.id}</strong><small>{formatDate(request.created_at)} · {request.items.length} employee{request.items.length === 1 ? '' : 's'}</small></div><span className="request-template">{request.template?.name || `Template #${request.template_id}`}</span><StatusBadge value={request.status} /><b>View details →</b></button>)}</div> : <EmptyState icon="▤" title="No card requests yet" copy="Select active employees and send your first card request." action="Choose employees" onAction={() => setTab('employees')} />}</section>}

    {csvOpen && <CsvImportDialog employees={employees} onClose={() => setCsvOpen(false)} onComplete={async count => { setCsvOpen(false); setMessage(`${count} employees imported successfully.`); await load(); }} />}
    {wizardOpen && <RequestWizard company={company} employees={employees} templates={templates} initialIds={selectedEmployees} onClose={() => setWizardOpen(false)} onComplete={async () => { setWizardOpen(false); setSelectedEmployees([]); setTab('requests'); await load(); }} />}
    {employeeEditor !== undefined && <EmployeeDialog employee={employeeEditor} busy={busy} apiError={employeeError} onSave={saveEmployee} onClose={() => setEmployeeEditor(undefined)} />}
    {requestViewer && <RequestDetails viewer={requestViewer} onClose={() => setRequestViewer(null)} onDownload={download} />}
  </>;
}

function EmptyState({ icon, title, copy, action, onAction }) {
  return <div className="premium-empty"><span>{icon}</span><h3>{title}</h3><p>{copy}</p>{action && <button className="btn-primary" onClick={onAction}>{action} →</button>}</div>;
}

function RequestDetails({ viewer, onClose, onDownload }) {
  const { request, cards } = viewer;
  const steps = [
    ['Request submitted', request.created_at, true],
    ['Administrator decision', request.decided_at, Boolean(request.decided_at)],
    [request.status === 'REJECTED' ? 'Request rejected' : 'Cards generated', request.status === 'COMPLETED' ? request.decided_at : null, ['COMPLETED', 'REJECTED'].includes(request.status)],
  ];
  return <ReviewDialog title={`Card request #${request.id}`} onClose={onClose}>
    <div className="request-detail-head"><div><StatusBadge value={request.status} /><p>{request.items.length} employee{request.items.length === 1 ? '' : 's'} · {request.template?.name}</p></div>{request.status === 'COMPLETED' && <button className="btn-primary" onClick={() => onDownload(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)}>Download all ZIP</button>}</div>
    <div className="request-timeline">{steps.map(([label, time, done], index) => <div className={done ? 'done' : ''} key={label}><span>{done ? '✓' : index + 1}</span><i /><p><strong>{label}</strong><small>{time ? formatDate(time) : 'Waiting'}</small></p></div>)}</div>
    {request.rejection_reason && <div className="decision-note"><strong>Decision note</strong><p>{request.rejection_reason}</p></div>}
    <h3 className="detail-heading">Employees included</h3><div className="request-people">{request.items.map(item => <div key={item.id}><span>{item.employee.name.charAt(0)}</span><p><strong>{item.employee.name}</strong><small>{item.employee.designation} · {item.employee.department}</small></p></div>)}</div>
    {cards.length > 0 && <><h3 className="detail-heading">Generated cards</h3><div className="space-y-3">{cards.map(card => <article className="generated-card-row" key={card.id}><div><strong>{card.file_name}</strong><p>{Math.ceil(card.file_size / 1024)} KB · <StatusBadge value={card.status} /></p></div><div className="flex gap-2"><a className="btn-secondary" href={`/verify/${card.verification_token}`} target="_blank">Verify</a><button className="btn-primary" onClick={() => onDownload(`/cards/${card.id}/download`, card.file_name)}>Download</button></div></article>)}</div></>}
  </ReviewDialog>;
}
