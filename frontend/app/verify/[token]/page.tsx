import type { ReactNode } from 'react';
import Link from 'next/link';
import Brand from '../../../components/Brand';
import { cx } from '../../../components/ui';
import type { Verification } from '../../../lib/types';

function Field({ label, children, valueClass }: { label: string; children: ReactNode; valueClass?: string }) {
  return <div className="bg-white px-6 py-4"><dt className="text-xs text-slate-500">{label}</dt><dd className={cx('mt-0.5 text-sm font-semibold text-navy-900', valueClass)}>{children}</dd></div>;
}

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let card: Verification | null = null;
  try {
    const base = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${base}/verify/cards/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (response.ok) card = await response.json();
  } catch {}
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-navy-950 px-5 pt-8 pb-20">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/" aria-label="BizCard home"><Brand light /></Link>
        <Link href="/" className="text-sm text-slate-300 hover:text-white">Back to BizCard</Link>
      </header>
      <section className="mx-auto mt-16 w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl max-sm:mt-10">
        <div className="border-b border-slate-100 px-8 py-8 text-center max-sm:px-5">
          <div className={cx('mx-auto mb-5 grid size-14 place-items-center rounded-full text-2xl font-semibold', card?.valid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>{card?.valid ? '✓' : '!'}</div>
          <p className="text-xs font-semibold tracking-wider text-iris-500 uppercase">Card verification</p>
          <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{card?.valid ? 'This card is genuine' : 'This card could not be verified'}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">{card?.valid ? 'It was issued through BizCard and is currently active.' : 'The code is not valid, or the card has been withdrawn.'}</p>
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
