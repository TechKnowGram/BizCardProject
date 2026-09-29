'use client';

import { useEffect, useState } from 'react';
import { api, download } from '../lib/api';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import EmployeeDialog from './EmployeeDialog';

export default function CompanyDashboard() {
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [tab, setTab] = useState('employees');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [employeeEditor, setEmployeeEditor] = useState(undefined);
  const [employeeError, setEmployeeError] = useState('');

  async function load() {
    setError('');
    try {
      const companyData = await api('/auth/company');
      setCompany(companyData);
      if (companyData.status === 'APPROVED') {
        const [employeeData, templateData, requestData] = await Promise.all([api('/employees'), api('/templates'), api('/card-requests')]);
        setEmployees(employeeData); setTemplates(templateData); setRequests(requestData);
      }
    } catch (requestError) { setError(requestError.message); }
  }
  useEffect(() => { load(); }, []);

  async function uploadCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData(); form.append('file', file);
    setBusy(true); setError(''); setMessage('');
    try { const result = await api('/employees/import', { method: 'POST', body: form }); setMessage(`${result.imported} employees imported successfully.`); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); event.target.value = ''; }
  }

  async function selectTemplate(id) {
    setBusy(true); setError(''); setMessage('');
    try { await api(`/templates/${id}/select`, { method: 'POST' }); setMessage('Your card template has been updated.'); await load(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  async function saveEmployee(values) {
    setBusy(true); setEmployeeError('');
    const editing = Boolean(employeeEditor?.id);
    try {
      await api(editing ? `/employees/${employeeEditor.id}` : '/employees', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(values),
      });
      setEmployeeEditor(undefined); setMessage(editing ? 'Employee details updated.' : 'Employee added successfully.'); await load();
    } catch (requestError) { setEmployeeError(requestError.message); } finally { setBusy(false); }
  }

  function toggleEmployee(id) { setSelectedEmployees(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }

  async function createRequest() {
    if (!selectedEmployees.length) { setError('Select at least one employee.'); return; }
    if (!company.selected_template_id) { setError('Choose a template before requesting cards.'); setTab('templates'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/card-requests', { method: 'POST', body: JSON.stringify({ employee_ids: selectedEmployees, template_id: company.selected_template_id }) });
      setSelectedEmployees([]); setMessage('Your card request has been sent for approval.'); setTab('requests'); await load();
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }

  async function showCards(request) {
    try {
      const cards = await api(`/card-requests/${request.id}/cards`);
      if (!cards.length) { setMessage('Cards are not generated yet.'); return; }
      for (const card of cards) await download(`/cards/${card.id}/download`, card.file_name);
    } catch (requestError) { setError(requestError.message); }
  }

  if (!company) return <div className="panel empty-state">{error ? <><p role="alert">{error}</p><button className="btn-secondary mt-4" onClick={load}>Try again</button></> : 'Loading company workspace…'}</div>;
  if (company.status !== 'APPROVED') return <section className="panel max-w-2xl p-8"><StatusBadge value={company.status} /><p className="eyebrow mt-7">COMPANY REVIEW</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{company.name}</h2><p className="mt-4 max-w-lg leading-7 text-slate-600">{company.status === 'PENDING' ? 'Your company details are with the System Admin. Employee imports, templates, and card requests will unlock as soon as the company is approved.' : 'This company is not currently approved. Contact the System Admin if you believe this status should be reviewed.'}</p><button className="btn-secondary mt-7" onClick={load}>Check status again</button></section>;

  const selectedTemplate = templates.find(template => template.id === company.selected_template_id);
  const tabs = [['employees', 'Employees', employees.length], ['templates', 'Templates', templates.length], ['requests', 'Requests', requests.length]];
  const stats = [['Team members', employees.length, 'Ready for card requests'], ['Card style', selectedTemplate?.name || 'Choose one', selectedTemplate ? 'Selected template' : 'Action needed'], ['Awaiting approval', requests.filter(request => request.status === 'PENDING').length, 'With the System Admin'], ['Completed', requests.filter(request => request.status === 'COMPLETED').length, 'Ready to download']];

  return <>
    <section className="company-banner"><div><div className="flex items-center gap-3"><span className="company-mark">{company.name.charAt(0)}</span><div><p className="text-xs text-indigo-200">APPROVED COMPANY</p><h2 className="mt-1 text-2xl font-semibold">{company.name}</h2></div></div><p className="mt-5 max-w-xl text-sm leading-6 text-indigo-100">Build a consistent identity for every person on your team. Import employees, choose a design, and send one request.</p></div><div className="workflow"><span className={employees.length ? 'done' : 'current'}>1 <small>Import</small></span><i /><span className={selectedTemplate ? 'done' : employees.length ? 'current' : ''}>2 <small>Design</small></span><i /><span className={requests.length ? 'done' : selectedTemplate ? 'current' : ''}>3 <small>Request</small></span></div></section>
    <div className="stats-grid mt-6">{stats.map(([label, value, note]) => <article className="stat-card" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-4 truncate text-2xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></article>)}</div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><div className="tabs">{tabs.map(([value, label, count]) => <button key={value} className={tab === value ? 'tab active' : 'tab'} onClick={() => setTab(value)}>{label}<span>{count}</span></button>)}</div><button className="btn-quiet" disabled={busy} onClick={load}>Refresh</button></div>
    {error && <p role="alert" className="notice-error mt-5">{error}</p>}{message && <p role="status" className="notice-success mt-5">{message}</p>}

    {tab === 'employees' && <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Your people</h2><p className="mt-1 text-xs text-slate-500">Add one person manually or upload a CSV for the whole team.</p></div><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(null); }}>Add manually</button><label className="btn-primary cursor-pointer">{busy ? 'Uploading…' : 'Upload employee CSV'}<input disabled={busy} type="file" accept=".csv,text/csv" onChange={uploadCsv} className="hidden" /></label></div></div>{employees.length ? <><div className="overflow-x-auto"><table className="data-table"><thead><tr><th className="w-16">Select</th><th>Employee</th><th>Role</th><th>Contact</th><th>Action</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id} className={selectedEmployees.includes(employee.id) ? 'selected-row' : ''}><td><input aria-label={`Select ${employee.name}`} type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} className="h-4 w-4 accent-indigo-600" /></td><td><p className="font-semibold">{employee.name}</p><p className="mt-1 text-xs text-slate-400">{employee.employee_id}</p></td><td>{employee.designation}<p className="mt-1 text-xs text-slate-400">{employee.department}</p></td><td>{employee.email}<p className="mt-1 text-xs text-slate-400">{employee.phone}</p></td><td><button className="btn-secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(employee); }}>Edit</button></td></tr>)}</tbody></table></div><div className="selection-bar"><p><strong>{selectedEmployees.length}</strong> employee{selectedEmployees.length !== 1 && 's'} selected</p><button disabled={busy || !selectedEmployees.length} onClick={createRequest} className="btn-primary">Create card request</button></div></> : <div className="empty-state"><p className="text-lg font-semibold text-slate-700">Add your team to get started.</p><p className="mt-2">Add one employee manually or import a CSV with employee_id, name, designation, department, email, and phone.</p><button className="btn-primary mt-5" onClick={() => setEmployeeEditor(null)}>Add first employee</button></div>}</section>}

    {tab === 'templates' && <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Choose your signature look</h2><p className="mt-1 text-xs text-slate-500">One active design keeps every employee card consistent.</p></div></div><div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">{templates.map(template => { const selected = template.id === company.selected_template_id; return <article className={`template-option ${selected ? 'selected' : ''}`} key={template.id}><CardPreview style={template.style_key} company={company.name} /><div className="mt-5 flex items-start justify-between gap-3"><div><h3 className="font-semibold">{template.name}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{template.description}</p></div>{selected && <span className="selected-label">Selected</span>}</div><button className={selected ? 'btn-secondary mt-5 w-full' : 'btn-primary mt-5 w-full'} disabled={busy || selected} onClick={() => selectTemplate(template.id)}>{selected ? 'Current template' : `Choose ${template.name}`}</button></article>; })}</div></section>}

    {tab === 'requests' && <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">Card request history</h2><p className="mt-1 text-xs text-slate-500">Follow every decision and download completed PDFs.</p></div></div>{requests.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Request</th><th>Template</th><th>Employees</th><th>Status</th><th>Action</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td><p className="font-semibold">Request #{request.id}</p><p className="mt-1 text-xs text-slate-400">{new Date(request.created_at).toLocaleDateString()}</p></td><td>{request.template?.name || `Template #${request.template_id}`}</td><td>{request.items.length} card{request.items.length !== 1 && 's'}</td><td><StatusBadge value={request.status} />{request.rejection_reason && <p className="mt-2 max-w-xs text-xs text-red-600">{request.rejection_reason}</p>}</td><td>{request.status === 'COMPLETED' ? <button onClick={() => showCards(request)} className="btn-primary">Download PDFs</button> : <span className="text-xs text-slate-400">No file yet</span>}</td></tr>)}</tbody></table></div> : <div className="empty-state"><p className="text-lg font-semibold text-slate-700">No requests yet.</p><p className="mt-2">Select employees to send your first card request.</p></div>}</section>}
    {employeeEditor !== undefined && <EmployeeDialog employee={employeeEditor} busy={busy} apiError={employeeError} onSave={saveEmployee} onClose={() => setEmployeeEditor(undefined)} />}
  </>;
}
