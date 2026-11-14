'use client';

import { useEffect, useState } from 'react';
import { downloadOrReport } from '@/lib/api';
import type { User } from '@/lib/types';
import StatusBadge from '@/components/ui/StatusBadge';
import DataTable from '@/components/dashboard/DataTable';
import type { Column } from '@/components/dashboard/DataTable';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { Button, FieldLabel, buttonClass, cx, inputClass } from '@/components/ui';
import Icon from '@/components/ui/Icon';
import LiveCardPreview from '@/components/employee/LiveCardPreview';
import ImageTemplateCard from '@/components/cards/ImageTemplateCard';
import type { CardValues } from '@/components/cards/ImageTemplateCard';
import type { ImageTemplateDesign } from '@/lib/types';
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
}

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
}

const THEMES: ReadonlyArray<{ key: Theme; label: string; swatch: string }> = [
  { key: 'navy', label: 'Navy', swatch: 'bg-navy-950' },
  { key: 'clean', label: 'White', swatch: 'bg-white ring-1 ring-inset ring-slate-300' },
  { key: 'royal', label: 'Navy and gold', swatch: 'bg-navy-900 ring-2 ring-inset ring-amber-400' },
];

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
      {cardSubView === 'order' ? <DesignAndOrder {...props} /> : <SavedCards cardRows={cardRows} onError={props.onError} onOrderMore={() => setCardSubView('order')} />}
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
  cardTheme,
  setCardTheme,
  isMember,
  activeMembership,
  templates,
  busy,
  onCheckout,
  onGoToCompany,
}: CardOrderStudioProps) {
  const quantity = Number(order.quantity || 1);
  const isCompany = cardOrderType === 'COMPANY';
  // The server decides who pays from the membership; mirror that here so the price shown is the price charged.
  const isCompanySponsored = isCompany && activeMembership?.payer === 'COMPANY';
  const total = isCompanySponsored ? 0 : quantity * PRICE;
  const selectedTemplate = templates.find((t) => String(t.id) === String(order.template_id));
  const companyName = activeMembership?.company?.name || 'your company';
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  // A company design made from an uploaded card: show the real card, filled with the employee's details.
  const imageDesign: ImageTemplateDesign | null = isCompany && selectedTemplate?.design?.kind === 'image' ? (selectedTemplate.design as ImageTemplateDesign) : null;
  const hasBack = Boolean(imageDesign?.back);
  const cardValues: CardValues = {
    name: order.name || user?.username || '',
    title: order.designation,
    department: order.department,
    phone: order.phone,
    email: activeMembership?.official_email || user?.email || '',
    website: activeMembership?.company?.website,
    address: activeMembership?.company?.address,
    company: activeMembership?.company?.name,
    photoPath: null,
    logoPath: null,
  };

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
              meta={isMember ? (activeMembership?.payer === 'COMPANY' ? 'Paid by company' : `৳${PRICE} per card`) : 'Company members only'}
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

            <SectionCard title="Style">
              <div role="radiogroup" aria-label="Card colour" className="grid gap-3 sm:grid-cols-3">
                {THEMES.map((t) => {
                  const active = cardTheme === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setCardTheme(t.key)}
                      className={cx(
                        'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-sm font-medium transition-colors',
                        active ? 'border-brand-600 bg-brand-50/60 text-brand-700 ring-1 ring-brand-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                      )}
                    >
                      <span className={cx('size-5 shrink-0 rounded-full', t.swatch)} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Quantity">
              <QuantityField quantity={order.quantity} onChange={(qty) => setOrder({ ...order, quantity: qty })} />
            </SectionCard>

            <SectionCard title="Order summary">
              <SummaryList
                rows={[
                  { label: 'Price per card', value: `৳${PRICE}` },
                  { label: 'Cards', value: String(quantity) },
                  { label: 'PDF download', value: 'Included' },
                ]}
                total={`৳${total}`}
                totalNote={`${quantity} × ৳${PRICE}`}
              />
              <Button className="mt-6 w-full py-3" disabled={busy || !order.name.trim()} onClick={() => onCheckout(false)}>
                {busy ? 'Placing order…' : `Order personal cards · ৳${total}`}
              </Button>
              {!order.name.trim() && <p className="mt-2 text-center text-xs text-slate-500">Enter your full name to continue.</p>}
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
                  { label: 'Card payment on your membership', value: activeMembership?.payer === 'COMPANY' ? 'Paid by company' : 'Paid by you' },
                  { label: 'Cards', value: String(quantity) },
                  { label: 'PDF download', value: 'Included' },
                ]}
                total={`৳${total}`}
                totalNote={isCompanySponsored ? `Paid by ${companyName}` : `${quantity} × ৳${PRICE}`}
              />
              <Button className="mt-6 w-full py-3" disabled={busy || !order.template_id} onClick={() => onCheckout(true)}>
                {busy ? 'Placing order…' : order.template_id ? `Order company cards · ৳${total}` : 'Choose a design to continue'}
              </Button>
            </SectionCard>
          </>
        )}
      </div>

      <div className="order-first lg:sticky lg:top-24 lg:order-none lg:col-span-5">
        <SectionCard title="Preview">
          {imageDesign ? (
            <div className="rounded-xl bg-slate-50 px-4 py-6 sm:px-6">
              {hasBack && (
                <div className="mx-auto mb-3 flex w-fit rounded-lg border border-slate-200 bg-white p-0.5" role="tablist" aria-label="Side of the card">
                  {(['front', 'back'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={previewSide === value}
                      onClick={() => setPreviewSide(value)}
                      className={cx('rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors', previewSide === value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
              <ImageTemplateCard design={imageDesign} values={cardValues} side={hasBack ? previewSide : 'front'} className="mx-auto max-w-md" />
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-6 sm:px-6">
              <LiveCardPreview
                theme={cardTheme}
                name={order.name || user?.username || ''}
                designation={order.designation}
                department={order.department}
                phone={order.phone}
                email={isCompany ? activeMembership?.official_email || user?.email || '' : user?.email || 'contact@bizcard.me'}
                companyName={activeMembership?.company?.name}
                isCompany={isCompany}
                templateName={selectedTemplate?.name}
              />
            </div>
          )}
          <p className="mt-4 text-sm text-slate-500">
            {isCompany
              ? 'This is your card on the company design, with your details. The PDF uses the same positions, colours and sizes.'
              : 'The preview updates as you type. Your PDF is 3.5 × 2 in and ready to print.'}
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

function SavedCards({ cardRows, onOrderMore, onError }: { cardRows: Row[]; onOrderMore: () => void; onError?: (message: string) => void }) {
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
    { key: 'status', header: 'Status', render: (c) => <StatusBadge value={c.status} /> },
    { key: 'size', header: 'Size', hideOnMobile: true, sortValue: (c) => c.file_size || 0, render: (c) => <span className="tabular-nums">{formatSize(c.file_size)}</span> },
    { key: 'created', header: 'Created', sortValue: (c) => new Date(c.created_at).getTime(), render: (c) => <span className="whitespace-nowrap">{formatDate(c.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-2">
          {c.kind !== 'personal' && c.verification_token && (
            <a href={`/verify/${c.verification_token}`} target="_blank" rel="noopener noreferrer" className={buttonClass('quiet', 'px-3 py-1.5')}>
              Verify
            </a>
          )}
          <Button variant="secondary" className="px-3 py-1.5" onClick={() => downloadOrReport(cardDownloadPath(c), c.file_name, onError ?? (() => {}))}>
            Download PDF
          </Button>
        </div>
      ),
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
