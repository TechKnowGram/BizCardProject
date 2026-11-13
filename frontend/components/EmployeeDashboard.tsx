'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, download } from '../lib/api';
import type { User } from '../lib/types';
import StatusBadge from './StatusBadge';
import Toast from './Toast';
import Icon from './Icon';
import { isValidEmail } from '../lib/validation';
import { site } from '../lib/site';
import { Button, buttonClass } from './ui';
import { CardLink, PageHeader, SectionCard, ToolbarSelect } from './dashboard/Surface';
import DataTable, { NameCell } from './dashboard/DataTable';
import type { Column } from './dashboard/DataTable';
import CardOrderStudio from './employee/CardOrderStudio';
import JoinCompanyDialog from './employee/JoinCompanyDialog';
import { CompanyMark, DetailList, EmptyNote, MATCH_HINTS, PRICE, cardDownloadPath, formatDate, formatSize, payerText } from './employee/shared';

export interface EmployeeDashboardProps {
  tab: string;
  setTab?: (tab: string) => void;
  user?: User | null;
}

export default function EmployeeDashboard({ tab, setTab, user }: EmployeeDashboardProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [personal, setPersonal] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderType, setOrderType] = useState('all');

  // My card: design/order view or saved cards
  const [cardSubView, setCardSubView] = useState<'order' | 'vault'>('order');

  // Card type: 'PERSONAL' or 'COMPANY'
  const [cardOrderType, setCardOrderType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL');

  // Colour of the on-screen personal card preview
  const [cardTheme, setCardTheme] = useState<'navy' | 'clean' | 'royal'>('navy');

  // Change company section (for active members)
  const [changeCompanyOpen, setChangeCompanyOpen] = useState(false);

  // Join company dialog
  const [targetCompany, setTargetCompany] = useState<any>(null);
  const [joinForm, setJoinForm] = useState({ official_email: '', employee_id: '', payer: 'COMPANY' });
  const [joinErrors, setJoinErrors] = useState<Record<string, string | undefined>>({});
  const [modalBusy, setModalBusy] = useState(false);
  const [modalApiError, setModalApiError] = useState('');

  const [order, setOrder] = useState({
    quantity: 1,
    template_id: '',
    payer: 'INDIVIDUAL',
    name: user?.username || '',
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
        setTemplates((await api(`/employee/templates/${active.company_id}`)) as any[]);
        setCardOrderType('COMPANY');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user?.username && !order.name) {
      setOrder(curr => ({ ...curr, name: user.username }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Membership state
  const activeMembership = memberships.find(m => m.status === 'APPROVED');
  const pendingMembership = memberships.find(m => m.status === 'PENDING');
  const rejectedMembership = memberships.find(m => m.status === 'REJECTED');

  const membershipState: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'NO_COMPANY' =
    activeMembership ? 'ACTIVE' : pendingMembership ? 'PENDING' : rejectedMembership ? 'REJECTED' : 'NO_COMPANY';

  function openJoinModal(company: any) {
    setTargetCompany(company);
    setJoinForm({
      official_email: activeMembership?.official_email || '',
      employee_id: activeMembership?.employee_code || '',
      payer: 'COMPANY',
    });
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

  async function handleJoinSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!joinForm.official_email.trim()) {
      errs.official_email = 'Enter your work email.';
    } else if (!isValidEmail(joinForm.official_email)) {
      errs.official_email = 'Enter a valid email address.';
    }
    if (!joinForm.employee_id.trim()) {
      errs.employee_id = 'Enter your employee ID.';
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
      setChangeCompanyOpen(false);
      if (result.status === 'APPROVED') {
        setMessage(`Your details matched the staff list at ${targetCompany.name}. You are now a member.`);
      } else {
        setMessage(`Request sent to ${targetCompany.name}. The company admin will review it.`);
      }
      await load();
    } catch (err: any) {
      setModalApiError(err.message);
    } finally {
      setModalBusy(false);
    }
  }

  // Unused by the current screens; kept as it was.
  async function selectCompany(value: string) {
    setSelected(value);
    setTemplates(value ? ((await api(`/employee/templates/${value}`)) as any[]) : []);
    setOrder({ ...order, template_id: '' });
  }

  async function checkout(isCompany: boolean) {
    setBusy(true);
    setError('');
    try {
      if (isCompany) {
        const companyId = selected || activeMembership?.company_id;
        if (!companyId) throw new Error('No active company selected.');
        const tId = Number(order.template_id);
        if (!tId || tId <= 0) throw new Error('Choose one of your company designs.');
        const body = {
          quantity: Math.max(1, Number(order.quantity) || 1),
          template_id: tId,
          // Informational only: the server uses the membership's payer.
          payer: activeMembership?.payer || 'INDIVIDUAL',
        };
        const result: any = await api(`/employee/checkout/company/${companyId}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(`Order placed: ${result.quantity} ${result.quantity === 1 ? 'card' : 'cards'}, total ৳${result.total_amount}.`);
      } else {
        const nameVal = order.name?.trim() || user?.username || '';
        if (!nameVal) throw new Error('Enter your full name.');
        // template_id is left out on purpose so the backend accepts the personal order.
        const body: Record<string, any> = {
          quantity: Math.max(1, Number(order.quantity) || 1),
          payer: 'INDIVIDUAL',
          name: nameVal,
        };
        if (order.designation?.trim()) body.designation = order.designation.trim();
        if (order.department?.trim()) body.department = order.department.trim();
        if (order.phone?.trim()) body.phone = order.phone.trim();

        const result: any = await api('/employee/checkout/personal', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(`Order placed: ${result.quantity} personal ${result.quantity === 1 ? 'card' : 'cards'}, total ৳${result.total_amount}.`);
      }
      await load();
      setCardSubView('vault');
    } catch (err: any) {
      setError(err.message || 'The order could not be placed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const cardRows = [
    ...cards.map(card => ({ ...card, kind: 'company' as const })),
    ...personal.map(card => ({ ...card, kind: 'personal' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestCard = cardRows[0];

  const filteredCompanies = companies.filter(
    c =>
      (c.name || '').toLowerCase().includes(companySearch.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(companySearch.toLowerCase()) ||
      String(c.id).includes(companySearch)
  );

  const employeeName = user?.username || 'there';
  const companyNameById = (id: number | null | undefined) =>
    id == null ? '' : companies.find(c => c.id === id)?.name || memberships.find(m => m.company_id === id)?.company?.name || '';

  function goToOrderCompanyCards() {
    setTab?.('card');
    setCardSubView('order');
    setCardOrderType('COMPANY');
  }

  function goToSavedCards() {
    setTab?.('card');
    setCardSubView('vault');
  }

  /* ---------- Pieces shared by several tabs ---------- */

  const toast = <Toast type={error ? 'error' : 'success'} message={error || message} onClose={() => { setError(''); setMessage(''); }} />;

  const joinDialog = targetCompany && (
    <JoinCompanyDialog
      company={targetCompany}
      form={joinForm}
      errors={joinErrors}
      busy={modalBusy}
      apiError={modalApiError}
      onFormChange={setJoinForm}
      onErrorsChange={setJoinErrors}
      onClose={closeJoinModal}
      onSubmit={handleJoinSubmit}
    />
  );

  const statusLine =
    membershipState === 'ACTIVE'
      ? `You are a member of ${activeMembership.company?.name}.`
      : membershipState === 'PENDING'
        ? `Your request to join ${pendingMembership.company?.name} is waiting for review.`
        : membershipState === 'REJECTED'
          ? `Your request to join ${rejectedMembership.company?.name} was not approved.`
          : 'You have an independent account. You can order personal cards or join your company.';

  /** Membership block used on the overview, profile and company pages. */
  function membershipSummary(detailed = false) {
    if (membershipState === 'ACTIVE' && activeMembership) {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <CompanyMark name={activeMembership.company?.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-navy-900">{activeMembership.company?.name}</p>
              {activeMembership.company?.website && <p className="truncate text-xs text-slate-500">{activeMembership.company.website}</p>}
            </div>
            <StatusBadge value="ACTIVE" />
          </div>
          <DetailList
            items={[
              { label: 'Employee ID', value: activeMembership.employee_code },
              { label: 'Work email', value: activeMembership.official_email },
              { label: 'Card payment', value: activeMembership.payer === 'COMPANY' ? 'Paid by company' : `Paid by you (৳${PRICE} per card)` },
              detailed && Boolean(activeMembership.decided_at) && { label: 'Member since', value: formatDate(activeMembership.decided_at) },
            ]}
          />
        </div>
      );
    }
    const request = membershipState === 'PENDING' ? pendingMembership : membershipState === 'REJECTED' ? rejectedMembership : null;
    if (request) {
      const pending = membershipState === 'PENDING';
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <CompanyMark name={request.company?.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-navy-900">{request.company?.name}</p>
              <p className="text-xs text-slate-500">Requested {formatDate(request.requested_at)}</p>
            </div>
            <StatusBadge value={request.status} />
          </div>
          <p className="text-sm text-slate-600">
            {pending
              ? MATCH_HINTS[request.match_status] || 'The company admin will review your request. You do not need to send it again.'
              : 'Check your employee ID and work email with your HR team, then send a new request.'}
          </p>
          {detailed && (
            <DetailList
              items={[
                { label: 'Employee ID sent', value: request.employee_code },
                { label: 'Work email sent', value: request.official_email },
              ]}
            />
          )}
        </div>
      );
    }
    return <p className="text-sm text-slate-600">You are not linked to a company. Join your company to order cards with its approved designs.</p>;
  }

  /* ---------- My profile ---------- */
  if (tab === 'profile') {
    const memberSince = (user as any)?.created_at;
    const companyName = activeMembership?.company?.name;
    const initials = (user?.username || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

    /** One settings section: explanation on the left, content card on the right. */
    const Section = ({ title, text, children }: { title: string; text: string; children: ReactNode }) => (
      <section className="grid gap-4 border-t border-slate-200 pt-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        <div>
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">{children}</div>
      </section>
    );
    const Row = ({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) => (
      <div className={`grid gap-1 px-6 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 ${last ? '' : 'border-b border-slate-100'}`}>
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="min-w-0 text-sm font-medium break-words text-navy-900">{children}</dd>
      </div>
    );

    return (
      <div className="space-y-8">
        {toast}

        {/* Profile header */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex min-w-0 items-center gap-5">
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-navy-900 text-xl font-semibold text-white">{initials}</span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-navy-900">{user?.username || 'Your profile'}</h1>
                <p className="mt-0.5 truncate text-sm text-slate-500">{user?.email}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">Employee</span>
                  {membershipState === 'ACTIVE' && companyName ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                      <span className="size-1.5 rounded-full bg-emerald-500" />Member of {companyName}
                    </span>
                  ) : membershipState === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200 ring-inset">
                      <span className="size-1.5 rounded-full bg-amber-500" />Waiting for company approval
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">Independent account</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button onClick={() => setTab?.('card')}>Order cards</Button>
            </div>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
            {[
              { label: 'Saved cards', value: cardRows.length },
              { label: 'Orders', value: orders.length },
              { label: memberSince ? 'Member since' : 'Company', value: memberSince ? formatDate(memberSince) : companyName || 'None yet' },
            ].map(item => (
              <div key={item.label} className="px-6 py-4 sm:px-8">
                <dt className="text-xs text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 truncate text-lg font-semibold text-navy-900 tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Section title="Personal details" text="The name and email on your account. You can set the details printed on each card when you order it.">
          <dl>
            <Row label="Full name">{user?.username || '—'}</Row>
            <Row label="Email">{user?.email || '—'}</Row>
            <Row label="Account type" last>Employee</Row>
          </dl>
        </Section>

        <Section title="Company" text="Joining your employer lets you order cards in its approved designs. Your company decides who pays.">
          <div className="px-6 py-5">
            {membershipSummary(true)}
            <div className="mt-5 flex flex-wrap gap-2">
              {membershipState === 'ACTIVE' ? (
                <Button variant="secondary" onClick={() => setTab?.('company')}>View company</Button>
              ) : membershipState !== 'PENDING' ? (
                <Button variant="secondary" onClick={() => setTab?.('company')}>Find your company</Button>
              ) : null}
            </div>
          </div>
        </Section>

        <Section title="Account" text="Reference details if you need help from your company admin or BizCard support.">
          <dl>
            <Row label="Account ID">
              <span className="flex items-center gap-2">
                <code className="truncate font-mono text-xs font-normal text-slate-600">{user?.id || '—'}</code>
                {user?.id && (
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(String(user.id))}
                    className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Copy
                  </button>
                )}
              </span>
            </Row>
            <Row label="Sign out" last>
              <span className="font-normal text-slate-500">Use the sign-out button at the bottom of the menu.</span>
            </Row>
          </dl>
        </Section>
      </div>
    );
  }

  /* ---------- Company ---------- */
  if (tab === 'company') {
    const isMember = membershipState === 'ACTIVE' && activeMembership;
    const directoryRows = isMember ? filteredCompanies.filter(c => c.id !== activeMembership.company_id) : filteredCompanies;

    const directoryColumns: Column<any>[] = [
      {
        key: 'name',
        header: 'Company',
        sortValue: c => c.name,
        render: c => <NameCell name={c.name || 'Company'} sub={c.description || undefined} />,
        className: 'max-w-80',
      },
      {
        key: 'website',
        header: 'Website',
        hideOnMobile: true,
        render: c => (c.website ? <span className="text-slate-600">{c.website}</span> : <span className="text-slate-400">—</span>),
      },
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: c =>
          pendingMembership?.company_id === c.id ? (
            <StatusBadge value="PENDING" />
          ) : (
            <Button variant="secondary" className="px-3 py-1.5" onClick={() => openJoinModal(c)}>
              {isMember ? 'Request to move' : 'Request to join'}
            </Button>
          ),
      },
    ];

    const directory = (
      <DataTable
        title={isMember ? 'Other companies' : 'Find your company'}
        description={isMember ? 'Send a request to the company you are moving to.' : 'Search for your employer and send a request to join.'}
        rows={directoryRows}
        columns={directoryColumns}
        rowKey={c => c.id}
        search={{ value: companySearch, onChange: setCompanySearch, placeholder: 'Search companies' }}
        emptyMessage={companySearch ? 'No companies match your search.' : 'No companies are listed yet.'}
      />
    );

    return (
      <div className="space-y-6">
        {toast}
        <PageHeader
          title="Company"
          description={isMember ? 'Your company membership and card details.' : 'Join your company to order cards with its approved designs.'}
          actions={isMember ? <Button onClick={goToOrderCompanyCards}>Order company cards</Button> : undefined}
        />

        {isMember ? (
          <>
            <SectionCard title="Your company">
              {membershipSummary(true)}
            </SectionCard>

            <SectionCard
              title="Change company"
              action={
                <Button variant="secondary" className="px-3 py-1.5" onClick={() => setChangeCompanyOpen(!changeCompanyOpen)}>
                  {changeCompanyOpen ? 'Close' : 'Change company'}
                </Button>
              }
            >
              <p className="text-sm text-slate-600">
                You can belong to one company at a time. If another company approves your request, it replaces your membership with{' '}
                {activeMembership.company?.name}.
              </p>
            </SectionCard>

            {changeCompanyOpen && directory}
          </>
        ) : (
          <>
            {(membershipState === 'PENDING' || membershipState === 'REJECTED') && (
              <SectionCard title="Your request">
                {membershipSummary(true)}
              </SectionCard>
            )}
            {directory}
          </>
        )}

        {joinDialog}
      </div>
    );
  }

  /* ---------- My card ---------- */
  if (tab === 'card') {
    return (
      <>
        {toast}
        <CardOrderStudio
          user={user}
          order={order}
          setOrder={setOrder}
          cardOrderType={cardOrderType}
          setCardOrderType={setCardOrderType}
          cardTheme={cardTheme}
          setCardTheme={setCardTheme}
          cardSubView={cardSubView}
          setCardSubView={setCardSubView}
          isMember={membershipState === 'ACTIVE'}
          activeMembership={activeMembership}
          templates={templates}
          cardRows={cardRows}
          busy={busy}
          onCheckout={checkout}
          onGoToCompany={() => setTab?.('company')}
        />
      </>
    );
  }

  /* ---------- Orders ---------- */
  const orderKind = (o: any) => (o.company_id == null ? 'personal' : 'company');

  if (tab === 'orders') {
    const q = orderSearch.trim().toLowerCase().replace(/^#/, '');
    const orderRows = orders.filter(
      o =>
        (orderType === 'all' || orderKind(o) === orderType) &&
        (!q || String(o.id).includes(q) || companyNameById(o.company_id).toLowerCase().includes(q))
    );

    const orderColumns: Column<any>[] = [
      { key: 'id', header: 'Order #', sortValue: o => o.id, render: o => <span className="font-medium text-navy-900 tabular-nums">#{o.id}</span> },
      {
        key: 'type',
        header: 'Type',
        sortValue: o => orderKind(o),
        render: o =>
          orderKind(o) === 'personal' ? (
            'Personal'
          ) : (
            <div className="min-w-0">
              <p>Company</p>
              {companyNameById(o.company_id) && <p className="truncate text-xs text-slate-500">{companyNameById(o.company_id)}</p>}
            </div>
          ),
      },
      { key: 'cards', header: 'Cards', align: 'right', sortValue: o => o.quantity, render: o => <span className="tabular-nums">{o.quantity}</span> },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortValue: o => Number(o.total_amount),
        render: o => (
          <div>
            <p className="font-medium text-navy-900 tabular-nums">৳{o.total_amount}</p>
            <p className="text-xs text-slate-500 tabular-nums">
              {o.quantity} × ৳{o.unit_price}
            </p>
          </div>
        ),
      },
      { key: 'payer', header: 'Payer', render: o => payerText(o.payer) },
      { key: 'status', header: 'Status', render: o => <StatusBadge value={o.status} /> },
      { key: 'date', header: 'Date', sortValue: o => new Date(o.created_at).getTime(), render: o => <span className="whitespace-nowrap">{formatDate(o.created_at)}</span> },
      { key: 'action', header: 'Action', align: 'right', render: () => <CardLink onClick={goToSavedCards}>View cards</CardLink> },
    ];

    return (
      <div className="space-y-6">
        {toast}
        <PageHeader
          title="Orders"
          description="All card orders you have placed, personal and company."
          actions={<Button onClick={() => { setTab?.('card'); setCardSubView('order'); }}>New order</Button>}
        />
        <DataTable
          rows={orderRows}
          columns={orderColumns}
          rowKey={o => o.id}
          search={{ value: orderSearch, onChange: setOrderSearch, placeholder: 'Search order # or company' }}
          toolbar={
            <ToolbarSelect
              label="Order type"
              value={orderType}
              onChange={setOrderType}
              options={[
                { value: 'all', label: 'All types' },
                { value: 'personal', label: 'Personal' },
                { value: 'company', label: 'Company' },
              ]}
            />
          }
          emptyMessage={orders.length ? 'No orders match your filters.' : 'Your orders will appear here after you order cards.'}
        />
      </div>
    );
  }

  /* ---------- Help ---------- */
  if (tab === 'help') {
    const faqs = [
      {
        q: 'How do I join my company?',
        a: 'Open Company, find your employer and choose Request to join. Enter your work email and employee ID. If they match the company staff list, you become a member straight away. If not, the company admin reviews your request.',
      },
      {
        q: 'Can I order cards without a company?',
        a: `Yes. Choose Personal card on the My card page. Personal cards cost ৳${PRICE} each and do not need any approval.`,
      },
      {
        q: 'Who pays for company cards?',
        a: 'Your company decides. The Card payment line on your company details shows whether cards are paid by the company or by you. The order summary shows the total before you confirm.',
      },
      {
        q: 'How do I download my card?',
        a: 'Open My card and choose Saved cards, then Download PDF. The PDF is a vector file at 3.5 × 2 in that you can send to any printer.',
      },
      {
        q: 'Can I move to another company?',
        a: 'Yes. On the Company page choose Change company and send a request to the new company. You can be a member of one company at a time, so the new membership replaces the current one once it is approved.',
      },
      {
        q: 'My request was not approved. What now?',
        a: 'Check your employee ID and work email with your HR team, then send a new request from the Company page.',
      },
    ];
    return (
      <div className="space-y-6">
        <PageHeader title="Help" description="Answers to common questions about joining a company, ordering and downloading cards." />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard title="Frequently asked questions" bodyClassName="px-0 pb-2">
          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {faqs.map(item => (
              <details key={item.q} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-navy-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="m6 8 4 4 4-4" />
                  </svg>
                </summary>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Quick links">
            <ul className="-mx-2 space-y-0.5">
              {[
                { label: 'Order cards', tab: 'card' },
                { label: 'Find or change your company', tab: 'company' },
                { label: 'View your orders', tab: 'orders' },
                { label: 'Your profile', tab: 'profile' },
              ].map(link => (
                <li key={link.tab}>
                  <button type="button" onClick={() => setTab?.(link.tab)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-navy-900 hover:bg-slate-50">
                    {link.label}
                    <Icon name="chevronRight" size={16} className="text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Still need help?">
            <p className="text-sm text-slate-600">For questions about your membership, ask your company admin first. For anything else, contact BizCard support.</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href={`mailto:${site.contact.email}`} className="font-medium text-brand-600 hover:text-brand-700">{site.contact.email}</a></li>
              <li className="text-navy-900">{site.contact.phone}</li>
              <li className="text-xs text-slate-500">{site.contact.hours}</li>
            </ul>
          </SectionCard>
        </div>
        </div>
      </div>
    );
  }

  /* ---------- Overview ---------- */
  return (
    <div className="space-y-6">
      {toast}
      <PageHeader
        title={`Hi, ${employeeName}`}
        description={statusLine}
        actions={<Button onClick={() => { setTab?.('card'); setCardSubView('order'); }}>Order cards</Button>}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <SectionCard title="Your card" action={latestCard ? <CardLink onClick={goToSavedCards}>All saved cards ({cardRows.length})</CardLink> : undefined}>
          {latestCard ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name="card" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-navy-900">{latestCard.file_name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {latestCard.kind === 'personal' ? 'Personal card' : 'Company card'} · {formatDate(latestCard.created_at)} · {formatSize(latestCard.file_size)}
                  </p>
                </div>
                <StatusBadge value={latestCard.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => download(cardDownloadPath(latestCard), latestCard.file_name)}>Download PDF</Button>
                {latestCard.kind !== 'personal' && latestCard.verification_token && (
                  <a href={`/verify/${latestCard.verification_token}`} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
                    Verify card
                  </a>
                )}
                <span className="text-xs text-slate-500">Vector PDF, 3.5 × 2 in</span>
              </div>
            </div>
          ) : (
            <EmptyNote action={<Button onClick={() => { setTab?.('card'); setCardSubView('order'); }}>Create your card</Button>}>
              Your card will appear here after your first order.
            </EmptyNote>
          )}
        </SectionCard>

        <SectionCard title="Company" action={membershipState === 'ACTIVE' ? <CardLink onClick={() => setTab?.('company')}>View company</CardLink> : undefined}>
          {membershipSummary()}
          {membershipState === 'ACTIVE' ? (
            <Button variant="secondary" className="mt-5" onClick={goToOrderCompanyCards}>
              Order company cards
            </Button>
          ) : membershipState !== 'PENDING' ? (
            <Button variant="secondary" className="mt-5" onClick={() => setTab?.('company')}>
              Find your company
            </Button>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard title="Recent orders" action={orders.length > 0 ? <CardLink onClick={() => setTab?.('orders')}>View all orders</CardLink> : undefined} bodyClassName={orders.length ? 'px-0 pb-2' : undefined}>
        {orders.length > 0 ? (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {orders.slice(0, 5).map(o => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-6 py-3 text-sm">
                <span className="w-20 font-medium text-navy-900 tabular-nums">#{o.id}</span>
                <span className="w-24 text-slate-600">{orderKind(o) === 'personal' ? 'Personal' : 'Company'}</span>
                <span className="w-20 text-slate-600 tabular-nums">
                  {o.quantity} {o.quantity === 1 ? 'card' : 'cards'}
                </span>
                <span className="hidden w-28 text-slate-500 sm:inline">{formatDate(o.created_at)}</span>
                <span className="ml-auto flex items-center gap-4">
                  <span className="font-medium text-navy-900 tabular-nums">৳{o.total_amount}</span>
                  <StatusBadge value={o.status} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>Your orders will appear here after you order cards.</EmptyNote>
        )}
      </SectionCard>

      {joinDialog}
    </div>
  );
}
