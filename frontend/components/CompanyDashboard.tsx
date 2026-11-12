'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, download } from '../lib/api';
import type { CardRequest, Company, Employee, GeneratedCard, Template } from '../lib/types';
import type { EmployeeValues } from '../lib/validation';
import StatusBadge from './StatusBadge';
import EmployeeDialog from './EmployeeDialog';
import CompanyProfilePanel from './CompanyProfilePanel';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import CardStudio from './CardStudio';
import CsvImportDialog from './CsvImportDialog';
import RequestWizard from './RequestWizard';
import CompanyMemberships from './CompanyMemberships';
import { Button, Eyebrow, Panel, PanelHeader, buttonClass, cx, tableClass, tdClass, thClass } from './ui';
import { PanelTitle, cellNoteClass, compactSelectClass, errorMessage, requestIconClass } from './CompanyDashboardParts';

const PAGE_SIZE = 8;
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

const headerClass = 'max-sm:p-4.5';
const rowActionClass = 'cursor-pointer rounded-lg bg-[#f6f8f7] px-2.5 py-2 text-3xs font-bold text-[#625a6c] hover:bg-[#e9e5fb] hover:text-[#5928b6]';
const checkboxClass = 'size-4 accent-violet';
const pagerButtonClass = 'rounded-lg border border-[#e3e8e6] bg-white px-2.5 py-2 text-[#655e6d] disabled:cursor-not-allowed disabled:opacity-40';
const detailHeadingClass = 'mt-6 mb-3 text-sm font-extrabold';
const skeletonItem = 'h-32.5 rounded-[28px] bg-[linear-gradient(90deg,#e3e8e6,#f6f8f7,#e3e8e6)] bg-[length:200%_100%] animate-skeleton';
const requestMetaSmall = 'mt-1.5 block text-3xs text-[#7c8a90]';

type StatTone = 'violet' | 'cyan' | 'amber' | 'green';
const toneAccent: Record<StatTone, string> = { violet: 'bg-[#7c4be3]', cyan: 'bg-[#2bbbc4]', amber: 'bg-[#efb53e]', green: 'bg-[#47ae80]' };

function StatCard({ label, value, note, tone }: { label: string; value: ReactNode; note: string; tone: StatTone }) {
  return <article className="relative min-h-34 overflow-hidden rounded-[28px] border border-[#e3e8e6] bg-white p-5.5 shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.75 hover:shadow-lg max-sm:min-h-30 max-sm:p-4.5"><div className={cx('absolute top-0 left-0 h-1 w-full', toneAccent[tone])} /><p className="text-xs font-semibold text-[#756f80]">{label}</p><strong className="mt-4.5 block overflow-hidden text-3xl leading-none font-extrabold tracking-tighter text-ellipsis whitespace-nowrap">{value}</strong><small className="mt-2.5 block text-2xs text-[#7c8a90]">{note}</small></article>;
}

export interface CompanyDashboardProps {
  tab: string;
  setTab: (tab: string) => void;
}

interface RequestViewerState { request: CardRequest; cards: GeneratedCard[] }

