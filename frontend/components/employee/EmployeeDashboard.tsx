'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { api, downloadOrReport } from '@/lib/api';
import type { User } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import Toast from '@/components/ui/Toast';
import Icon from '@/components/ui/Icon';
import { isValidEmail } from '@/lib/validation';
import { site } from '@/lib/site';
import { Button, buttonClass } from '@/components/ui';
import { CardLink, PageHeader, SectionCard, ToolbarSelect } from '@/components/dashboard/Surface';
import DataTable, { NameCell } from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import CardOrderStudio from '@/components/employee/CardOrderStudio';
import JoinCompanyDialog from '@/components/employee/JoinCompanyDialog';
import { CompanyMark, DetailList, EmptyNote, MATCH_HINTS, PRICE, cardDownloadPath, formatDate, formatSize, payerText } from '@/components/employee/shared';

export interface EmployeeDashboardProps {
  children?: ReactNode;
  tab: string;
  setTab?: (tab: string) => void;
  user?: User | null;
}

export function useEmployeeController({ tab, setTab, user }: { tab: string; setTab?: (tab: string) => void; user: EmployeeDashboardProps['user'] }) {
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
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
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

  const orderKind = (o: any) => (o.company_id == null ? 'personal' : 'company');

  return { setTab, user, companies, setCompanies, memberships, setMemberships, cards, setCards, personal, setPersonal, orders, setOrders, templates, setTemplates, selected, setSelected, companySearch, setCompanySearch, orderSearch, setOrderSearch, orderType, setOrderType, cardSubView, setCardSubView, cardOrderType, setCardOrderType, cardTheme, setCardTheme, changeCompanyOpen, setChangeCompanyOpen, targetCompany, setTargetCompany, joinForm, setJoinForm, joinErrors, setJoinErrors, modalBusy, setModalBusy, modalApiError, setModalApiError, order, setOrder, message, setMessage, error, setError, busy, setBusy, loading, setLoading, load, activeMembership, pendingMembership, rejectedMembership, membershipState, openJoinModal, closeJoinModal, handleJoinSubmit, selectCompany, checkout, cardRows, latestCard, filteredCompanies, employeeName, companyNameById, goToOrderCompanyCards, goToSavedCards, toast, joinDialog, statusLine, membershipSummary, orderKind };
}

type EmployeeController = ReturnType<typeof useEmployeeController>;
const EmployeeContext = createContext<EmployeeController | null>(null);

/** Everything the employee pages share: memberships, cards, orders, forms and actions. */
export function useEmployee() {
  const value = useContext(EmployeeContext);
  if (!value) throw new Error('useEmployee must be used inside EmployeeDashboard');
  return value;
}

export default function EmployeeDashboard({ tab, setTab, user, children }: EmployeeDashboardProps) {
  const controller = useEmployeeController({ tab, setTab, user });
  const { loading } = controller;

  // First load: show the page shape, not a wrong "no company" state.
  const content = loading && tab !== 'help' ? (
      <div className="space-y-6" aria-busy="true" aria-label="Loading">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-white" />
          <div className="h-56 animate-pulse rounded-2xl bg-white" />
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-white" />
      </div>
  ) : children;

  return <EmployeeContext.Provider value={controller}>{content}</EmployeeContext.Provider>;
}
