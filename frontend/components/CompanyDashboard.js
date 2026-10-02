'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, download } from '../lib/api';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import EmployeeDialog from './EmployeeDialog';
import CompanyProfilePanel from './CompanyProfilePanel';
import ReviewDialog from './ReviewDialog';

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [tab, setTab] = useState('employees');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [employeeEditor, setEmployeeEditor] = useState(undefined);
  const [employeeError, setEmployeeError] = useState('');
  const [cardViewer, setCardViewer] = useState(null);

  async function load() {
    setError('');
    try {
      const companyData = await api('/company/profile');
      setCompany(companyData);
      if (companyData.status === 'APPROVED') {
        const [employeeData, templateData, requestData] = await Promise.all([api('/employees'), api('/templates'), api('/card-requests')]);
        setEmployees(employeeData); setTemplates(templateData); setRequests(requestData);
      }
    } catch (requestError) { setError(requestError.message); }
  }
  useEffect(() => { load(); }, []);

  async function uploadCsv(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const form = new FormData(); form.append('file', file);
    setBusy(true); setError(''); setMessage('');
    try { const result = await api('/employees/import', { method: 'POST', body: form }); setMessage(`${result.imported} employees imported successfully.`); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); event.target.value = ''; }
  }

  async function saveEmployee(values) {
    setBusy(true); setEmployeeError('');
    const editing = Boolean(employeeEditor?.id);
    try {
      await api(editing ? `/employees/${employeeEditor.id}` : '/employees', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(values) });
      setEmployeeEditor(undefined); setMessage(editing ? 'Employee details updated.' : 'Employee added successfully.'); await load();
    } catch (requestError) { setEmployeeError(requestError.message); } finally { setBusy(false); }
  }

  async function uploadPhoto(employee, file) {
    if (!file) return;
    const form = new FormData(); form.append('file', file); setBusy(true); setError('');
    try { await api(`/employees/${employee.id}/photo`, { method: 'POST', body: form }); setMessage(`${employee.name}’s photo was updated.`); await load(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  async function changeEmployeeStatus(employee) {
    setBusy(true); setError('');
    try {
      await api(`/employees/${employee.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !employee.is_active }) });
      setSelectedEmployees(current => current.filter(id => id !== employee.id));
      setMessage(`${employee.name} is now ${employee.is_active ? 'inactive' : 'active'}.`); await load();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  async function selectTemplate(id) {
    setBusy(true); setError(''); setMessage('');
    try { await api(`/templates/${id}/select`, { method: 'POST' }); setMessage('Your card template has been updated.'); await load(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  function toggleEmployee(id) { setSelectedEmployees(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  async function createRequest() {
    if (!selectedEmployees.length) { setError('Select at least one active employee.'); return; }
    if (!company.selected_template_id) { setError('Choose a template before requesting cards.'); setTab('templates'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/card-requests', { method: 'POST', body: JSON.stringify({ employee_ids: selectedEmployees, template_id: company.selected_template_id }) });
      setSelectedEmployees([]); setMessage('Your card request has been sent for approval.'); setTab('requests'); await load();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  async function openCards(request) {
    try { setCardViewer({ request, cards: await api(`/card-requests/${request.id}/cards`) }); }
    catch (requestError) { setError(requestError.message); }
  }

  const departments = useMemo(() => [...new Set(employees.map(item => item.department))].sort(), [employees]);
  const visibleEmployees = employees.filter(employee => {
    const term = search.toLowerCase();
    return (department === 'ALL' || employee.department === department) &&
      [employee.name, employee.employee_id, employee.email, employee.designation].some(value => value.toLowerCase().includes(term));
  });

  if (!company) return <div className="panel empty-state">{error ? <><p role="alert">{error}</p><button className="btn-secondary mt-4" onClick={load}>Try again</button></> : 'Loading company workspace…'}</div>;
  if (company.status !== 'APPROVED') return <><section className="panel max-w-2xl p-8"><StatusBadge value={company.status} /><p className="eyebrow mt-7">COMPANY REVIEW</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{company.name}</h2><p className="mt-4 max-w-lg leading-7 text-slate-600">{company.status === 'PENDING' ? 'Your company details are with the System Admin. Complete your profile while you wait; employee and card tools unlock after approval.' : `Your company is not currently approved.${company.rejection_reason ? ` Reason: ${company.rejection_reason}` : ''}`}</p><button className="btn-secondary mt-7" onClick={load}>Check status again</button></section><CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} /></>;

  const selectedTemplate = templates.find(template => template.id === company.selected_template_id);
  const tabs = [['profile', 'Company', 1], ['employees', 'Employees', employees.length], ['templates', 'Templates', templates.length], ['requests', 'Requests', requests.length]];
  const stats = [['Active people', employees.filter(item => item.is_active).length, `${employees.length} total employee records`], ['Card style', selectedTemplate?.name || 'Choose one', selectedTemplate ? 'Selected template' : 'Action needed'], ['Awaiting approval', requests.filter(request => request.status === 'PENDING').length, 'With the System Admin'], ['Completed', requests.filter(request => request.status === 'COMPLETED').length, 'Ready to download']];

  return <>
    <section className="company-banner"><div><div className="flex items-center gap-3"><span className="company-mark">{company.name.charAt(0)}</span><div><p className="text-xs text-indigo-200">APPROVED COMPANY</p><h2 className="mt-1 text-2xl font-semibold">{company.name}</h2></div></div><p className="mt-5 max-w-xl text-sm leading-6 text-indigo-100">Build a consistent identity for every person on your team. Import employees, choose a design, and send one request.</p></div><div className="workflow"><span className={employees.length ? 'done' : 'current'}>1 <small>Import</small></span><i /><span className={selectedTemplate ? 'done' : employees.length ? 'current' : ''}>2 <small>Design</small></span><i /><span className={requests.length ? 'done' : selectedTemplate ? 'current' : ''}>3 <small>Request</small></span></div></section>
    <div className="stats-grid mt-6">{stats.map(([label, value, note]) => <article className="stat-card" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-4 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></article>)}</div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><div className="tabs">{tabs.map(([value, label, count]) => <button key={value} className={tab === value ? 'tab active' : 'tab'} onClick={() => setTab(value)}>{label}<span>{count}</span></button>)}</div><button className="btn-quiet" disabled={busy} onClick={load}>Refresh</button></div>
    {error && <p role="alert" className="notice-error mt-5">{error}</p>}{message && <p role="status" className="notice-success mt-5">{message}</p>}

    {tab === 'profile' && <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />}
    {tab === 'employees' && <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Your people</h2><p className="mt-1 text-xs text-slate-500">Search, add, update, import, or export your employee directory.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => download('/employees/export', 'employees.csv')}>Export CSV</button><button className="btn-secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(null); }}>Add manually</button><label className="btn-primary cursor-pointer">{busy ? 'Uploading…' : 'Upload CSV'}<input disabled={busy} type="file" accept=".csv,text/csv" onChange={uploadCsv} className="hidden" /></label></div></div>{employees.length ? <><div className="filter-bar"><input className="input compact" placeholder="Search name, ID, email…" value={search} onChange={event => setSearch(event.target.value)} /><select className="input compact" value={department} onChange={event => setDepartment(event.target.value)}><option value="ALL">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select><span>{visibleEmployees.length} results</span></div><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Select</th><th>Employee</th><th>Role</th><th>Contact</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleEmployees.map(employee => <tr key={employee.id} className={selectedEmployees.includes(employee.id) ? 'selected-row' : ''}><td><input disabled={!employee.is_active} aria-label={`Select ${employee.name}`} type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} /></td><td><p className="font-semibold">{employee.name}</p><p className="mt-1 text-xs text-slate-400">{employee.employee_id}{employee.has_photo ? ' · Photo ready' : ''}</p></td><td>{employee.designation}<p className="mt-1 text-xs text-slate-400">{employee.department}</p></td><td>{employee.email}<p className="mt-1 text-xs text-slate-400">{employee.phone}</p></td><td><StatusBadge value={employee.is_active ? 'ACTIVE' : 'INACTIVE'} /></td><td><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(employee); }}>Edit</button><label className="btn-secondary cursor-pointer">Photo<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadPhoto(employee, event.target.files?.[0])} /></label><button className="btn-quiet" onClick={() => changeEmployeeStatus(employee)}>{employee.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div><div className="selection-bar"><p><strong>{selectedEmployees.length}</strong> active employee{selectedEmployees.length !== 1 && 's'} selected</p><button disabled={busy || !selectedEmployees.length} onClick={createRequest} className="btn-primary">Create card request</button></div></> : <div className="empty-state"><p className="text-lg font-semibold text-slate-700">Add your team to get started.</p><p className="mt-2">Add one employee manually or import a validated CSV.</p><button className="btn-primary mt-5" onClick={() => setEmployeeEditor(null)}>Add first employee</button></div>}</section>}

    {tab === 'templates' && <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Choose your signature look</h2><p className="mt-1 text-xs text-slate-500">One active design keeps every employee card consistent.</p></div></div><div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">{templates.map(template => { const selected = template.id === company.selected_template_id; return <article className={`template-option ${selected ? 'selected' : ''}`} key={template.id}><CardPreview style={template.style_key} company={company.name} /><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{template.name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p></div>{selected && <span className="selected-label">Selected</span>}</div><button className={selected ? 'btn-secondary mt-5 w-full' : 'btn-primary mt-5 w-full'} disabled={busy || selected} onClick={() => selectTemplate(template.id)}>{selected ? 'Current template' : `Choose ${template.name}`}</button></article>; })}</div></section>}

    {tab === 'requests' && <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Card request history</h2><p className="mt-1 text-xs text-slate-500">Follow every decision, inspect generated cards, and download a complete ZIP.</p></div></div>{requests.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Request</th><th>Template</th><th>Employees</th><th>Status</th><th>Action</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td><p className="font-semibold">Request #{request.id}</p><p className="mt-1 text-xs text-slate-400">{new Date(request.created_at).toLocaleDateString()}</p></td><td>{request.template?.name || `Template #${request.template_id}`}</td><td>{request.items.length} card{request.items.length !== 1 && 's'}</td><td><StatusBadge value={request.status} />{request.rejection_reason && <p className="mt-2 max-w-xs text-xs text-red-600">{request.rejection_reason}</p>}</td><td>{request.status === 'COMPLETED' ? <div className="flex gap-2"><button onClick={() => openCards(request)} className="btn-secondary">View cards</button><button onClick={() => download(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)} className="btn-primary">Download ZIP</button></div> : <span className="text-xs text-slate-400">No file yet</span>}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p className="text-lg font-semibold text-slate-700">No requests yet.</p><p className="mt-2">Select employees to send your first card request.</p></div>}</section>}

    {employeeEditor !== undefined && <EmployeeDialog employee={employeeEditor} busy={busy} apiError={employeeError} onSave={saveEmployee} onClose={() => setEmployeeEditor(undefined)} />}
    {cardViewer && <ReviewDialog title={`Generated cards · Request #${cardViewer.request.id}`} onClose={() => setCardViewer(null)}><div className="space-y-3">{cardViewer.cards.map(card => <article className="generated-card-row" key={card.id}><div><strong>{card.file_name}</strong><p>{Math.ceil(card.file_size / 1024)} KB · <StatusBadge value={card.status} /></p></div><div className="flex gap-2"><a className="btn-secondary" href={`/verify/${card.verification_token}`} target="_blank">Verify</a><button className="btn-primary" onClick={() => download(`/cards/${card.id}/download`, card.file_name)}>Download</button></div></article>)}</div></ReviewDialog>}
  </>;
}
