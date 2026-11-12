'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { ApiError } from '../lib/api';
import type { AuditLog, CardRequest, Company, Template, User } from '../lib/types';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import AdminTemplateCollection from './AdminTemplateCollection';
import { Button, EmptyState, Panel, PanelHeader, cx, inputClass, inputCompactClass, tableClass, tdClass, thClass } from './ui';

const formatDate = (value?: string | null): string => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not available';

export interface AdminStats {
  companies?: number;
  employees?: number;
  pending_requests?: number;
  generated_cards?: number;
}

export interface AdminData {
  companies: Company[];
  requests: CardRequest[];
  templates: Template[];
  companyDesigns: Template[];
  audits: AuditLog[];
  stats: AdminStats;
}

export interface AdminDashboardProps {
  tab: string;
  setTab: (tab: string) => void;
  user?: User | null;
}

/** A row of any admin list (company, card request or audit entry); only the fields each tab uses are read. */
type Row = Partial<Company & CardRequest & AuditLog>;
type Review = Partial<Company & CardRequest> & { id: number; kind: string };
type Tone = 'violet' | 'cyan' | 'amber' | 'green';

const accentTone: Record<Tone, string> = { violet: 'bg-[#7c4be3]', cyan: 'bg-[#2bbbc4]', amber: 'bg-[#efb53e]', green: 'bg-[#47ae80]' };
const skeletonBlock = 'bg-[linear-gradient(90deg,#e3e8e6,#f6f8f7,#e3e8e6)] bg-[length:200%_100%] animate-[skeleton_1.4s_infinite] rounded-[28px]';
const smallMuted = 'mt-1 block text-3xs text-[#7c8a90]';
const rowIcon = 'grid size-9 place-items-center rounded-xl text-xs';
const timeClass = 'text-3xs text-[#9c95a2]';
const miniSmall = 'mt-1 block text-3xs text-[#7c8a90]';
const headerCell = cx(thClass, 'max-md:p-3.5');
const bodyCell = cx(tdClass, 'max-md:p-3.5');
const noteTitle = 'text-xs font-extrabold';
const stepCircle = 'grid size-7.5 flex-none place-items-center rounded-full border text-3xs font-extrabold';

function Kicker({ children, light }: { children: ReactNode; light?: boolean }) {
  return <span className={cx('mb-1.75 block text-3xs font-black tracking-2xl', light ? 'text-cyan' : 'text-[#4a1ff2]')}>{children}</span>;
}

