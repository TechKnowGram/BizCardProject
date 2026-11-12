// @ts-nocheck
'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, download } from '../lib/api';
import StatusBadge from './StatusBadge';
import Toast from './Toast';
import ReviewDialog from './ReviewDialog';
import { isValidEmail } from '../lib/validation';

const PRICE = 50;
function Quantity({ value, onChange, total }: { value: number; onChange: (v: number) => void; total: number }) {
  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-3">
      <label className="field-label">Card quantity</label>
      <input
        className="input mt-1"
        min="1"
        type="number"
        value={value}
        onChange={e => onChange(Math.max(1, Number(e.target.value)))}
      />
      <p className="mt-2 text-sm font-bold">
        Total: ৳{total} <span className="font-normal text-slate-500">({value} × ৳{PRICE})</span>
      </p>
    </div>
  );
}

const MATCH_HINTS: Record<string, { text: string; tone: string }> = {
  ROSTER_MATCHED: { text: 'Verified with company roster. Membership activated automatically.', tone: 'ai-success' },
  ID_MISMATCH: { text: 'Employee ID was recognized but email differs. Company admin will review.', tone: 'notice-warn' },
  NOT_FOUND: { text: 'Your details will be reviewed by the company administrator.', tone: 'notice-info' },
  INACTIVE_EMPLOYEE: { text: 'Roster record is currently inactive. Awaiting administrator review.', tone: 'notice-warn' },
};

