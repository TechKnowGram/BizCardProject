// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import StatusBadge from './StatusBadge';
import Toast from './Toast';
import { Button, Panel, PanelHeader, cx, tableClass, tdClass, thClass } from './ui';
import { PanelTitle, compactSelectClass } from './CompanyDashboardParts';

const MATCH_LABELS: Record<string, { label: string; tone: string }> = {
  ROSTER_MATCHED: { label: 'Roster verified', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ID_MISMATCH: { label: 'Email mismatch', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  NOT_FOUND: { label: 'Not in roster', tone: 'bg-red-50 text-red-700 border-red-200' },
  INACTIVE_EMPLOYEE: { label: 'Inactive roster', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

function MatchBadge({ value }: { value: string }) {
  const info = MATCH_LABELS[value];
  if (!info) return null;
  return (
    <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-semibold', info.tone)}>
      {info.label}
    </span>
  );
}

export default function CompanyMemberships() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('ALL');

  async function load() {
    try {
      setRows(await api('/company/memberships'));
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: number, decision: string) {
    setBusy(true);
    setError('');
    try {
      await api(`/company/memberships/${id}`, { method: 'PATCH', body: JSON.stringify({ decision }) });
      setMessage(`Membership ${decision.toLowerCase()} successfully.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = filter === 'ALL' ? rows : rows.filter(r => r.status === filter);
  const pendingCount = rows.filter(r => r.status === 'PENDING').length;

  return (
    <Panel>
      <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />
      <PanelHeader className="max-sm:p-4.5">
        <PanelTitle
          kicker="TEAM ACCESS & VERIFICATION"
          title="Employee membership requests"
          copy="Review submitted credentials against your company roster. Approved employees unlock verified branding and templates."
        />
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 font-display text-xs font-semibold text-black">
              <span className="size-1.5 rounded-full bg-amber-700" />
              {pendingCount} pending review
            </span>
          )}
          <select className={compactSelectClass} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVOKED">Revoked</option>
            <option value="PRE_APPROVED">Pre-approved</option>
          </select>
        </div>
      </PanelHeader>

      {filtered.length ? (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={cx(thClass, 'max-md:p-3.5')}>Employee User</th>
                <th className={cx(thClass, 'max-md:p-3.5')}>Submitted Details</th>
                <th className={cx(thClass, 'max-md:p-3.5')}>Verification</th>
                <th className={cx(thClass, 'max-md:p-3.5')}>Status</th>
                <th className={cx(thClass, 'max-md:p-3.5')}>Requested</th>
                <th className={cx(thClass, 'max-md:p-3.5')}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const td = cx(tdClass, 'max-md:p-3.5');
                const initials = (row.user?.username || 'E').split(' ').map((p: string) => p[0]).slice(0, 2).join('');
                return (
                  <tr key={row.id} className="hover:bg-slate-100 transition-colors">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-2xs font-semibold text-brand-600">
                          {initials}
                        </span>
                        <div>
                          <strong className="block text-xs font-bold text-slate-900">{row.user?.username || 'Unlinked'}</strong>
                          <small className="block text-3xs text-slate-500">{row.user?.email || '—'}</small>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <div className="space-y-0.5 text-xs">
                        <p>
                          <span className="text-slate-500 text-3xs uppercase font-medium">ID:</span>{' '}
                          <strong className="text-slate-800 tabular-nums text-xs">{row.employee_code || '—'}</strong>
                        </p>
                        <p className="text-slate-500 text-3xs">{row.official_email || '—'}</p>
                        <span className="inline-block text-[10px] uppercase font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                          {row.payer === 'COMPANY' ? 'Company sponsored' : 'Individual payer'}
                        </span>
                      </div>
                    </td>
                    <td className={td}>
                      <MatchBadge value={row.match_status} />
                    </td>
                    <td className={td}>
                      <StatusBadge value={row.status} />
                    </td>
                    <td className={cx(td, 'text-slate-500 text-3xs')}>
                      {row.requested_at ? new Date(row.requested_at).toLocaleDateString() : '—'}
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        {row.status === 'PENDING' && (
                          <>
                            <Button
                              variant="sun"
                              className="!px-3 !py-1.5 !text-xs !min-h-0"
                              disabled={busy}
                              onClick={() => decide(row.id, 'APPROVED')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              className="!px-3 !py-1.5 !text-xs !min-h-0"
                              disabled={busy}
                              onClick={() => decide(row.id, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {row.status === 'APPROVED' && (
                          <Button
                            variant="danger"
                            className="!px-3 !py-1.5 !text-xs !min-h-0"
                            disabled={busy}
                            onClick={() => decide(row.id, 'REVOKED')}
                          >
                            Revoke
                          </Button>
                        )}
                        {['REJECTED', 'REVOKED'].includes(row.status) && (
                          <Button
                            variant="secondary"
                            className="!px-3 !py-1.5 !text-xs !min-h-0"
                            disabled={busy}
                            onClick={() => decide(row.id, 'APPROVED')}
                          >
                            Re-approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid min-h-80 place-items-center content-center p-9 text-center">
          <span className="mb-5 grid size-16 -rotate-6 place-items-center rounded-xl bg-brand-50 text-2xl text-brand-600">
            ♙
          </span>
          <h3 className="text-base font-semibold text-slate-700">
            {filter === 'ALL' ? 'No membership requests yet' : `No ${filter.toLowerCase()} requests`}
          </h3>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
            When registered users request to join your company workspace, their requests appear here for verification.
          </p>
        </div>
      )}
    </Panel>
  );
}
