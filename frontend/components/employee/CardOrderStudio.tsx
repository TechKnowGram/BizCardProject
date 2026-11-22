'use client';

import { useEffect, useState } from 'react';
import { api, downloadOrReport } from '@/lib/api';
import type { User } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { Button, FieldLabel, buttonClass, cx, inputClass } from '@/components/ui';
import Icon from '@/components/ui/Icon';
import { FlipCard } from '@/components/cards/ImageTemplateCard';
import DesignUploader from '@/components/company/DesignUploader';
import type { CardValues } from '@/components/cards/ImageTemplateCard';
import type { CompanySummary, ImageTemplateDesign } from '@/lib/types';
import { DetailList, EmptyNote, PRICE, QUANTITY_PRESETS, RadioCard, Segmented, cardDownloadPath, formatDate, formatSize } from '@/components/employee/shared';
import type { Row } from '@/components/employee/shared';

type Theme = 'navy' | 'clean' | 'royal';
type OrderType = 'PERSONAL' | 'COMPANY';
type SubView = 'order' | 'vault';

export interface OrderDraft {
  quantity: number;
  template_id: string;
  payer: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  /** Personal orders: a design the employee uploaded (empty = one of the standard styles). */
  personal_template_id: string;
}

/** A card design the employee uploaded for their own personal cards. */
interface PersonalDesign {
  id: number;
  name: string;
  description: string;
  design: ImageTemplateDesign;
}

// The uploader needs a company; personal designs belong to the employee, not a company.
const NO_COMPANY: CompanySummary = { id: 0, name: '', status: 'APPROVED', selected_template_id: null };

export interface CardOrderStudioProps {
  user?: User | null;
  order: OrderDraft;
  setOrder: (order: OrderDraft) => void;
  cardOrderType: OrderType;
  setCardOrderType: (type: OrderType) => void;
  cardTheme: Theme;
  setCardTheme: (theme: Theme) => void;
  cardSubView: SubView;
  setCardSubView: (view: SubView) => void;
  isMember: boolean;
  activeMembership?: Row;
  templates: Row[];
  cardRows: Row[];
  busy: boolean;
  onCheckout: (isCompany: boolean) => void;
  onGoToCompany: () => void;
  /** Shows an error message on the page (e.g. a failed download). */
  onError?: (message: string) => void;
  /** Opens payment modal for an unpaid order. */
  onPayOrder?: (orderId: number) => void;
}

export default function CardOrderStudio(props: CardOrderStudioProps) {
  const { cardSubView, setCardSubView, cardRows } = props;
  return (
    <div className="space-y-6">
      <PageHeader
        title="My card"
        description="Fill in your details, check the preview and order your cards."
        actions={
          <Segmented<SubView>
            label="Card views"
            value={cardSubView}
            onChange={setCardSubView}
            options={[
              { value: 'order', label: 'Design and order' },
              {
                value: 'vault',
                label: (
                  <>
                    Saved cards
                    <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700 tabular-nums">{cardRows.length}</span>
                  </>
                ),
              },
            ]}
          />
        }
      />
      {cardSubView === 'order' ? (
        <DesignAndOrder {...props} />
      ) : (
        <SavedCards cardRows={cardRows} onError={props.onError} onPayOrder={props.onPayOrder} onOrderMore={() => setCardSubView('order')} />
      )}
    </div>
  );
}

function QuantityField({ quantity, onChange }: { quantity: number; onChange: (quantity: number) => void }) {
  // Keep what the person is typing (it may be empty for a moment); clamp only when they leave the box.
  const [draft, setDraft] = useState(String(quantity));
  useEffect(() => setDraft(String(quantity)), [quantity]);
  const commit = () => {
    const value = Math.max(1, Math.min(1000, Math.round(Number(draft)) || 1));
    setDraft(String(value));
    onChange(value);
  };
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Number of cards" className="flex flex-wrap gap-2">
        {QUANTITY_PRESETS.map((qty) => {
          const active = Number(quantity) === qty;
          return (
            <button
              key={qty}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(qty)}
              className={cx(
                'rounded-lg border px-3.5 py-2 text-sm font-medium tabular-nums transition-colors',
                active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
              )}
            >
              {qty}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="card-qty" className="text-sm text-slate-600">
          Other amount
        </label>
        <input
          id="card-qty"
          type="number"
          min="1"
          max="1000"
          inputMode="numeric"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const value = Number(e.target.value);
            if (value >= 1 && value <= 1000) onChange(Math.round(value));
          }}
          onBlur={commit}
          className={cx(inputClass, 'w-28 py-2 tabular-nums')}
        />
        <span className="text-xs text-slate-500">Between 1 and 1,000 cards</span>
      </div>
    </div>
  );
}