export default function EmployeeDashboard({ tab }: { tab: string }) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  // Modal state for joining a specific company
  const [targetCompany, setTargetCompany] = useState<any>(null);
  const [joinForm, setJoinForm] = useState({ official_email: '', employee_id: '', payer: 'COMPANY' });
  const [joinErrors, setJoinErrors] = useState<Record<string, string | undefined>>({});
  const [modalBusy, setModalBusy] = useState(false);
  const [modalApiError, setModalApiError] = useState('');

  const [order, setOrder] = useState({
    quantity: 1,
    template_id: '',
    payer: 'INDIVIDUAL',
    name: '',
    designation: '',
    department: '',
    phone: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [directory, mine, companyCards, personalCards, orderData] = await Promise.all([
        api('/companies/directory'),
        api('/memberships/me'),
        api('/employee/cards'),
        api('/employee/personal-cards'),
        api('/employee/orders'),
      ]);
      setCompanies(directory as any[]);
      setMemberships(mine as any[]);
      setCards(companyCards as any[]);
      setPersonal(personalCards as any[]);
      setOrders(orderData as any[]);
      const active = (mine as any[]).find(item => item.status === 'APPROVED');
      if (active) {
        setSelected(String(active.company_id));
        setTemplates(await api(`/employee/templates/${active.company_id}`) as any[]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = memberships.find(item => item.status === 'APPROVED' && String(item.company_id) === selected);
  const total = order.payer === 'COMPANY' && active?.payer === 'COMPANY' ? 0 : Number(order.quantity || 0) * PRICE;

  function openJoinModal(company: any) {
    setTargetCompany(company);
    setJoinForm({ official_email: '', employee_id: '', payer: 'COMPANY' });
    setJoinErrors({});
    setModalApiError('');
  }

  function closeJoinModal() {
    if (!modalBusy) {
      setTargetCompany(null);
      setModalApiError('');
      setJoinErrors({});
    }
  }

  async function handleJoinSubmit(e: any) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!joinForm.official_email.trim()) {
      errs.official_email = 'Official company email is required.';
    } else if (!isValidEmail(joinForm.official_email)) {
      errs.official_email = 'Enter a valid email address.';
    }
    if (!joinForm.employee_id.trim()) {
      errs.employee_id = 'Employee ID or registration number is required.';
    }
    setJoinErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setModalBusy(true);
    setModalApiError('');
    try {
      const result: any = await api(`/memberships/${targetCompany.id}`, {
        method: 'POST',
        body: JSON.stringify({
          official_email: joinForm.official_email.trim(),
          employee_id: joinForm.employee_id.trim(),
          payer: joinForm.payer,
        }),
      });
      setTargetCompany(null);
      if (result.status === 'APPROVED') {
        setMessage(`Success! Your details matched ${targetCompany.name}'s roster. Membership is now active.`);
      } else {
        setMessage(`Request submitted to ${targetCompany.name}. Your details will be reviewed by the administrator.`);
      }
      await load();
    } catch (err: any) {
      setModalApiError(err.message);
    } finally {
      setModalBusy(false);
    }
  }

  async function selectCompany(value: string) {
    setSelected(value);
    setTemplates(value ? (await api(`/employee/templates/${value}`) as any[]) : []);
    setOrder({ ...order, template_id: '' });
  }

  async function checkout(company: boolean) {
    setBusy(true);
    setError('');
    try {
      const path = company ? `/employee/checkout/company/${selected}` : '/employee/checkout/personal';
      const body = company
        ? { quantity: Number(order.quantity), template_id: Number(order.template_id), payer: order.payer }
        : { ...order, quantity: Number(order.quantity) };
      const result: any = await api(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage(`Mock payment complete. ${result.quantity} card${result.quantity > 1 ? 's' : ''} created; total ৳${result.total_amount}.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const cardRows = [
    ...cards.map(card => ({ ...card, kind: 'company' })),
    ...personal.map(card => ({ ...card, kind: 'personal' })),
  ];

  const filteredCompanies = companies.filter(c =>
    (c.name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(companySearch.toLowerCase())
  );

  if (tab === 'cards') {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">MY CARDS</span>
            <h2>Card & payment history</h2>
            <p>Every generated card and mock checkout remains available here.</p>
          </div>
        </div>
        {cardRows.map(card => (
          <div className="request-card" key={`${card.kind}-${card.id}`}>
            <div className="request-summary">
              <strong>{card.file_name}</strong>
              <small>
                {card.kind === 'personal' ? 'Personal card' : 'Company card'} · {new Date(card.created_at).toLocaleDateString()}
              </small>
            </div>
            <button
              className="btn-primary"
              onClick={() =>
                download(
                  card.kind === 'personal'
                    ? `/employee/personal-cards/${card.id}/download`
                    : `/employee/cards/${card.id}/download`,
                  card.file_name
                )
              }
            >
              Download PDF
            </button>
          </div>
        ))}
        <h3 className="mt-8 text-lg font-bold">Mock payment history</h3>
        {orders.map(item => (
          <div className="request-card" key={`order-${item.id}`}>
            <div className="request-summary">
              <strong>Order #{item.id}</strong>
              <small>
                {item.quantity} × ৳{item.unit_price} · {item.payer} · {item.status}
              </small>
            </div>
            <strong>৳{item.total_amount}</strong>
          </div>
        ))}
      </section>
    );
  }

  if (tab === 'create') {
    return (
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">CREATE VISITING CARDS</span>
            <h2>Personal or company branded</h2>
            <p>Quantity has no fixed limit. The mock total updates before checkout.</p>
          </div>
        </div>
        {error && <p className="notice-error">{error}</p>}
        {message && <p className="ai-success">{message}</p>}
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border p-5">
            <h3 className="font-bold">Personal card</h3>
            <p className="mt-1 text-sm text-slate-500">Use without joining any company.</p>
            {(['name', 'designation', 'department', 'phone'] as const).map(key => (
              <input
                key={key}
                className="input mt-3"
                placeholder={key[0].toUpperCase() + key.slice(1)}
                value={order[key]}
                onChange={e => setOrder({ ...order, [key]: e.target.value })}
              />
            ))}
            <Quantity
              value={order.quantity}
              onChange={value => setOrder({ ...order, quantity: value })}
              total={Number(order.quantity || 0) * PRICE}
            />
            <button disabled={busy} className="btn-primary mt-4" onClick={() => checkout(false)}>
              Mock checkout & create
            </button>
          </div>
          <div className="rounded-2xl border p-5">
            <h3 className="font-bold">Company branded card</h3>
            <select className="input mt-3" value={selected} onChange={e => selectCompany(e.target.value)}>
              <option value="">Select approved company</option>
              {memberships
                .filter(item => item.status === 'APPROVED')
                .map(item => (
                  <option key={item.id} value={item.company_id}>
                    {item.company?.name}
                  </option>
                ))}
            </select>
            {active && (
              <>
                <select
                  className="input mt-3"
                  value={order.template_id}
                  onChange={e => setOrder({ ...order, template_id: e.target.value })}
                >
                  <option value="">Select template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input mt-3"
                  value={order.payer}
                  onChange={e => setOrder({ ...order, payer: e.target.value })}
                >
                  <option value="COMPANY">Company sponsored</option>
                  <option value="INDIVIDUAL">Pay myself</option>
                </select>
                <Quantity
                  value={order.quantity}
                  onChange={value => setOrder({ ...order, quantity: value })}
                  total={total}
                />
                <button
                  disabled={busy || !order.template_id}
                  className="btn-primary mt-4"
                  onClick={() => checkout(true)}
                >
                  Mock checkout & create
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <Toast
        type={error ? 'error' : 'success'}
        message={error || message}
        onClose={() => {
          setError('');
          setMessage('');
        }}
      />
      <section className="company-banner">
        <div>
          <p>EMPLOYEE WORKSPACE</p>
          <h2>Your card identity, in one place.</h2>
          <p className="banner-copy">
            Create independent personal cards or request to join a registered company to access official branding.
          </p>
        </div>
      </section>

      {/* Active memberships summary */}
      {memberships.some(m => m.status === 'APPROVED') && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">ACTIVE MEMBERSHIP</span>
              <h2>Your company workspace</h2>
            </div>
          </div>
          {memberships
            .filter(m => m.status === 'APPROVED')
            .map(m => (
              <div className="request-card" key={m.id}>
                <div className="request-summary">
                  <strong>{m.company?.name || `Company #${m.company_id}`}</strong>
                  <small>Employee ID: {m.employee_code} · {m.official_email}</small>
                </div>
                <StatusBadge value="ACTIVE" />
              </div>
            ))}
        </section>
      )}

      {/* Pending membership requests */}
      {memberships.some(m => m.status === 'PENDING') && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">PENDING REQUESTS</span>
              <h2>Awaiting company review</h2>
            </div>
          </div>
          {memberships
            .filter(m => m.status === 'PENDING')
            .map(m => {
              const hint = MATCH_HINTS[m.match_status];
              return (
                <div className="request-card" key={m.id}>
                  <div className="request-summary">
                    <strong>{m.company?.name || `Company #${m.company_id}`}</strong>
                    <small>Employee ID: {m.employee_code} · {m.official_email}</small>
                    {hint && <p className={`mt-1 text-xs ${hint.tone}`}>{hint.text}</p>}
                  </div>
                  <StatusBadge value="PENDING" />
                </div>
              );
            })}
        </section>
      )}

      {/* Company Directory with Direct Enabled Action Buttons */}
      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">COMPANY DIRECTORY</span>
            <h2>Registered companies</h2>
            <p>Click &quot;Request to join&quot; on any company to enter your official credentials and verify membership.</p>
          </div>
          {companies.length > 3 && (
            <div className="search-field">
              <span>⌕</span>
              <input
                aria-label="Search companies"
                placeholder="Search company..."
                value={companySearch}
                onChange={e => setCompanySearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {filteredCompanies.length > 0 ? (
          <div className="template-grid mt-4">
            {filteredCompanies.map(company => {
              const membership = memberships.find(item => item.company_id === company.id);
              return (
                <article className="template-option" key={company.id}>
                  <div className="flex items-start justify-between">
                    <h3>{company.name}</h3>
                    {membership && <StatusBadge value={membership.status} />}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {company.description || company.website || 'Registered company workspace'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {membership?.status === 'APPROVED' ? (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                        ✓ Active member
                      </span>
                    ) : membership?.status === 'PENDING' ? (
                      <span className="inline-flex items-center text-xs font-medium text-amber-700">
                        ⏳ Under review by company admin
                      </span>
                    ) : membership?.status === 'REJECTED' ? (
                      <span className="inline-flex items-center text-xs font-medium text-red-600">
                        ✕ Request rejected
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary w-full"
                        onClick={() => openJoinModal(company)}
                      >
                        Request to join →
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No registered companies found.</p>
        )}
      </section>

      {/* Clean, Professional Modal for Verification on Specific Company */}
      {targetCompany && (
        <ReviewDialog
          title={`Join ${targetCompany.name}`}
          eyebrow="VERIFY EMPLOYMENT"
          busy={modalBusy}
          onClose={closeJoinModal}
        >
          <p className="mb-5 text-sm text-slate-600">
            Enter your official credentials for <strong>{targetCompany.name}</strong>. If your details match the company roster, your membership activates automatically. Otherwise, it will be sent to the company administrator for manual approval.
          </p>

          <form onSubmit={handleJoinSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Official Company Email <span className="text-red-500">*</span>
                </label>
                <input
                  className={`input ${joinErrors.official_email ? 'input-error' : ''}`}
                  type="email"
                  placeholder="e.g. yourname@company.com"
                  value={joinForm.official_email}
                  disabled={modalBusy}
                  onChange={e => {
                    setJoinForm({ ...joinForm, official_email: e.target.value });
                    setJoinErrors({ ...joinErrors, official_email: undefined });
                  }}
                />
                {joinErrors.official_email && (
                  <span className="mt-1 block text-xs text-red-600">{joinErrors.official_email}</span>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Employee ID / Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  className={`input ${joinErrors.employee_id ? 'input-error' : ''}`}
                  type="text"
                  placeholder="e.g. BSH-1001 or EMP-001"
                  value={joinForm.employee_id}
                  disabled={modalBusy}
                  onChange={e => {
                    setJoinForm({ ...joinForm, employee_id: e.target.value });
                    setJoinErrors({ ...joinErrors, employee_id: undefined });
                  }}
                />
                {joinErrors.employee_id && (
                  <span className="mt-1 block text-xs text-red-600">{joinErrors.employee_id}</span>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Card Sponsorship Preference</label>
                <select
                  className="input"
                  value={joinForm.payer}
                  disabled={modalBusy}
                  onChange={e => setJoinForm({ ...joinForm, payer: e.target.value })}
                >
                  <option value="COMPANY">Company sponsored (Recommended)</option>
                  <option value="INDIVIDUAL">I pay for cards (Individual)</option>
                </select>
                <small className="mt-1 block text-xs text-slate-400">
                  Select whether card orders are billed to the company or self-sponsored.
                </small>
              </div>
            </div>

            {modalApiError && (
              <p role="alert" className="notice-error mt-4">
                {modalApiError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={modalBusy}
                onClick={closeJoinModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={modalBusy}
              >
                {modalBusy ? 'Verifying…' : 'Submit Verification Request'}
              </button>
            </div>
          </form>
        </ReviewDialog>
      )}
    </>
  );
}