export default function CompanyDashboard({ tab, setTab }: CompanyDashboardProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeEditor, setEmployeeEditor] = useState<Employee | null | undefined>(undefined);
  const [employeeError, setEmployeeError] = useState('');
  const [requestViewer, setRequestViewer] = useState<RequestViewerState | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const companyData = await api<Company>('/company/profile');
      setCompany(companyData);
      if (companyData.status === 'APPROVED') {
        const [employeeData, templateData, requestData] = await Promise.all([api<Employee[]>('/employees'), api<Template[]>('/templates'), api<CardRequest[]>('/card-requests')]);
        setEmployees(employeeData); setTemplates(templateData); setRequests(requestData);

      }
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, department]);

  async function saveEmployee(values: EmployeeValues) {
    setBusy(true); setEmployeeError('');
    const editing = Boolean(employeeEditor?.id);
    try {
      await api(editing ? `/employees/${employeeEditor!.id}` : '/employees', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(values) });
      setEmployeeEditor(undefined); setMessage(editing ? 'Employee details updated.' : 'Employee added successfully.'); await load();
    } catch (requestError) { setEmployeeError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function uploadPhoto(employee: Employee, file: File | undefined) {
    if (!file) return;
    const form = new FormData(); form.append('file', file); setBusy(true); setError('');
    try { await api(`/employees/${employee.id}/photo`, { method: 'POST', body: form }); setMessage(`${employee.name}’s photo was updated.`); await load(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function changeEmployeeStatus(employee: Employee) {
    if (employee.is_active && !window.confirm(`Deactivate ${employee.name}? Existing cards will also become inactive.`)) return;
    setBusy(true); setError('');
    try {
      await api(`/employees/${employee.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: !employee.is_active }) });
      setSelectedEmployees(current => current.filter(id => id !== employee.id));
      setMessage(`${employee.name} is now ${employee.is_active ? 'inactive' : 'active'}.`); await load();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function selectTemplate(id: number) {
    setBusy(true); setError('');
    try { await api(`/templates/${id}/select`, { method: 'POST' }); setMessage('Your card template has been updated.'); await load(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  function toggleEmployee(id: number) {
    setSelectedEmployees(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  function createRequest() { setWizardOpen(true); }

  async function openRequest(request: CardRequest) {
    let cards: GeneratedCard[] = [];
    if (request.status === 'COMPLETED') {
      try { cards = await api<GeneratedCard[]>(`/card-requests/${request.id}/cards`); }
      catch (requestError) { setError(errorMessage(requestError)); return; }
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

  if (loading) return <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2"><i className={skeletonItem} /><i className={skeletonItem} /><i className={skeletonItem} /><div className={cx(skeletonItem, 'col-span-full h-90')} /></div>;
  if (!company) return <Panel className="px-6 py-16.5 text-center text-sm text-[#8991a3]">{error ? <><p role="alert">{error}</p><Button variant="secondary" className="mt-4" onClick={load}>Try again</Button></> : 'Loading company workspace…'}</Panel>;

  if (company.status !== 'APPROVED') return <>
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
    <Panel className="relative max-w-190 p-10.5 after:absolute after:-top-17.5 after:-right-17.5 after:size-55 after:rounded-full after:border-35 after:border-[#f1eaff] after:content-['']"><div className="mb-5 grid size-16 place-items-center rounded-[28px] bg-[#e9e5fb] text-2xl text-[#6330c2]">{company.status === 'PENDING' ? '⌛' : '!'}</div><StatusBadge value={company.status} /><Eyebrow className="mt-6.5">COMPANY REVIEW</Eyebrow><h2 className="mt-2.5 text-3xl font-extrabold tracking-tighter">{company.status === 'PENDING' ? 'Your workspace is being reviewed.' : 'Your workspace needs attention.'}</h2><p className="mt-4 max-w-150 text-sm leading-relaxed text-[#736c7b]">{company.status === 'PENDING' ? 'Complete the profile while the System Admin reviews your company. Employee and card tools unlock immediately after approval.' : `Your company is not currently approved.${company.rejection_reason ? ` Reason: ${company.rejection_reason}` : ''}`}</p><div className="mt-6.5 flex gap-2.5"><Button onClick={() => setTab('profile')}>Complete company profile</Button><Button variant="secondary" onClick={load}>Check status</Button></div></Panel>
    <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />
  </>;

  const selectedTemplate = templates.find(template => template.id === company.selected_template_id);

  const profileComplete = Boolean(company.phone && company.address && company.website && company.description && company.has_logo);
  const setupSteps: Array<[string, boolean, string]> = [
    ['Company approved', true, 'profile'],
    ['Complete company profile', profileComplete, 'profile'],
    ['Add your employees', employees.length > 0, 'employees'],
    ['Choose a card template', Boolean(selectedTemplate), 'templates'],
    ['Create your first request', requests.length > 0, 'employees'],
  ];
  const completeCount = setupSteps.filter(item => item[1]).length;
  const stats: Array<[string, string | number, string, StatTone]> = [
    ['Active people', employees.filter(item => item.is_active).length, `${employees.length} total records`, 'violet'],
    ['Card style', selectedTemplate?.name || 'Not selected', selectedTemplate ? 'Brand standard ready' : 'Action needed', 'cyan'],
    ['Awaiting approval', requests.filter(request => request.status === 'PENDING').length, 'With System Admin', 'amber'],
    ['Ready to download', requests.filter(request => request.status === 'COMPLETED').length, 'Completed requests', 'green'],
  ];

  const stepBase = 'relative grid size-9.5 place-items-center rounded-full border text-xs font-bold';
  const stepClass = (state: 'done' | 'current' | ''): string => cx(stepBase, state === 'done' ? 'border-[#bef264] bg-[#bef264] text-[#312e81]' : state === 'current' ? 'border-white bg-white text-[#4338ca] ring-5 ring-[#ffffff1f]' : 'border-[#ffffff4d] text-[#c7d2fe]');
  const stepLabel = 'absolute top-11.5 text-2xs font-medium text-[#c7d2fe]';
  const recentRowClass = 'grid w-full grid-cols-[calc(var(--spacing)*9.5)_1fr_auto] items-center gap-3 border-t border-[#e3e8e6] px-5 py-3.5 text-left transition-colors duration-180 hover:bg-[#f6f8f7]';

  return <>
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

    {tab === 'overview' && <div className="grid gap-5.5">
      <section className="relative flex min-h-55 items-center justify-between gap-8 overflow-hidden rounded-[40px] bg-[linear-gradient(#10242f,#10242f)] p-8.5 text-white shadow-xl after:absolute after:-top-17.5 after:right-[33%] after:text-[length:calc(var(--spacing)*55)] after:text-[#ffffff0d] after:content-['✦'] max-md:flex-col max-md:items-start"><div className="relative z-2"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-[28px] border border-[#ffffff4d] bg-[#ffffff24] text-xl font-bold">{company.name.charAt(0)}</span><div><p className="text-3xs font-extrabold tracking-widest text-[#cfc1f3]">APPROVED WORKSPACE</p><h2 className="mt-1 text-3xl font-extrabold tracking-tight">{company.name}</h2></div></div><p className="mt-4.5 max-w-147.5 text-sm leading-relaxed text-[#e2d9f7]">Your team’s brand workspace is ready. Keep the profile current, add people and create your next card request.</p><div className="mt-5.5 flex items-center gap-4.5"><Button variant="sun" onClick={() => setTab('employees')}>Add employees <span className="grid size-6 place-items-center rounded-full bg-[#21183d] text-white">↗</span></Button><button className="text-xs font-bold text-white underline underline-offset-4" onClick={() => setTab('requests')}>View requests</button></div></div><div className="relative z-2 flex min-w-88 items-center max-md:mb-4 max-md:w-full max-md:min-w-0"><span className={stepClass(employees.length ? 'done' : 'current')}>1 <small className={stepLabel}>People</small></span><i className="h-px flex-1 bg-[#ffffff40]" /><span className={stepClass(selectedTemplate ? 'done' : employees.length ? 'current' : '')}>2 <small className={stepLabel}>Design</small></span><i className="h-px flex-1 bg-[#ffffff40]" /><span className={stepClass(requests.length ? 'done' : selectedTemplate ? 'current' : '')}>3 <small className={stepLabel}>Request</small></span></div></section>
      <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">{stats.map(([label, value, note, tone]) => <StatCard key={label} label={label} value={value} note={note} tone={tone} />)}</div>
      <div className="grid grid-cols-2 gap-4.5 max-lg:grid-cols-1">
        <Panel className="min-h-100"><PanelHeader className={headerClass}><PanelTitle kicker="GET STARTED" title="Workspace setup" copy={`${completeCount} of ${setupSteps.length} steps complete`} /><strong className="text-2xl text-violet">{Math.round((completeCount / setupSteps.length) * 100)}%</strong></PanelHeader><div className="mx-6 mb-4.5 h-2 overflow-hidden rounded-full bg-[#eee9f3]"><i className="block h-full rounded-[inherit] bg-[linear-gradient(#4dffc8,#4dffc8)] transition-[width] duration-400 ease-in-out" style={{ width: `${(completeCount / setupSteps.length) * 100}%` }} /></div><div className="grid px-4 pb-4">{setupSteps.map(([label, done, target]) => <button key={label} className="grid grid-cols-[calc(var(--spacing)*7.5)_1fr_calc(var(--spacing)*5)] items-center gap-2.5 rounded-xl px-2.5 py-3 text-left transition-colors duration-180 hover:bg-[#f6f8f7]" onClick={() => setTab(target)}><span className={cx('grid size-6.5 place-items-center rounded-full border text-xs', done ? 'border-[#bfe5d3] bg-[#eaf8f1] font-black text-[#23815c]' : 'border-[#ded7e6] text-[#a29aa9]')}>{done ? '✓' : '○'}</span><p className={cx('text-xs font-semibold', done ? 'text-[#8c8593] line-through' : 'text-[#504a59]')}>{label}</p><b className="text-[#a8a1ae]">→</b></button>)}</div></Panel>
        <Panel className="min-h-100"><PanelHeader className={headerClass}><PanelTitle kicker="RECENT ACTIVITY" title="Latest requests" /><Button variant="quiet" onClick={() => setTab('requests')}>View all</Button></PanelHeader>{requests.slice(0, 4).map(request => <button className={recentRowClass} key={request.id} onClick={() => openRequest(request)}><span className={requestIconClass}>▤</span><div><strong className="block text-xs text-[#393341]">Request #{request.id}</strong><small className="mt-1 block text-3xs text-[#7c8a90]">{request.items.length} card{request.items.length === 1 ? '' : 's'} · {formatDate(request.created_at)}</small></div><StatusBadge value={request.status} /></button>)}{!requests.length && <div className="grid min-h-67.5 place-items-center content-center p-7.5 text-center"><span className="mb-3.5 grid size-14.5 -rotate-4 place-items-center rounded-[28px] bg-[#e9e5fb] text-2xl text-[#6330c4]">◇</span><p className="text-sm font-bold text-[#4e4856]">No requests yet.</p><button className="mt-2 text-2xs text-[#766e80]" onClick={() => setTab('employees')}>Select employees to begin</button></div>}</Panel>
      </div>
    </div>}

    {tab === 'profile' && <CompanyProfilePanel company={company} onReload={load} onMessage={setMessage} />}

    {tab === 'employees' && <Panel>
      <PanelHeader className={headerClass}><PanelTitle kicker="TEAM DIRECTORY" title="Your people" copy="Add people manually or import a complete team CSV." /><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => download('/employees/export', 'employees.csv')}>Export CSV</Button><Button variant="secondary" onClick={() => { setEmployeeError(''); setEmployeeEditor(null); }}>Add manually</Button><Button onClick={() => setCsvOpen(true)}>Import CSV</Button></div></PanelHeader>
      {employees.length ? <><div className="flex flex-wrap items-center gap-2.5 border-b border-[#eceef3] bg-[#fbf9fd] px-5.5 py-3.5 max-sm:items-stretch"><div className="flex min-w-60 items-center rounded-xl border border-[#e3e8e6] bg-white px-3 transition focus-within:border-[#8a5edf] focus-within:ring-3 focus-within:ring-[#e9e5fb] max-sm:w-full max-sm:min-w-0"><span className="text-lg text-[#958d9e]">⌕</span><input className="w-full bg-transparent px-2 py-2.5 text-xs outline-none" aria-label="Search employees" placeholder="Search name, ID, email…" value={search} onChange={event => setSearch(event.target.value)} /></div><select className={compactSelectClass} value={department} onChange={event => setDepartment(event.target.value)}><option value="ALL">All departments</option>{departments.map(value => <option key={value}>{value}</option>)}</select>{(search || department !== 'ALL') && <Button variant="quiet" onClick={() => { setSearch(''); setDepartment('ALL'); }}>Clear filters</Button>}<span className="ml-auto text-xs text-[#8a90a0] max-sm:ml-0">{visibleEmployees.length} result{visibleEmployees.length === 1 ? '' : 's'}</span></div>
      <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={cx(thClass, 'max-md:p-3.5')}><input className={checkboxClass} aria-label="Select all employees on this page" type="checkbox" checked={pageSelected} onChange={() => setSelectedEmployees(current => pageSelected ? current.filter(id => !activeOnPage.some(item => item.id === id)) : [...new Set([...current, ...activeOnPage.map(item => item.id)])])} /></th>{['Employee', 'Role', 'Contact', 'Status', 'Actions'].map(heading => <th key={heading} className={cx(thClass, 'max-md:p-3.5')}>{heading}</th>)}</tr></thead><tbody>{pageEmployees.map(employee => { const td = cx(tdClass, 'max-md:p-3.5'); return <tr key={employee.id} className={cx('hover:bg-[#f6f8f7]', selectedEmployees.includes(employee.id) && 'bg-[#eef2ff]')}><td className={td}><input className={checkboxClass} disabled={!employee.is_active} aria-label={`Select ${employee.name}`} type="checkbox" checked={selectedEmployees.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} /></td><td className={td}><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#e9e5fb,#e9e5fb)] text-2xs font-extrabold text-[#6130bd]">{employee.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><div><strong className="block">{employee.name}</strong><small className={cellNoteClass}>{employee.employee_id}{employee.has_photo ? ' · Photo ready' : ''}</small></div></div></td><td className={td}>{employee.designation}<small className={cellNoteClass}>{employee.department}</small></td><td className={td}>{employee.email}<small className={cellNoteClass}>{employee.phone}</small></td><td className={td}><StatusBadge value={employee.is_active ? 'ACTIVE' : 'INACTIVE'} /></td><td className={td}><div className="flex flex-wrap gap-1.5"><button className={rowActionClass} onClick={() => { setEmployeeError(''); setEmployeeEditor(employee); }}>Edit</button><label className={rowActionClass}>Photo<input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => uploadPhoto(employee, event.target.files?.[0])} /></label><button className={rowActionClass} onClick={() => changeEmployeeStatus(employee)}>{employee.is_active ? 'Deactivate' : 'Activate'}</button></div></td></tr>; })}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-[#efebf2] px-5.5 py-3.5 text-2xs text-[#8f8896] max-sm:flex-col max-sm:items-start max-sm:gap-2.5"><span>Page {page} of {pageCount}</span><div className="flex gap-1.5"><button className={pagerButtonClass} disabled={page === 1} onClick={() => setPage(value => value - 1)}>← Previous</button><button className={pagerButtonClass} disabled={page === pageCount} onClick={() => setPage(value => value + 1)}>Next →</button></div></div>
      <div className="flex items-center justify-between gap-4 border-t border-[#e7e0ec] bg-[#f8f4fd] px-6 py-4 text-sm text-[#475569] max-md:flex-col max-md:items-stretch max-sm:sticky max-sm:bottom-0 max-sm:z-5"><p><strong>{selectedEmployees.length}</strong> active employee{selectedEmployees.length !== 1 ? 's' : ''} selected</p><Button disabled={busy || !selectedEmployees.length} onClick={createRequest}>{busy ? 'Submitting…' : 'Create card request'}</Button></div></> : <PremiumEmpty icon="♙" title="Add your team to get started" copy="Add one employee manually or import a validated CSV file." action="Add first employee" onAction={() => setEmployeeEditor(null)} />}</Panel>}

    {tab === 'templates' && <CardStudio onSaved={async () => { await load(); }} company={company} employees={employees} templates={templates} templateId={company.selected_template_id} onChoose={selectTemplate} busy={busy} />}

    {tab === 'requests' && <Panel><PanelHeader className={headerClass}><PanelTitle kicker="CARD DELIVERY" title="Card request history" copy="Follow every decision and download completed cards." /><Button variant="secondary" onClick={createRequest}>Create new request</Button></PanelHeader>{requests.length ? <div className="grid">{requests.map(request => <button className="grid w-full grid-cols-[calc(var(--spacing)*10.5)_1fr_calc(var(--spacing)*30)_calc(var(--spacing)*26.25)_calc(var(--spacing)*25)] items-center gap-4 border-t border-[#e3e8e6] px-6 py-4.5 text-left transition hover:bg-[#f6f8f7] max-md:grid-cols-[calc(var(--spacing)*10)_1fr_auto]" key={request.id} onClick={() => openRequest(request)}><span className={requestIconClass}>▤</span><div><strong className="block text-xs">Request #{request.id}</strong><small className={requestMetaSmall}>{formatDate(request.created_at)} · {request.items.length} employee{request.items.length === 1 ? '' : 's'}</small></div><span className="text-xs text-[#6b6473] max-md:hidden">{request.template?.name || `Template #${request.template_id}`}</span><StatusBadge value={request.status} /><b className="text-right text-3xs text-[#6632c2] max-md:hidden">View details →</b></button>)}</div> : <PremiumEmpty icon="▤" title="No card requests yet" copy="Select active employees and send your first card request." action="Choose employees" onAction={() => setTab('employees')} />}</Panel>}

    {tab === 'memberships' && <CompanyMemberships />}

    {tab === 'profile' && company && <CompanyProfilePanel company={company} onSaved={async () => { await load(); }} />}

    {csvOpen && <CsvImportDialog employees={employees} onClose={() => setCsvOpen(false)} onComplete={async count => { setCsvOpen(false); setMessage(`${count} employees imported successfully.`); await load(); }} />}
    {wizardOpen && <RequestWizard company={company} employees={employees} templates={templates} initialIds={selectedEmployees} onClose={() => setWizardOpen(false)} onComplete={async () => { setWizardOpen(false); setSelectedEmployees([]); setTab('requests'); await load(); }} />}
    {employeeEditor !== undefined && <EmployeeDialog employee={employeeEditor} busy={busy} apiError={employeeError} onSave={saveEmployee} onClose={() => setEmployeeEditor(undefined)} />}
    {requestViewer && <RequestDetails viewer={requestViewer} onClose={() => setRequestViewer(null)} onDownload={download} />}
  </>;
}

interface PremiumEmptyProps { icon: string; title: string; copy: string; action?: string; onAction: () => void }

function PremiumEmpty({ icon, title, copy, action, onAction }: PremiumEmptyProps) {
  return <div className="grid min-h-90 place-items-center content-center p-9 text-center"><span className="mb-5 grid size-18 -rotate-5 place-items-center rounded-[40px] bg-[linear-gradient(145deg,#e9e5fb,#e9e5fb)] text-3xl text-[#6734c5]">{icon}</span><h3 className="text-lg font-extrabold text-[#3d3745]">{title}</h3><p className="mt-2 max-w-90 text-xs leading-relaxed text-[#7c8a90]">{copy}</p>{action && <Button className="mt-5" onClick={onAction}>{action} →</Button>}</div>;
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
    [request.status === 'REJECTED' ? 'Request rejected' : 'Cards generated', request.status === 'COMPLETED' ? request.decided_at : null, ['COMPLETED', 'REJECTED'].includes(request.status)],
  ];
  return <ReviewDialog title={`Card request #${request.id}`} onClose={onClose}>
    <div className="mb-6 flex items-center justify-between gap-4"><div><StatusBadge value={request.status} /><p className="mt-2 text-xs text-[#8a8391]">{request.items.length} employee{request.items.length === 1 ? '' : 's'} · {request.template?.name}</p></div>{request.status === 'COMPLETED' && <Button onClick={() => onDownload(`/card-requests/${request.id}/cards/download`, `card-request-${request.id}.zip`)}>Download all ZIP</Button>}</div>
    <div className="mt-5.5 mb-7 flex max-md:flex-col max-md:gap-0">{steps.map(([label, time, done], index) => <div className="flex flex-1 items-start max-md:min-h-16 max-md:flex-none" key={label}><span className={cx('grid size-7.5 shrink-0 place-items-center rounded-full border text-3xs font-extrabold', done ? 'border-[#b8e2ce] bg-[#e9f8f0] text-[#20805a]' : 'border-[#e3e8e6] bg-white text-[#7c8a90]')}>{done ? '✓' : index + 1}</span><i className="mx-2 mt-4 h-px flex-1 bg-[#e3e8e6] max-md:mx-0 max-md:mt-7.5 max-md:-ml-4 max-md:h-8.5 max-md:w-px max-md:flex-none" /><p className="ml-2 min-w-26.5"><strong className="block text-2xs">{label}</strong><small className="mt-1 block text-3xs text-[#7c8a90]">{time ? formatDate(time) : 'Waiting'}</small></p></div>)}</div>
    {request.rejection_reason && <div className="my-5 rounded-r-lg border-l-3 border-[#e05d68] bg-[#fff4f5] px-4 py-3.5"><strong className="text-xs text-[#98404a]">Decision note</strong><p className="mt-1.5 text-xs leading-relaxed text-[#8b6267]">{request.rejection_reason}</p></div>}
    <h3 className={detailHeadingClass}>Employees included</h3><div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">{request.items.map(item => <div className="flex items-center gap-2.5 rounded-xl border border-[#e3e8e6] p-2.5" key={item.id}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e9e5fb] text-2xs font-extrabold text-[#6431c2]">{item.employee.name.charAt(0)}</span><p><strong className="block text-2xs">{item.employee.name}</strong><small className="mt-1 block text-3xs text-[#97909d]">{item.employee.designation} · {item.employee.department}</small></p></div>)}</div>
    {cards.length > 0 && <><h3 className={detailHeadingClass}>Generated cards</h3><div className="space-y-3">{cards.map(card => <article className="flex items-center justify-between gap-5 rounded-xl border border-[#e7e9ef] p-4 max-sm:flex-col max-sm:items-start" key={card.id}><div><strong>{card.file_name}</strong><p className="mt-1.5 flex items-center gap-2 text-xs text-[#8a90a0]">{Math.ceil(card.file_size / 1024)} KB · <StatusBadge value={card.status} /></p></div><div className="flex gap-2"><a className={buttonClass('secondary')} href={`/verify/${card.verification_token}`} target="_blank">Verify</a><Button onClick={() => onDownload(`/cards/${card.id}/download`, card.file_name)}>Download</Button></div></article>)}</div></>}
  </ReviewDialog>;
}
