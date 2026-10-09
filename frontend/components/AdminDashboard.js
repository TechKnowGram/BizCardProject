'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import CardPreview from './CardPreview';
import ReviewDialog from './ReviewDialog';
import Toast from './Toast';
import AdminTemplateCollection from './AdminTemplateCollection';

const formatDate = value => value ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not available';

function StatCard({ label, value, note, tone }) {
  return <article className={`stat-card stat-${tone}`}><div className="stat-accent" /><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

export default function AdminDashboard({ tab, setTab }) {
  const [data, setData] = useState({ companies: [], requests: [], templates: [], companyDesigns: [], audits: [], stats: {} });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const [companies, requests, templates, audits, stats, companyDesigns] = await Promise.all([
        api('/admin/companies'), api('/admin/card-requests'), api('/admin/templates'), api('/admin/audit-logs'), api('/admin/stats'), api('/admin/templates/company-designs'),
      ]);
      setData({ companies, requests, templates, audits, stats, companyDesigns });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSearch(''); setStatus('ALL'); }, [tab]);

  async function mutate(path, body) {
    setBusy(true); setError('');
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify(body) });
      setReview(null); setMessage('The decision was saved successfully.'); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function saveDesign(id) {
    setBusy(true); setError('');
    try {
      await api(`/admin/templates/${id}/save`, { method: 'POST' });
      setMessage('Design saved to the shared template collection.'); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function open(item, kind = tab) { setReview({ ...item, kind }); setReason(''); setError(''); }

  const source = tab === 'audit' ? data.audits : data[tab] || [];
  const visible = useMemo(() => source.filter(item => {
    const statusMatch = status === 'ALL' || item.status === status;
    const text = JSON.stringify([item.action, item.details, item.name, item.company?.name, item.created_by?.username, item.admins?.map(admin => admin.email), item.id]).toLowerCase();
    return statusMatch && text.includes(search.toLowerCase());
  }), [source, status, search]);

  if (loading) return <div className="dashboard-skeleton"><i /><i /><i /><div /></div>;

  const pendingCompanies = data.companies.filter(item => item.status === 'PENDING');
  const pendingRequests = data.requests.filter(item => item.status === 'PENDING');
  const attention = [
    ...pendingCompanies.map(item => ({ ...item, queueKind: 'companies', queueLabel: 'Company review', queueName: item.name, queueMeta: item.admins?.[0]?.email })),
    ...pendingRequests.map(item => ({ ...item, queueKind: 'requests', queueLabel: 'Card request', queueName: item.company?.name, queueMeta: `${item.items.length} card${item.items.length === 1 ? '' : 's'}` })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const cards = [
    ['Registered companies', data.stats.companies || 0, `${pendingCompanies.length} awaiting review`, 'violet'],
    ['Active employees', data.stats.employees || 0, 'Across approved workspaces', 'cyan'],
    ['Pending requests', data.stats.pending_requests || 0, 'Ready for a decision', 'amber'],
    ['Generated cards', data.stats.generated_cards || 0, 'Issued and traceable', 'green'],
  ];

  return <>
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />

    {tab === 'overview' && <div className="dashboard-overview">
      <section className="admin-hero"><div><span className="panel-kicker">SYSTEM CONTROL</span><h2>Keep every workspace moving.</h2><p>Review the oldest submissions first, protect brand standards and keep companies informed.</p></div><div className="attention-total"><span>{attention.length}</span><p>items need<br />your attention</p></div></section>
      <div className="stats-grid">{cards.map(([label, value, note, tone]) => <StatCard key={label} label={label} value={value} note={note} tone={tone} />)}</div>
      <div className="overview-grid admin-overview-grid">
        <section className="panel attention-panel"><div className="panel-header"><div><span className="panel-kicker">PRIORITY QUEUE</span><h2>Needs your attention</h2><p>Oldest pending submissions appear first.</p></div><button className="btn-quiet" onClick={load}>Refresh</button></div>{attention.slice(0, 6).map(item => <button className="attention-row" key={`${item.queueKind}-${item.id}`} onClick={() => open(item, item.queueKind)}><span className={item.queueKind === 'companies' ? 'queue-company' : 'queue-request'}>{item.queueKind === 'companies' ? '▦' : '▤'}</span><div><strong>{item.queueName}</strong><small>{item.queueLabel} · {item.queueMeta}</small></div><time>{formatDate(item.created_at)}</time><b>Review →</b></button>)}{!attention.length && <div className="mini-empty"><span>✓</span><p>Everything is up to date.</p><small>No company or card request is waiting.</small></div>}</section>
        <section className="panel recent-panel"><div className="panel-header"><div><span className="panel-kicker">SYSTEM ACTIVITY</span><h2>Recent decisions</h2></div><button className="btn-quiet" onClick={() => setTab('audit')}>Audit log</button></div>{data.audits.slice(0, 6).map(item => <div className="audit-mini" key={item.id}><span>✓</span><div><strong>{item.action.replaceAll('_', ' ')}</strong><small>{item.details || `${item.entity_type} #${item.entity_id}`}</small></div><time>{formatDate(item.created_at)}</time></div>)}{!data.audits.length && <div className="mini-empty"><p>No activity recorded yet.</p></div>}</section>
      </div>
    </div>}

    {tab !== 'overview' && <section className="panel">
      <div className="panel-header"><div><span className="panel-kicker">{tab === 'companies' ? 'WORKSPACE ACCESS' : tab === 'requests' ? 'CARD DELIVERY' : tab === 'templates' ? 'DESIGN SYSTEM' : 'SYSTEM HISTORY'}</span><h2>{tab === 'companies' ? 'Company directory' : tab === 'requests' ? 'Card review queue' : tab === 'templates' ? 'Template collection' : 'Administrative activity'}</h2><p>{tab === 'audit' ? 'A traceable record of important decisions and data changes.' : tab === 'templates' ? 'Curated layouts for a consistent company identity.' : 'Open a submission to inspect full context before deciding.'}</p></div>{tab !== 'templates' && <div className="flex flex-wrap gap-2"><div className="search-field"><span>⌕</span><input aria-label="Search records" placeholder="Search…" value={search} onChange={event => setSearch(event.target.value)} /></div>{tab !== 'audit' && <select className="input compact" value={status} onChange={event => setStatus(event.target.value)}>{['ALL', 'PENDING', 'APPROVED', 'REJECTED', ...(tab === 'companies' ? ['SUSPENDED'] : ['COMPLETED', 'PROCESSING', 'FAILED'])].map(value => <option key={value}>{value}</option>)}</select>}</div>}</div>

      {tab === 'templates' ? <AdminTemplateCollection data={data} busy={busy} onSave={saveDesign} onToggle={template => mutate(`/admin/templates/${template.id}`, { is_active: !template.is_active })} /> :
      tab === 'audit' ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Activity</th><th>Entity</th><th>Company</th><th>Details</th><th>Date</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong className="audit-action">{item.action.replaceAll('_', ' ')}</strong></td><td>{item.entity_type} #{item.entity_id}</td><td>{item.company_id ? `#${item.company_id}` : 'System'}</td><td className="max-w-xs text-slate-500">{item.details || '—'}</td><td>{formatDate(item.created_at)}</td></tr>)}</tbody></table>{!visible.length && <Empty />}</div> :
      <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>{tab === 'companies' ? 'Company' : 'Request / company'}</th><th>Submitted by</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map(item => { const owner = tab === 'companies' ? item.admins?.[0] : item.created_by; return <tr key={item.id}><td><div className="entity-cell"><span>{tab === 'companies' ? item.name.charAt(0) : '▤'}</span><div><strong>{tab === 'companies' ? item.name : item.company?.name}</strong><small>{tab === 'companies' ? `Company #${item.id}` : `Request #${item.id} · ${item.items.length} cards`}</small></div></div></td><td><p>{owner?.username || 'Not available'}</p><small>{owner?.email}</small></td><td className="text-slate-500">{formatDate(item.created_at)}</td><td><StatusBadge value={item.status} /></td><td><button className="table-action" onClick={() => open(item)}>Review details ↗</button></td></tr>; })}</tbody></table>{!visible.length && <Empty />}</div>}
    </section>}

    {review && <ReviewDialog title={review.kind === 'companies' ? review.name : `Card request #${review.id}`} onClose={() => setReview(null)} busy={busy}>
      <div className="review-status-line"><StatusBadge value={review.status} /><span>Submitted {formatDate(review.created_at)}</span></div>
      <dl className="review-grid"><div><dt>Company</dt><dd>{review.name || review.company?.name}</dd></div><div><dt>Submitted</dt><dd>{formatDate(review.created_at)}</dd></div>{(review.kind === 'companies' ? review.admins || [] : [review.created_by]).filter(Boolean).map(owner => <div key={owner.id}><dt>{review.kind === 'companies' ? 'Company administrator' : 'Requested by'}</dt><dd>{owner.username}<span>{owner.email}</span></dd></div>)}{review.kind === 'companies' && <><div><dt>Phone</dt><dd>{review.phone || 'Not provided'}</dd></div><div><dt>Website</dt><dd>{review.website || 'Not provided'}</dd></div><div><dt>Address</dt><dd>{review.address || 'Not provided'}</dd></div><div><dt>Branding</dt><dd>{review.has_logo ? 'Logo uploaded' : 'No logo yet'}</dd></div></>}</dl>
      {review.kind === 'companies' && review.description && <div className="review-note"><strong>About the company</strong><p>{review.description}</p></div>}
      {review.kind === 'requests' && <><div className="request-review-layout"><div><h3>Selected template · {review.template?.name}</h3><CardPreview design={review.template?.design} style={review.template?.style_key} company={review.company?.name} name={review.items[0]?.employee?.name} designation={review.items[0]?.employee?.designation} /></div><div><h3>Request timeline</h3><div className="request-timeline compact"><div className="done"><span>✓</span><i /><p><strong>Submitted</strong><small>{formatDate(review.created_at)}</small></p></div><div className={review.decided_at ? 'done' : ''}><span>{review.decided_at ? '✓' : '2'}</span><i /><p><strong>Administrator decision</strong><small>{review.decided_at ? formatDate(review.decided_at) : 'Waiting for you'}</small></p></div><div className={review.status === 'COMPLETED' ? 'done' : ''}><span>{review.status === 'COMPLETED' ? '✓' : '3'}</span><p><strong>Cards generated</strong><small>{review.status === 'COMPLETED' ? 'Complete' : 'Waiting'}</small></p></div></div></div></div><h3 className="detail-heading">Employees included ({review.items.length})</h3><div className="request-people">{review.items.map(item => <div key={item.id}><span>{item.employee.name.charAt(0)}</span><p><strong>{item.employee.name}</strong><small>{item.employee.employee_id} · {item.employee.designation} · {item.employee.department}</small></p></div>)}</div></>}
      {review.rejection_reason && <div className="decision-note"><strong>Decision note</strong><p>{review.rejection_reason}</p></div>}
      {(review.kind === 'companies' || review.status === 'PENDING') && <div className="decision-box"><label><span className="field-label">Rejection reason</span><textarea className="input min-h-24" maxLength={500} value={reason} onChange={event => setReason(event.target.value)} placeholder="Required only when rejecting. Explain what must be corrected." /></label><div><button className="btn-secondary" disabled={busy} onClick={() => setReview(null)}>Cancel</button><button className="btn-danger" disabled={busy || !reason.trim()} onClick={() => mutate(review.kind === 'companies' ? `/admin/companies/${review.id}/status` : `/admin/card-requests/${review.id}/decision`, review.kind === 'companies' ? { status: 'REJECTED', reason: reason.trim() } : { decision: 'REJECTED', reason: reason.trim() })}>Reject</button>{review.kind === 'companies' && review.status === 'APPROVED' ? <button className="btn-danger" disabled={busy} onClick={() => mutate(`/admin/companies/${review.id}/status`, { status: 'SUSPENDED' })}>Suspend company</button> : <button className="btn-primary" disabled={busy} onClick={() => mutate(review.kind === 'companies' ? `/admin/companies/${review.id}/status` : `/admin/card-requests/${review.id}/decision`, review.kind === 'companies' ? { status: 'APPROVED' } : { decision: 'APPROVED' })}>{busy ? 'Saving decision…' : review.kind === 'companies' ? 'Approve company' : 'Approve & generate cards'}</button>}</div></div>}
    </ReviewDialog>}
  </>;
}

function Empty() {
  return <div className="premium-empty"><span>⌕</span><h3>Nothing matches this view</h3><p>Try another search or status filter.</p></div>;
}
