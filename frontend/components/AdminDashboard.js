'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import ReviewDialog from './ReviewDialog';

const date = value => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function AdminDashboard() {
  const [data, setData] = useState({ companies: [], requests: [], templates: [], audits: [], stats: {} });
  const [tab, setTab] = useState('companies');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setError('');
    try {
      const [companies, requests, templates, audits, stats] = await Promise.all([
        api('/admin/companies'), api('/admin/card-requests'), api('/admin/templates'), api('/admin/audit-logs'), api('/admin/stats'),
      ]);
      setData({ companies, requests, templates, audits, stats });
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function mutate(path, body) {
    setBusy(true); setError(''); setMessage('');
    try { await api(path, { method: 'PATCH', body: JSON.stringify(body) }); setReview(null); setMessage('The change was saved successfully.'); await load(); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  }
  function open(item) { setReview({ ...item, kind: tab }); setReason(''); setError(''); }

  const source = tab === 'audit' ? data.audits : data[tab];
  const visible = source.filter(item => {
    const statusMatch = status === 'ALL' || item.status === status;
    const text = JSON.stringify([item.action, item.details, item.name, item.company?.name, item.created_by?.username, item.admins?.map(admin => admin.email), item.id]).toLowerCase();
    return statusMatch && text.includes(search.toLowerCase());
  });
  const cards = [
    ['Registered companies', data.stats.companies || 0, `${data.stats.pending_companies || 0} awaiting review`],
    ['Active employees', data.stats.employees || 0, 'Across approved workspaces'],
    ['Pending requests', data.stats.pending_requests || 0, 'Ready for a decision'],
    ['Generated cards', data.stats.generated_cards || 0, 'Issued and traceable'],
  ];

  return <>
    <div className="stats-grid">{cards.map(([label, count, note]) => <article className="stat-card" key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-4 text-3xl font-semibold tracking-tight">{count}</p><p className="mt-2 text-xs text-slate-400">{note}</p></article>)}</div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4"><div className="tabs">{[['companies', 'Companies'], ['requests', 'Card requests'], ['templates', 'Templates'], ['audit', 'Audit log']].map(([key, label]) => <button key={key} className={tab === key ? 'tab active' : 'tab'} onClick={() => { setTab(key); setSearch(''); setStatus('ALL'); }}>{label}<span>{key === 'audit' ? data.audits.length : data[key].length}</span></button>)}</div><button className="btn-quiet" disabled={busy} onClick={load}>Refresh</button></div>
    {message && <p role="status" className="notice-success mt-5">{message}</p>}{error && !review && <p role="alert" className="notice-error mt-5">{error}</p>}
    <section className="panel mt-5"><div className="panel-header"><div><h2 className="font-semibold">{tab === 'companies' ? 'Company directory' : tab === 'requests' ? 'Card review queue' : tab === 'templates' ? 'Template collection' : 'Administrative activity'}</h2><p className="mt-1 text-xs text-slate-500">{tab === 'audit' ? 'A traceable record of important decisions and data changes.' : tab === 'templates' ? 'Curated layouts for a consistent company identity.' : 'Open a review to inspect the full submission before deciding.'}</p></div>{tab !== 'templates' && <div className="flex flex-wrap gap-2"><input aria-label="Search records" className="input compact" placeholder="Search…" value={search} onChange={event => setSearch(event.target.value)} />{tab !== 'audit' && <select className="input compact" value={status} onChange={event => setStatus(event.target.value)}>{['ALL', 'PENDING', 'APPROVED', 'REJECTED', ...(tab === 'companies' ? ['SUSPENDED'] : ['COMPLETED', 'PROCESSING', 'FAILED'])].map(value => <option key={value}>{value}</option>)}</select>}</div>}</div>

      {loading ? <div className="skeleton-list">{[1,2,3,4].map(item => <i key={item} />)}</div> :
      tab === 'templates' ? <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">{data.templates.map(template => <article className="template-option" key={template.id}><CardPreview style={template.style_key} /><div className="mt-5 flex justify-between"><h3 className="font-semibold">{template.name}</h3><StatusBadge value={template.is_active ? 'ACTIVE' : 'INACTIVE'} /></div><p className="mt-2 text-sm text-slate-500">{template.description}</p><button className="btn-secondary mt-4 w-full" disabled={busy} onClick={() => mutate(`/admin/templates/${template.id}`, { is_active: !template.is_active })}>{template.is_active ? 'Deactivate template' : 'Activate template'}</button></article>)}</div> :
      tab === 'audit' ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Activity</th><th>Entity</th><th>Company</th><th>Details</th><th>Date</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong>{item.action.replaceAll('_', ' ')}</strong></td><td>{item.entity_type} #{item.entity_id}</td><td>{item.company_id ? `#${item.company_id}` : 'System'}</td><td className="max-w-xs text-slate-500">{item.details || '—'}</td><td>{date(item.created_at)}</td></tr>)}</tbody></table>{!visible.length && <Empty />}</div> :
      <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>{tab === 'companies' ? 'Company' : 'Request / company'}</th><th>Submitted by</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map(item => { const owner = tab === 'companies' ? item.admins?.[0] : item.created_by; return <tr key={item.id}><td><p className="font-semibold">{tab === 'companies' ? item.name : item.company?.name}</p><p className="mt-1 text-xs text-slate-400">{tab === 'companies' ? `Company #${item.id}` : `Request #${item.id} · ${item.items.length} cards`}</p></td><td><p>{owner?.username || 'Not available'}</p><p className="mt-1 text-xs text-slate-400">{owner?.email}</p></td><td className="text-slate-500">{date(item.created_at)}</td><td><StatusBadge value={item.status} /></td><td><button className="btn-secondary" onClick={() => open(item)}>Review details ↗</button></td></tr>; })}</tbody></table>{!visible.length && <Empty />}</div>}
    </section>

    {review && <ReviewDialog title={review.kind === 'companies' ? review.name : `Card request #${review.id}`} onClose={() => setReview(null)} busy={busy}>
      <StatusBadge value={review.status} /><dl className="review-grid"><div><dt>Company</dt><dd>{review.name || review.company?.name}</dd></div><div><dt>Submitted</dt><dd>{date(review.created_at)}</dd></div>{(review.kind === 'companies' ? review.admins || [] : [review.created_by]).filter(Boolean).map(owner => <div key={owner.id}><dt>{review.kind === 'companies' ? 'Company administrator' : 'Requested by'}</dt><dd>{owner.username}<span className="mt-1 block text-sm font-normal text-slate-500">{owner.email}</span></dd></div>)}{review.kind === 'companies' && <><div><dt>Phone</dt><dd>{review.phone || 'Not provided'}</dd></div><div><dt>Website</dt><dd>{review.website || 'Not provided'}</dd></div><div><dt>Address</dt><dd>{review.address || 'Not provided'}</dd></div><div><dt>Branding</dt><dd>{review.has_logo ? 'Logo uploaded' : 'No logo yet'}</dd></div></>}</dl>
      {review.kind === 'companies' && review.description && <div className="review-note"><strong>About the company</strong><p>{review.description}</p></div>}
      {review.kind === 'requests' && <><h3 className="mb-3 font-semibold">Selected template · {review.template?.name}</h3><div className="max-w-sm"><CardPreview style={review.template?.style_key} company={review.company?.name} name={review.items[0]?.employee?.name} designation={review.items[0]?.employee?.designation} /></div><p className="mt-2 text-xs text-slate-400">Generated PDFs include the company branding, employee photo where available, and a unique verification QR.</p><h3 className="mt-6 mb-2 font-semibold">Employees included ({review.items.length})</h3><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Employee</th><th>Designation / department</th><th>Contact</th></tr></thead><tbody>{review.items.map(item => <tr key={item.id}><td>{item.employee.name}<p className="text-xs text-slate-400">{item.employee.employee_id}{item.employee.has_photo ? ' · Photo ready' : ''}</p></td><td>{item.employee.designation}<p className="text-xs text-slate-400">{item.employee.department}</p></td><td>{item.employee.email}<p className="text-xs text-slate-400">{item.employee.phone}</p></td></tr>)}</tbody></table></div></>}
      {review.rejection_reason && <p className="notice-error mt-4">{review.rejection_reason}</p>}{error && <p role="alert" className="notice-error mt-4">{error}</p>}
      {(review.kind === 'companies' || review.status === 'PENDING') && <div className="mt-6 border-t border-slate-100 pt-5"><label className="block text-sm font-medium">Rejection reason<textarea className="input mt-2 min-h-24" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Required when rejecting. Explain what needs to be corrected." /></label><div className="mt-4 flex flex-wrap justify-end gap-2"><button className="btn-secondary" disabled={busy} onClick={() => setReview(null)}>Cancel</button><button className="btn-danger" disabled={busy || !reason.trim()} onClick={() => mutate(review.kind === 'companies' ? `/admin/companies/${review.id}/status` : `/admin/card-requests/${review.id}/decision`, review.kind === 'companies' ? { status: 'REJECTED', reason: reason.trim() } : { decision: 'REJECTED', reason: reason.trim() })}>Reject</button>{review.kind === 'companies' && review.status === 'APPROVED' ? <button className="btn-danger" disabled={busy} onClick={() => mutate(`/admin/companies/${review.id}/status`, { status: 'SUSPENDED' })}>Suspend company</button> : <button className="btn-primary" disabled={busy} onClick={() => mutate(review.kind === 'companies' ? `/admin/companies/${review.id}/status` : `/admin/card-requests/${review.id}/decision`, review.kind === 'companies' ? { status: 'APPROVED' } : { decision: 'APPROVED' })}>{busy ? 'Saving decision…' : review.kind === 'companies' ? 'Approve company' : 'Approve & generate cards'}</button>}</div></div>}
    </ReviewDialog>}
  </>;
}

function Empty() {
  return <div className="empty-state"><p className="text-lg font-semibold text-slate-700">Nothing matches this view.</p><p className="mt-2">Try another filter or refresh for new submissions.</p></div>;
}
