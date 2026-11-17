'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button, Notice } from '@/components/ui';
import ReviewDialog from '@/components/ui/ReviewDialog';

export interface PaymentOrderInfo {
  id: number;
  total_amount: number;
  quantity?: number;
  payer?: string;
  request_id?: number | null;
}

export interface PaymentModalProps {
  order: PaymentOrderInfo;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentGateway = 'BKASH_SANDBOX' | 'NAGAD_SANDBOX' | 'CARD_SANDBOX' | 'GATEWAY_SANDBOX';

interface GatewayOption {
  id: PaymentGateway;
  name: string;
  badge: string;
  description: string;
  accentBg: string;
  accentBorder: string;
  badgeTone: string;
}

const GATEWAY_OPTIONS: GatewayOption[] = [
  {
    id: 'BKASH_SANDBOX',
    name: 'bKash',
    badge: 'Ready for Gateway',
    description: 'Instant sandbox simulation for bKash Payment Gateway.',
    accentBg: 'hover:bg-pink-50/50',
    accentBorder: 'border-pink-200 peer-checked:border-pink-600 peer-checked:bg-pink-50/40',
    badgeTone: 'bg-pink-100 text-pink-700',
  },
  {
    id: 'NAGAD_SANDBOX',
    name: 'Nagad',
    badge: 'Ready for Gateway',
    description: 'Instant sandbox simulation for Nagad Online Gateway.',
    accentBg: 'hover:bg-orange-50/50',
    accentBorder: 'border-orange-200 peer-checked:border-orange-600 peer-checked:bg-orange-50/40',
    badgeTone: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'CARD_SANDBOX',
    name: 'Credit / Debit Card',
    badge: 'Visa / Mastercard',
    description: 'Direct card checkout gateway simulation.',
    accentBg: 'hover:bg-blue-50/50',
    accentBorder: 'border-blue-200 peer-checked:border-blue-600 peer-checked:bg-blue-50/40',
    badgeTone: 'bg-blue-100 text-blue-700',
  },
];

export default function PaymentModal({ order, onClose, onSuccess }: PaymentModalProps) {
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('BKASH_SANDBOX');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    setBusy(true);
    setError('');
    try {
      await api(`/orders/${order.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ method: selectedGateway }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Payment processing failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReviewDialog
      title={`Pay for Order #${order.id}`}
      eyebrow="Payment Gateway"
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-6">
        {error && <Notice tone="error">{error}</Notice>}

        {/* Order summary tile */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total payable</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-navy-900 tabular-nums">
              ৳{Number(order.total_amount).toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            {order.quantity ? (
              <p className="font-medium text-slate-700">{order.quantity} {order.quantity === 1 ? 'card' : 'cards'}</p>
            ) : null}
            <p className="mt-0.5 text-emerald-600 font-medium">No hidden fees</p>
          </div>
        </div>

        {/* Gateway Selection */}
        <div>
          <label className="block text-sm font-semibold text-navy-900 mb-3">
            Select payment channel
          </label>
          <div className="space-y-2.5">
            {GATEWAY_OPTIONS.map((g) => {
              const isChecked = selectedGateway === g.id;
              return (
                <label
                  key={g.id}
                  className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                    isChecked
                      ? 'border-brand-600 bg-brand-50/30 ring-1 ring-brand-500'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_gateway"
                    value={g.id}
                    checked={isChecked}
                    onChange={() => setSelectedGateway(g.id)}
                    className="mt-1 size-4 accent-brand-600"
                    disabled={busy}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-navy-900 text-sm">{g.name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${g.badgeTone}`}>
                        {g.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{g.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Note about real gateway integration */}
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-900">
          <span className="font-semibold">Gateway Architecture Note:</span> This sandbox completes the payment lifecycle, updates invoices, unlocks secure PDF and .ai vector downloads, and logs audit events. When live credentials (bKash/Nagad Merchant) are plugged in, this modal triggers the redirect/checkout URL seamlessly.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={busy}>
            {busy ? 'Processing...' : `Confirm & Pay ৳${Number(order.total_amount).toLocaleString()}`}
          </Button>
        </div>
      </div>
    </ReviewDialog>
  );
}