function PanelTitle({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return <div><Kicker>{kicker}</Kicker><h2 className="text-lg font-extrabold tracking-tighter">{title}</h2>{note && <p className="mt-1.25 text-xs text-[#7c8a90]">{note}</p>}</div>;
}

function StatCard({ label, value, note, tone }: { label: string; value: number; note: string; tone: Tone }) {
  return <article className="relative min-h-34 overflow-hidden rounded-[28px] border border-[#e3e8e6] bg-white p-5.5 shadow-md transition-[transform,box-shadow] duration-200 hover:-translate-y-0.75 hover:shadow-lg max-sm:min-h-30 max-sm:p-4.25"><div className={cx('absolute left-0 top-0 h-1 w-full', accentTone[tone])} /><p className="text-xs font-semibold text-[#756f80]">{label}</p><strong className="mt-4.25 block overflow-hidden text-ellipsis whitespace-nowrap text-3xl font-extrabold leading-none tracking-tighter">{value}</strong><small className="mt-2.5 block text-2xs text-[#7c8a90]">{note}</small></article>;
}

function MiniEmpty({ icon, title, note }: { icon?: string; title: string; note?: string }) {
  return <div className="grid min-h-67.5 place-items-center content-center p-7.5 text-center">{icon && <span className="mb-3.5 grid size-14.5 rotate-[-4deg] place-items-center rounded-[28px] bg-[#e9e5fb] text-2xl text-[#6330c4]">{icon}</span>}<p className="text-sm font-bold text-[#4e4856]">{title}</p>{note && <small className="mt-2 text-2xs text-[#766e80]">{note}</small>}</div>;
}

function Empty() {
  return <div className="grid min-h-90 place-items-center content-center p-8.5 text-center"><span className="mb-5 grid size-18 rotate-[-5deg] place-items-center rounded-[40px] bg-[linear-gradient(145deg,#e9e5fb,#e9e5fb)] text-3xl text-[#6734c5]">⌕</span><h3 className="text-lg font-extrabold text-[#3d3745]">Nothing matches this view</h3><p className="mt-2 max-w-90 text-xs leading-relaxed text-[#7c8a90]">Try another search or status filter.</p></div>;
}

function ReviewField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-2xs uppercase tracking-widest text-[#8b90a3]">{label}</dt><dd className="mt-1.5 text-sm font-semibold [overflow-wrap:anywhere]">{children}</dd></div>;
}

function TimelineStep({ done, mark, title, note, line }: { done: boolean; mark: string; title: string; note: string; line?: boolean }) {
  return <div className="flex min-h-15.5 flex-none items-start"><span className={cx(stepCircle, done ? 'border-[#b8e2ce] bg-[#e9f8f0] text-[#20805a]' : 'border-[#e3e8e6] bg-white text-[#7c8a90]')}>{mark}</span>{line && <i className="-ml-3.75 mt-7.5 h-8 w-px flex-none bg-[#e3e8e6]" />}<p className="ml-2 min-w-26"><strong className="block text-2xs">{title}</strong><small className="mt-1 block text-3xs text-[#7c8a90]">{note}</small></p></div>;
}

export default function AdminDashboard({ tab, setTab }: AdminDashboardProps) {
  const [data, setData] = useState<AdminData>({ companies: [], requests: [], templates: [], companyDesigns: [], audits: [], stats: {} });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [review, setReview] = useState<Review | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [companies, requests, templates, audits, stats, companyDesigns] = await Promise.all([
        api<Company[]>('/admin/companies'), api<CardRequest[]>('/admin/card-requests'), api<Template[]>('/admin/templates'), api<AuditLog[]>('/admin/audit-logs'), api<AdminStats>('/admin/stats'), api<Template[]>('/admin/templates/company-designs'),
      ]);
      setData({ companies, requests, templates, audits, stats, companyDesigns });
    } catch (requestError) { setError((requestError as ApiError).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(''); setStatus('ALL'); }, [tab]);

  async function mutate(path: string, body: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(body) });
      setReview(null); setMessage('The decision was saved successfully.'); await load();
    } catch (requestError) { setError((requestError as ApiError).message); }
    finally { setBusy(false); }
  }

  async function saveDesign(id: number) {
    setBusy(true); setError('');
    try {
      await api(`/admin/templates/${id}/save`, { method: 'POST' });
      setMessage('Design saved to the shared template collection.'); await load();
    } catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  }

  function open(item: Row, kind: string = tab) { setReview({ ...item, id: item.id as number, kind }); setReason(''); setError(''); }

  const source = (tab === 'audit' ? data.audits : (data as unknown as Record<string, Row[] | undefined>)[tab] || []) as Row[];
  const visible = useMemo(() => source.filter(item => {
    const statusMatch = status === 'ALL' || item.status === status;
    const text = JSON.stringify([item.action, item.details, item.name, item.company?.name, item.created_by?.username, item.admins?.map(admin => admin.email), item.id]).toLowerCase();
    return statusMatch && text.includes(search.toLowerCase());
  }), [source, status, search]);

  if (loading) return <div className="grid grid-cols-4 gap-4 max-md:grid-cols-2"><i className={cx(skeletonBlock, 'h-32.5')} /><i className={cx(skeletonBlock, 'h-32.5')} /><i className={cx(skeletonBlock, 'h-32.5')} /><div className={cx(skeletonBlock, 'col-span-full h-90')} /></div>;

  const pendingCompanies = data.companies.filter(item => item.status === 'PENDING');
  const pendingRequests = data.requests.filter(item => item.status === 'PENDING');
  const attention = [
    ...pendingCompanies.map(item => ({ ...item, queueKind: 'companies', queueLabel: 'Company review', queueName: item.name, queueMeta: item.admins?.[0]?.email })),
    ...pendingRequests.map(item => ({ ...item, queueKind: 'requests', queueLabel: 'Card request', queueName: item.company?.name, queueMeta: `${item.items.length} card${item.items.length === 1 ? '' : 's'}` })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const cards: Array<[string, number, string, Tone]> = [
    ['Registered companies', data.stats.companies || 0, `${pendingCompanies.length} awaiting review`, 'violet'],
    ['Active employees', data.stats.employees || 0, 'Across approved workspaces', 'cyan'],
    ['Pending requests', data.stats.pending_requests || 0, 'Ready for a decision', 'amber'],
    ['Generated cards', data.stats.generated_cards || 0, 'Issued and traceable', 'green'],
  ];
  const attentionRow = 'grid w-full grid-cols-[calc(var(--spacing)*9.5)_1fr_calc(var(--spacing)*32.5)_calc(var(--spacing)*15)] items-center gap-3 border-t border-[#e3e8e6] px-5 py-3.5 text-left transition-colors duration-200 hover:bg-[#f6f8f7] max-md:grid-cols-[calc(var(--spacing)*9.5)_1fr_auto]';
  const reviewItems = review?.items ?? [];

  return <>
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

    {tab === 'overview' && <div className="grid gap-5.5">
      <section className="relative flex min-h-52.5 items-center justify-between gap-7.5 overflow-hidden rounded-[40px] bg-[linear-gradient(#10242f,#10242f)] p-9.5 text-white shadow-xl after:absolute after:-top-25 after:right-[24%] after:text-[calc(var(--spacing)*70)] after:text-[#ffffff0b] after:content-['✦'] max-md:flex-col max-md:items-start max-md:p-7"><div className="relative z-[1]"><Kicker light>SYSTEM CONTROL</Kicker><h2 className="text-4xl font-extrabold tracking-tighter">Keep every workspace moving.</h2><p className="mt-3 max-w-137.5 text-xs leading-relaxed text-[#d5c9ec]">Review the oldest submissions first, protect brand standards and keep companies informed.</p></div><div className="relative z-[1] flex items-center gap-3.5 rounded-[28px] border border-[#ffffff20] bg-[#ffffff0e] px-5 py-4.25 max-md:self-stretch"><span className="text-4xl font-black text-sun">{attention.length}</span><p className="mt-3 max-w-137.5 text-2xs leading-snug text-[#e4dbf5]">items need<br />your attention</p></div></section>
      <div className="grid grid-cols-4 gap-3.5 max-md:grid-cols-2">{cards.map(([label, value, note, tone]) => <StatCard key={label} label={label} value={value} note={note} tone={tone} />)}</div>
      <div className="grid grid-cols-[1.2fr_.8fr] gap-4.5 max-lg:grid-cols-1">
        <Panel className="min-h-100"><PanelHeader className="max-sm:p-4.5"><PanelTitle kicker="PRIORITY QUEUE" title="Needs your attention" note="Oldest pending submissions appear first." /><Button variant="quiet" onClick={load}>Refresh</Button></PanelHeader>{attention.slice(0, 6).map(item => <button className={attentionRow} key={`${item.queueKind}-${item.id}`} onClick={() => open(item, item.queueKind)}><span className={cx(rowIcon, item.queueKind === 'companies' ? 'bg-[#e9e5fb] text-[#6330c2]' : 'bg-[#ddf7f8] text-[#16868d]')}>{item.queueKind === 'companies' ? '▦' : '▤'}</span><div><strong className="block text-xs text-[#393341]">{item.queueName}</strong><small className={miniSmall}>{item.queueLabel} · {item.queueMeta}</small></div><time className={cx(timeClass, 'max-md:hidden')}>{formatDate(item.created_at)}</time><b className="text-3xs text-[#6630c4]">Review →</b></button>)}{!attention.length && <MiniEmpty icon="✓" title="Everything is up to date." note="No company or card request is waiting." />}</Panel>
        <Panel className="min-h-100"><PanelHeader className="max-sm:p-4.5"><PanelTitle kicker="SYSTEM ACTIVITY" title="Recent decisions" /><Button variant="quiet" onClick={() => setTab('audit')}>Audit log</Button></PanelHeader>{data.audits.slice(0, 6).map(item => <div className="grid grid-cols-[calc(var(--spacing)*7)_1fr_calc(var(--spacing)*25)] items-center gap-2.5 border-t border-[#e3e8e6] px-4.5 py-3.25" key={item.id}><span className="grid size-7 place-items-center rounded-full bg-[#e8f8f0] text-3xs text-[#27815e]">✓</span><div><strong className="block text-3xs capitalize">{item.action.replaceAll('_', ' ')}</strong><small className={miniSmall}>{item.details || `${item.entity_type} #${item.entity_id}`}</small></div><time className={timeClass}>{formatDate(item.created_at)}</time></div>)}{!data.audits.length && <MiniEmpty title="No activity recorded yet." />}</Panel>
      </div>
    </div>}

    {tab !== 'overview' && <Panel>
      <PanelHeader className="max-sm:p-4.5"><PanelTitle kicker={tab === 'companies' ? 'WORKSPACE ACCESS' : tab === 'requests' ? 'CARD DELIVERY' : tab === 'templates' ? 'DESIGN SYSTEM' : 'SYSTEM HISTORY'} title={tab === 'companies' ? 'Company directory' : tab === 'requests' ? 'Card review queue' : tab === 'templates' ? 'Template collection' : 'Administrative activity'} note={tab === 'audit' ? 'A traceable record of important decisions and data changes.' : tab === 'templates' ? 'Curated layouts for a consistent company identity.' : 'Open a submission to inspect full context before deciding.'} />{tab !== 'templates' && <div className="flex flex-wrap gap-2"><div className="flex min-w-60 items-center rounded-xl border border-[#e3e8e6] bg-white px-2.75 transition-all duration-200 focus-within:border-[#8a5edf] focus-within:ring-3 focus-within:ring-[#e9e5fb] max-sm:w-full max-sm:min-w-0"><span className="text-lg text-[#958d9e]">⌕</span><input className="w-full bg-transparent px-2 py-2.25 text-xs outline-none" aria-label="Search records" placeholder="Search…" value={search} onChange={event => setSearch(event.target.value)} /></div>{tab !== 'audit' && <select className={cx(inputClass, inputCompactClass)} value={status} onChange={event => setStatus(event.target.value)}>{['ALL', 'PENDING', 'APPROVED', 'REJECTED', ...(tab === 'companies' ? ['SUSPENDED'] : ['COMPLETED', 'PROCESSING', 'FAILED'])].map(value => <option key={value}>{value}</option>)}</select>}</div>}</PanelHeader>

      {tab === 'templates' ? <AdminTemplateCollection data={data} busy={busy} onSave={saveDesign} onToggle={template => mutate(`/admin/templates/${template.id}`, { is_active: !template.is_active })} /> :
      tab === 'audit' ? <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={headerCell}>Activity</th><th className={headerCell}>Entity</th><th className={headerCell}>Company</th><th className={headerCell}>Details</th><th className={headerCell}>Date</th></tr></thead><tbody>{visible.map(item => <tr className="hover:bg-[#f6f8f7]" key={item.id}><td className={bodyCell}><strong className="capitalize">{item.action?.replaceAll('_', ' ')}</strong></td><td className={bodyCell}>{item.entity_type} #{item.entity_id}</td><td className={bodyCell}>{item.company_id ? `#${item.company_id}` : 'System'}</td><td className={cx(bodyCell, 'max-w-xs text-slate-500')}>{item.details || '—'}</td><td className={bodyCell}>{formatDate(item.created_at)}</td></tr>)}</tbody></table>{!visible.length && <Empty />}</div> :
      <div className="overflow-x-auto"><table className={tableClass}><thead><tr><th className={headerCell}>{tab === 'companies' ? 'Company' : 'Request / company'}</th><th className={headerCell}>Submitted by</th><th className={headerCell}>Date</th><th className={headerCell}>Status</th><th className={headerCell}>Action</th></tr></thead><tbody>{visible.map(item => { const owner = tab === 'companies' ? item.admins?.[0] : item.created_by; return <tr className="hover:bg-[#f6f8f7]" key={item.id}><td className={bodyCell}><div className="flex items-center gap-2.75"><span className="grid size-9 flex-none place-items-center rounded-xl bg-[linear-gradient(145deg,#e9e5fb,#e9e5fb)] text-2xs font-extrabold text-[#6130bd]">{tab === 'companies' ? item.name?.charAt(0) : '▤'}</span><div><strong className="block">{tab === 'companies' ? item.name : item.company?.name}</strong><small className={smallMuted}>{tab === 'companies' ? `Company #${item.id}` : `Request #${item.id} · ${item.items?.length} cards`}</small></div></div></td><td className={bodyCell}><p>{owner?.username || 'Not available'}</p><small className={smallMuted}>{owner?.email}</small></td><td className={cx(bodyCell, 'text-slate-500')}>{formatDate(item.created_at)}</td><td className={bodyCell}><StatusBadge value={item.status ?? ''} /></td><td className={bodyCell}><button className="rounded-lg bg-[#f6f8f7] px-2.25 py-1.75 text-3xs font-bold text-[#625a6c] hover:bg-[#e9e5fb] hover:text-[#5928b6]" onClick={() => open(item)}>Review details ↗</button></td></tr>; })}</tbody></table>{!visible.length && <Empty />}</div>}
    </Panel>}

    {review && <ReviewDialog title={review.kind === 'companies' ? review.name : `Card request #${review.id}`} onClose={() => setReview(null)} busy={busy}>
      <div className="mb-4.5 flex items-center gap-3"><StatusBadge value={review.status ?? ''} /><span className="text-3xs text-[#928b98]">Submitted {formatDate(review.created_at)}</span></div>
      <dl className="my-6 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-5.5 rounded-xl bg-[#f6f8f7] p-5.5 max-xs:grid-cols-1"><ReviewField label="Company">{review.name || review.company?.name}</ReviewField><ReviewField label="Submitted">{formatDate(review.created_at)}</ReviewField>{(review.kind === 'companies' ? review.admins || [] : [review.created_by]).filter(Boolean).map(owner => owner && <ReviewField key={owner.id} label={review.kind === 'companies' ? 'Company administrator' : 'Requested by'}>{owner.username}<span className="mt-1 block text-2xs font-normal text-[#8e8795]">{owner.email}</span></ReviewField>)}{review.kind === 'companies' && <><ReviewField label="Phone">{review.phone || 'Not provided'}</ReviewField><ReviewField label="Website">{review.website || 'Not provided'}</ReviewField><ReviewField label="Address">{review.address || 'Not provided'}</ReviewField><ReviewField label="Branding">{review.has_logo ? 'Logo uploaded' : 'No logo yet'}</ReviewField></>}</dl>
      {review.kind === 'companies' && review.description && <div className="rounded-r-xl border-l-3 border-[#7565c8] bg-[#f7f6fd] px-4.5 py-4"><strong>About the company</strong><p className="mt-1.75 text-xs leading-relaxed text-[#6f7483]">{review.description}</p></div>}
      {review.kind === 'requests' && <><div className="mt-5.5 grid grid-cols-2 gap-6 max-md:grid-cols-1"><div><h3 className={cx(noteTitle, 'mb-2.75')}>Selected template · {review.template?.name}</h3><CardPreview design={review.template?.design} style={review.template?.style_key} company={review.company?.name} name={reviewItems[0]?.employee?.name} designation={reviewItems[0]?.employee?.designation} /></div><div><h3 className={cx(noteTitle, 'mb-2.75')}>Request timeline</h3><div className="my-3.75 flex flex-col"><TimelineStep done mark="✓" title="Submitted" note={formatDate(review.created_at)} line /><TimelineStep done={!!review.decided_at} mark={review.decided_at ? '✓' : '2'} title="Administrator decision" note={review.decided_at ? formatDate(review.decided_at) : 'Waiting for you'} line /><TimelineStep done={review.status === 'COMPLETED'} mark={review.status === 'COMPLETED' ? '✓' : '3'} title="Cards generated" note={review.status === 'COMPLETED' ? 'Complete' : 'Waiting'} /></div></div></div><h3 className="mb-3 mt-6 text-sm font-extrabold">Employees included ({reviewItems.length})</h3><div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">{reviewItems.map(item => <div className="flex items-center gap-2.5 rounded-xl border border-[#e3e8e6] p-2.5" key={item.id}><span className="grid size-8 flex-none place-items-center rounded-lg bg-[#e9e5fb] text-2xs font-extrabold text-[#6431c2]">{item.employee.name.charAt(0)}</span><p><strong className="block text-2xs">{item.employee.name}</strong><small className="mt-0.75 block text-3xs text-[#97909d]">{item.employee.employee_id} · {item.employee.designation} · {item.employee.department}</small></p></div>)}</div></>}
      {review.rejection_reason && <div className="my-5 rounded-r-xl border-l-3 border-[#e05d68] bg-[#fff4f5] px-4 py-3.5"><strong className="text-xs text-[#98404a]">Decision note</strong><p className="mt-1.5 text-xs leading-relaxed text-[#8b6267]">{review.rejection_reason}</p></div>}
      {(review.kind === 'companies' || review.status === 'PENDING') && <div className="mt-6 border-t border-[#e3e8e6] pt-5"><label><span className="mb-2 block text-xs font-semibold text-[#4f5566]">Rejection reason</span><textarea className={cx(inputClass, 'min-h-24')} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Required only when rejecting. Explain what must be corrected." /></label><div className="mt-3.5 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={() => setReview(null)}>Cancel</Button><Button variant="danger" disabled={busy || !reason.trim()} onClick={() => mutate(review.kind === 'companies' ? `/admin/companies/${review.id}/status` : `/admin/card-requests/${review.id}/decision`, review.kind === 'companies' ? { status: 'REJECTED', reason: reason.trim() } : { decision: 'REJECTED', reason: reason.trim() })}>Reject</Button>{review.kind === 'companies' && review.status === 'APPROVED' ? <Button variant="danger" disabled={busy} onClick={() => mutate(`/admin/companies/${review.id}/status`, { status: 'SUSPENDED' })}>Suspend company</Button> : <Button variant="primary" disabled={busy} onClick={() => mutate(review.kind === 'companies' ? `/admin/companies/${review.id}/status` : `/admin/card-requests/${review.id}/decision`, review.kind === 'companies' ? { status: 'APPROVED' } : { decision: 'APPROVED' })}>{busy ? 'Saving decision…' : review.kind === 'companies' ? 'Approve company' : 'Approve & generate cards'}</Button>}</div></div>}
    </ReviewDialog>}
  </>;
}
