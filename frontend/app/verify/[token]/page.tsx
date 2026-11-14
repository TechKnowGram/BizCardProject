import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Brand from '@/components/ui/Brand';
import { cx } from '@/components/ui';
import type { Verification } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Card verification',
  description: 'Check that a business card was issued through BizCard and is still active.',
  robots: { index: false, follow: false },
};

function Field({ label, children, valueClass }: { label: string; children: ReactNode; valueClass?: string }) {
  return <div className="bg-white px-6 py-4"><dt className="text-xs text-slate-500">{label}</dt><dd className={cx('mt-0.5 text-sm font-semibold text-navy-900', valueClass)}>{children}</dd></div>;
}

type Outcome = { state: 'checked'; card: Verification | null } | { state: 'unavailable' };

async function lookUp(token: string): Promise<Outcome> {
  try {
    const base = process.env.BACKEND_URL || 'http://127.0.0.1:8001';
    const response = await fetch(`${base}/verify/cards/${encodeURIComponent(token)}`, { cache: 'no-store' });
    // A server problem must never be shown as "this card is fake".
    if (response.status >= 500) return { state: 'unavailable' };
    return { state: 'checked', card: response.ok ? await response.json() : null };
  } catch {
    return { state: 'unavailable' };
  }
}

const icons = {
  valid: <path d="m5 12 4.5 4.5L19 7" />,
  invalid: <path d="M12 7v6M12 17h.01" />,
  unavailable: <path d="M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
};

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const outcome = await lookUp(token);
  const card = outcome.state === 'checked' ? outcome.card : null;
  const status = outcome.state === 'unavailable' ? 'unavailable' : card?.valid ? 'valid' : 'invalid';
  const copy = {
    valid: { title: 'This card is genuine', text: 'It was issued through BizCard and is currently active.' },
    invalid: { title: 'This card could not be verified', text: 'The code is not valid, or the card has been withdrawn.' },
    unavailable: { title: 'Verification is temporarily unavailable', text: 'We could not reach the verification service. Please try again in a few minutes.' },
  }[status];

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-navy-950 px-5 pt-8 pb-20">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/" aria-label="BizCard home"><Brand light /></Link>
        <Link href="/" className="text-sm text-slate-300 hover:text-white">Back to BizCard</Link>
      </header>
      <section className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl max-sm:mt-10">
        <div className="border-b border-slate-100 px-8 py-8 text-center max-sm:px-5">
          <div className={cx('mx-auto mb-5 grid size-14 place-items-center rounded-full', status === 'valid' ? 'bg-emerald-50 text-emerald-600' : status === 'invalid' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600')}>
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[status]}</svg>
          </div>
          <p className="text-sm font-medium text-slate-500">Card verification</p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900 sm:text-3xl">{copy.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">{copy.text}</p>
        </div>
        {card && (
          <dl className="grid grid-cols-2 gap-px bg-slate-100 max-sm:grid-cols-1">
            <Field label="Name">{card.employee_name}</Field>
            <Field label="Employee ID">{card.employee_id}</Field>
            <Field label="Role">{card.designation}</Field>
            <Field label="Company">{card.company_name}</Field>
            <Field label="Status" valueClass={card.valid ? 'text-emerald-700' : 'text-red-700'}>{card.card_status}</Field>
            <Field label="Issued">{new Date(card.issued_at).toLocaleDateString()}</Field>
          </dl>
        )}
        <p className="bg-slate-50 px-8 py-4 text-center text-xs text-slate-500">Only details printed on the card are shown here. Email addresses and phone numbers stay private.</p>
      </section>
    </main>
  );
}
