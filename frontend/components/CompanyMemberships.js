'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import Toast from './Toast';

const MATCH_LABELS = {
  ROSTER_MATCHED: { label: 'Roster verified', tone: 'text-emerald-700 bg-emerald-50' },
  ID_MISMATCH: { label: 'Email mismatch', tone: 'text-amber-700 bg-amber-50' },
  NOT_FOUND: { label: 'Not in roster', tone: 'text-orange-700 bg-orange-50' },
  INACTIVE_EMPLOYEE: { label: 'Inactive in roster', tone: 'text-red-700 bg-red-50' },
};

function MatchBadge({ value }) {
  const info = MATCH_LABELS[value];
  if (!info) return null;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.tone}`}>{info.label}</span>;
}

export default function CompanyMemberships() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');

  async function load() {
    try { setRows(await api('/company/memberships')); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  async function decide(id, decision) {
    setBusy(true); setError('');
    try {
      await api(`/company/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ decision }) });
      setMessage(`Membership ${decision.toLowerCase()} successfully.`);
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const filtered = filter === 'ALL' ? rows : rows.filter(r => r.status === filter);
  const pendingCount = rows.filter(r => r.status === 'PENDING').length;

  return <section className="panel">
    <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
    <div className="panel-header">
      <div>
        <span className="panel-kicker">TEAM ACCESS</span>
        <h2>Employee requests {pendingCount > 0 && <span className="inline-flex ml-2 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-sm font-medium">{pendingCount} pending</span>}</h2>
        <p>Review and decide on employee membership requests. Approved employees can use company branding and templates.</p>
      </div>
      <select className="input compact" value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="ALL">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="REVOKED">Revoked</option>
        <option value="PRE_APPROVED">Pre-approved</option>
      </select>
    </div>
    {filtered.length ? <div className="overflow-x-auto"><table className="data-table">
      <thead><tr>
        <th>Employee</th>
        <th>Submitted details</th>
        <th>Verification</th>
        <th>Status</th>
        <th>Date</th>
        <th>Actions</th>
      </tr></thead>
      <tbody>{filtered.map(row => <tr key={row.id}>
        <td>
          <div className="employee-cell">
            <span className="employee-avatar">{(row.user?.username || 'E').split(' ').map(p => p[0]).slice(0,2).join('')}</span>
            <div>
              <strong>{row.user?.username || 'Unlinked'}</strong>
              <small>{row.user?.email || '—'}</small>
            </div>
          </div>
        </td>
        <td>
          <div><small className="text-slate-500">Employee ID:</small> <strong>{row.employee_code || '—'}</strong></div>
          <div><small className="text-slate-500">Official email:</small> {row.official_email || '—'}</div>
          <div><small className="text-slate-500">Payer:</small> {row.payer}</div>
        </td>
        <td><MatchBadge value={row.match_status} /></td>
        <td><StatusBadge value={row.status} /></td>
        <td><small>{row.requested_at ? new Date(row.requested_at).toLocaleDateString() : '—'}</small></td>
        <td>
          <div className="row-actions">
            {row.status === 'PENDING' && <>
              <button className="btn-primary" disabled={busy} onClick={() => decide(row.id, 'APPROVED')}>Approve</button>
              <button className="btn-secondary" disabled={busy} onClick={() => decide(row.id, 'REJECTED')}>Reject</button>
            </>}
            {row.status === 'APPROVED' && <button className="btn-danger" disabled={busy} onClick={() => decide(row.id, 'REVOKED')}>Revoke</button>}
          </div>
        </td>
      </tr>)}</tbody>
    </table></div> : <div className="premium-empty"><span>♙</span><h3>{filter === 'ALL' ? 'No membership requests yet' : `No ${filter.toLowerCase()} requests`}</h3><p>When employees request to join your company, their requests will appear here for review.</p></div>}
  </section>;
}
