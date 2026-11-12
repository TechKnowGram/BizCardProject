import type { ReactNode } from 'react';
import Link from 'next/link';
import Brand from '../../../components/Brand';
import { Eyebrow, cx } from '../../../components/ui';
import type { Verification } from '../../../lib/types';

function Field({ label, children, valueClass }: { label: string; children: ReactNode; valueClass?: string }) {
  return <div className="bg-white p-4"><dt className="text-3xs uppercase tracking-widest text-[#9297a4]">{label}</dt><dd className={cx('mt-1.25 text-sm font-semibold', valueClass)}>{children}</dd></div>;
}

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let card: Verification | null = null;
  try {
    const base = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${base}/verify/cards/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (response.ok) card = await response.json();
  } catch {}
  return <main className="min-h-screen bg-navy px-5 pb-17.5 pt-7.5"><header className="mx-auto flex w-full max-w-225 items-center justify-between"><Link href="/"><Brand light /></Link><Link href="/" className="text-xs text-slate-300">Back to BizCard</Link></header><section className="mx-auto mt-17.5 w-full max-w-155 rounded-[40px] bg-white p-12 text-center shadow-2xl max-sm:mt-10 max-sm:px-5.5 max-sm:py-8.5"><div className={cx('mx-auto mb-7 grid size-15.5 place-items-center rounded-full text-3xl font-extrabold', card?.valid ? 'bg-mint text-black' : 'bg-blush text-black')}>{card?.valid ? '✓' : '!'}</div><Eyebrow>PUBLIC CARD VERIFICATION</Eyebrow><h1 className="mt-3 text-4xl font-medium tracking-tight">{card?.valid ? 'This card is verified.' : 'Card could not be verified.'}</h1><p className="mx-auto mb-7.5 mt-3.75 max-w-110 text-sm leading-relaxed text-[#747b8b]">{card?.valid ? 'This visiting card was issued through BizCard and is currently active.' : 'The verification code is invalid, or this card is no longer active.'}</p>{card && <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-black/10 bg-black/10 text-left max-sm:grid-cols-1"><Field label="Employee">{card.employee_name}</Field><Field label="Employee ID">{card.employee_id}</Field><Field label="Designation">{card.designation}</Field><Field label="Company">{card.company_name}</Field><Field label="Status" valueClass={card.valid ? 'text-emerald-700' : 'text-red-700'}>{card.card_status}</Field><Field label="Issued">{new Date(card.issued_at).toLocaleDateString()}</Field></dl>}<p className="mt-6 text-2xs text-[#9a9eaa]">Only public professional information is shown. Email addresses and phone numbers remain private.</p></section></main>;
}