function SummaryList({ rows, total, totalNote }: { rows: ReadonlyArray<{ label: string; value: string }>; total: string; totalNote?: string }) {
  return (
    <dl className="space-y-2.5 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <dt className="text-slate-500">{r.label}</dt>
          <dd className="text-slate-800 tabular-nums">{r.value}</dd>
        </div>
      ))}
      <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
        <dt className="font-semibold text-navy-900">Total</dt>
        <dd className="text-right">
          <span className="text-lg font-semibold text-navy-900 tabular-nums">{total}</span>
          {totalNote && <span className="block text-xs text-slate-500">{totalNote}</span>}
        </dd>
      </div>
    </dl>
  );
}

function DesignAndOrder({
  user,
  order,
  setOrder,
  cardOrderType,
  setCardOrderType,
  isMember,
  activeMembership,
  templates,
  busy,
  onCheckout,
  onGoToCompany,
}: CardOrderStudioProps) {
  const quantity = Number(order.quantity || 1);
  const isCompany = cardOrderType === 'COMPANY';
  const total = quantity * PRICE;
  const selectedTemplate = templates.find((t) => String(t.id) === String(order.template_id));
  const companyName = activeMembership?.company?.name || 'your company';
  const [designs, setDesigns] = useState<PersonalDesign[]>([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    let live = true;
    api<PersonalDesign[]>('/employee/designs').then((list) => { if (live) setDesigns(list); }).catch(() => {});
    return () => { live = false; };
  }, []);
  const personalDesign = !isCompany ? designs.find((d) => String(d.id) === String(order.personal_template_id || '')) : undefined;
  // A design made from an uploaded card (the company's, or the employee's own): show the real card with their details.
  const companyDesign: ImageTemplateDesign | null = isCompany && selectedTemplate?.design?.kind === 'image' ? (selectedTemplate.design as ImageTemplateDesign) : null;
  const imageDesign: ImageTemplateDesign | null = companyDesign || personalDesign?.design || null;
  const companyId = activeMembership?.company_id;
  const company = activeMembership?.company;
  const cardValues: CardValues = isCompany ? {
    name: order.name || user?.username || '',
    title: order.designation,
    department: order.department,
    phone: order.phone,
    email: activeMembership?.official_email || user?.email || '',
    website: activeMembership?.company?.website,
    address: activeMembership?.company?.address,
    company: company?.name,
    // The photo the company card prints: the company's photo of them, else their own profile picture.
    photoPath: companyId ? `/employee/companies/${companyId}/photo` : null,
    logoPath: companyId && company?.has_logo ? `/employee/companies/${companyId}/logo` : null,
  } : {
    name: order.name || user?.username || '',
    title: order.designation,
    department: order.department,
    phone: order.phone,
    email: user?.email || '',
    website: '',
    address: '',
    company: '',
    photoPath: user?.has_avatar ? `/auth/me/avatar?v=${user.avatar_version ?? 0}` : null,
    logoPath: null,
  };
  async function designSaved(saved: { id: number }) {
    setUploading(false);
    const list = await api<PersonalDesign[]>('/employee/designs').catch(() => designs);
    setDesigns(list);
    setOrder({ ...order, personal_template_id: String(saved.id) });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        <SectionCard title="Card type">
          <div role="radiogroup" aria-label="Card type" className="grid gap-3 sm:grid-cols-2">
            <RadioCard checked={cardOrderType === 'PERSONAL'} onSelect={() => setCardOrderType('PERSONAL')} title="Personal card" meta={`৳${PRICE} per card`}>
              Your own card with the details you enter. No company approval needed.
            </RadioCard>
            <RadioCard
              checked={isCompany}
              disabled={!isMember}
              onSelect={() => setCardOrderType('COMPANY')}
              title="Company card"
              meta={isMember ? `৳${PRICE} per card` : 'Company members only'}
            >
              {isMember ? `Uses a design approved by ${companyName}.` : 'Join your company first to use its card designs.'}
            </RadioCard>
          </div>
        </SectionCard>

        {!isCompany ? (
          <>
            <SectionCard title="Card details">
              <div className="space-y-4">
                <div>
                  <FieldLabel htmlFor="card-name">
                    Full name <span className="text-red-600">*</span>
                  </FieldLabel>
                  <input id="card-name" className={inputClass} placeholder="e.g. Alex Rahman" value={order.name} onChange={(e) => setOrder({ ...order, name: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="card-title">Job title</FieldLabel>
                    <input id="card-title" className={inputClass} placeholder="e.g. Software engineer" value={order.designation} onChange={(e) => setOrder({ ...order, designation: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="card-dept">Department</FieldLabel>
                    <input id="card-dept" className={inputClass} placeholder="e.g. Engineering" value={order.department} onChange={(e) => setOrder({ ...order, department: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="card-phone">Phone</FieldLabel>
                    <input id="card-phone" className={inputClass} placeholder="e.g. +880 1712 345678" value={order.phone} onChange={(e) => setOrder({ ...order, phone: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="card-email">Email</FieldLabel>
                    <input id="card-email" className={cx(inputClass, 'cursor-not-allowed bg-slate-50 text-slate-500')} disabled value={user?.email || 'contact@bizcard.me'} />
                    <p className="mt-1.5 text-xs text-slate-500">Taken from your account.</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Your card design" info="Upload a card designed in Photoshop or Canva (PNG, JPG or WebP). Machine learning reads it and puts your name, title, phone and photo in the right places.">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{designs.length ? 'Choose the design to print on.' : 'Start by uploading your card design.'}</p>
                {!uploading && <Button variant={designs.length ? 'secondary' : 'primary'} className="px-3 py-1.5" onClick={() => setUploading(true)}>Upload a design</Button>}
              </div>
              {designs.length > 0 ? (
                <div role="radiogroup" aria-label="Your designs" className="mt-2 grid gap-3 sm:grid-cols-2">
                  {designs.map((d) => {
                    const active = personalDesign?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setOrder({ ...order, personal_template_id: String(d.id) })}
                        className={cx('flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors', active ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600' : 'border-slate-200 bg-white hover:border-slate-300')}
                      >
                        <span className="min-w-0">
                          <span className={cx('block truncate font-medium', active ? 'text-brand-700' : 'text-navy-900')}>{d.name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{d.design.back ? 'Front and back' : 'Front only'}</span>
                        </span>
                        {active && <Icon name="check" size={16} className="shrink-0 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              ) : !uploading ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No designs yet. Upload a card made in Photoshop or Canva; you check where everything goes before saving.</p>
              ) : null}
            </SectionCard>

            {uploading && (
              <div className="space-y-2">
                <DesignUploader scope="personal" company={NO_COMPANY} employees={[]} onSaved={designSaved} sample={cardValues} />
                <div className="text-right">
                  <button type="button" className="text-sm font-medium text-slate-500 hover:text-navy-900" onClick={() => setUploading(false)}>Cancel upload</button>
                </div>
              </div>
            )}

            <SectionCard title="Quantity">
              <QuantityField quantity={order.quantity} onChange={(qty) => setOrder({ ...order, quantity: qty })} />
            </SectionCard>

            <SectionCard title="Order summary">
              <SummaryList
                rows={[
                  { label: 'Design', value: personalDesign?.name || 'Not chosen' },
                  { label: 'Price per card', value: `৳${PRICE}` },
                  { label: 'Cards', value: String(quantity) },
                  { label: 'PDF download', value: 'After approval and payment' },
                ]}
                total={`৳${total}`}
                totalNote={`${quantity} × ৳${PRICE}`}
              />
              <ApprovalSteps />
              <Button className="mt-5 w-full py-3" disabled={busy || !order.name.trim() || !personalDesign} onClick={() => onCheckout(false)}>
                {busy ? 'Sending…' : `Send for approval · ৳${total}`}
              </Button>
              {!personalDesign ? <p className="mt-2 text-center text-xs text-slate-500">Upload or choose your card design to continue.</p>
                : !order.name.trim() && <p className="mt-2 text-center text-xs text-slate-500">Enter your full name to continue.</p>}
            </SectionCard>
          </>
        ) : !isMember ? (
          <SectionCard title="Company card">
            <EmptyNote action={<Button variant="secondary" onClick={onGoToCompany}>Find your company</Button>}>
              Company cards are available once your company approves your membership.
            </EmptyNote>
          </SectionCard>
        ) : (
          <>
            <SectionCard title="Card details">
              <p className="mb-4 text-sm text-slate-500">Company cards use the details your company holds for you.</p>
              <DetailList
                items={[
                  { label: 'Name', value: user?.username || '—' },
                  { label: 'Employee ID', value: activeMembership?.employee_code || '—' },
                  { label: 'Work email', value: activeMembership?.official_email || '—' },
                ]}
              />
              <div className="mt-6">
                <FieldLabel htmlFor="card-template">
                  Design <span className="text-red-600">*</span>
                </FieldLabel>
                <select id="card-template" className={inputClass} value={order.template_id} onChange={(e) => setOrder({ ...order, template_id: e.target.value })}>
                  <option value="">Choose a design</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {templates.length ? `Designs approved by ${companyName}.` : `${companyName} has no approved designs yet.`}
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Quantity">
              <QuantityField quantity={order.quantity} onChange={(qty) => setOrder({ ...order, quantity: qty })} />
            </SectionCard>

            <SectionCard title="Order summary">
              <SummaryList
                rows={[
                  { label: 'Company', value: activeMembership?.company?.name || '—' },
                  { label: 'Price per card', value: `৳${PRICE}` },
                  { label: 'Cards', value: String(quantity) },
                  { label: 'PDF download', value: 'After approval and payment' },
                ]}
                total={`৳${total}`}
                totalNote={`${quantity} × ৳${PRICE}`}
              />
              <ApprovalSteps />
              <Button className="mt-5 w-full py-3" disabled={busy || !order.template_id} onClick={() => onCheckout(true)}>
                {busy ? 'Sending…' : order.template_id ? `Send for approval · ৳${total}` : 'Choose a design to continue'}
              </Button>
            </SectionCard>
          </>
        )}
      </div>

      <div className="order-first lg:sticky lg:top-24 lg:order-none lg:col-span-5">
        <SectionCard title="Preview">
          {imageDesign ? (
            <div className="rounded-xl bg-slate-50 px-4 py-6 sm:px-6">
              <FlipCard key={isCompany ? `t${order.template_id}` : `p${order.personal_template_id}`} design={imageDesign} values={cardValues} className="mx-auto max-w-md" />
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
              <div>
                <p className="text-sm font-medium text-navy-900">{isCompany ? 'Choose a company design' : 'Upload or choose your design'}</p>
                <p className="mt-1 text-xs text-slate-500">Your card appears here with your details and photo, front and back.</p>
              </div>
            </div>
          )}
          <p className="mt-4 text-sm text-slate-500">
            {imageDesign
              ? 'This is your card with your details and photo. The PDF uses the same positions, colours, sizes and photo crop.'
              : 'Machine learning places your details on the design you choose.'}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

/** Every order follows the company rule: approval by a system admin, then payment, then the PDF. */
function ApprovalSteps() {
  const steps = ['A system admin checks and approves your order', 'You pay', 'Your PDF is ready to download'];
  return (
    <ol className="mt-5 space-y-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-2.5">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-brand-700 ring-1 ring-slate-200 tabular-nums">{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function SavedCards({ cardRows, onOrderMore, onError, onPayOrder }: { cardRows: Row[]; onOrderMore: () => void; onError?: (message: string) => void; onPayOrder?: (orderId: number) => void }) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const rows = q ? cardRows.filter((c) => String(c.file_name || '').toLowerCase().includes(q)) : cardRows;

  const columns: Column<Row>[] = [
    {
      key: 'file',
      header: 'Card',
      sortValue: (c) => c.file_name,
      render: (c) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <Icon name="card" size={16} />
          </span>
          <span className="truncate font-medium text-navy-900">{c.file_name}</span>
        </div>
      ),
      className: 'max-w-72',
    },
    { key: 'type', header: 'Type', sortValue: (c) => c.kind, render: (c) => (c.kind === 'personal' ? 'Personal' : 'Company') },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge value={c.payment_status === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : (c.status || 'ACTIVE')} />,
    },
    { key: 'size', header: 'Size', hideOnMobile: true, sortValue: (c) => c.file_size || 0, render: (c) => <span className="tabular-nums">{formatSize(c.file_size)}</span> },
    { key: 'created', header: 'Created', sortValue: (c) => new Date(c.created_at).getTime(), render: (c) => <span className="whitespace-nowrap">{formatDate(c.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => {
        const isUnpaid = c.payment_status === 'PENDING_PAYMENT';
        return (
          <div className="flex items-center justify-end gap-2">
            {c.kind !== 'personal' && c.verification_token && (
              <a href={`/verify/${c.verification_token}`} target="_blank" rel="noopener noreferrer" className={buttonClass('quiet', 'px-3 py-1.5')}>
                Verify
              </a>
            )}
            {isUnpaid && c.order_id ? (
              <Button className="px-3 py-1.5" onClick={() => onPayOrder?.(Number(c.order_id))}>
                Pay now
              </Button>
            ) : (
              <Button variant="secondary" className="px-3 py-1.5" onClick={() => downloadOrReport(cardDownloadPath(c), c.file_name, onError ?? (() => {}))}>
                Download PDF
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      title="Saved cards"
      description="Download the PDF of any card you have ordered."
      rows={rows}
      columns={columns}
      rowKey={(c) => `${c.kind}-${c.id}`}
      search={{ value: search, onChange: setSearch, placeholder: 'Search cards' }}
      toolbar={<Button onClick={onOrderMore}>Order more cards</Button>}
      emptyMessage={q ? 'No cards match your search.' : 'Your cards will appear here after your first order.'}
    />
  );
}
