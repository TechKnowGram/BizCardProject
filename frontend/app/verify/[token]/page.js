import Link from 'next/link';
import Brand from '../../../components/Brand';

export default async function VerifyPage({ params }) {
  const { token } = await params;
  let card = null;
  try {
    const base = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${base}/verify/cards/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (response.ok) card = await response.json();
  } catch {}
  return <main className="verification-page"><header><Link href="/"><Brand light /></Link><Link href="/" className="text-xs text-slate-300">Back to BizCard</Link></header><section className="verification-card"><div className={card?.valid ? 'verification-icon valid' : 'verification-icon invalid'}>{card?.valid ? '✓' : '!'}</div><p className="eyebrow">PUBLIC CARD VERIFICATION</p><h1>{card?.valid ? 'This card is verified.' : 'Card could not be verified.'}</h1><p className="verification-copy">{card?.valid ? 'This visiting card was issued through BizCard and is currently active.' : 'The verification code is invalid, or this card is no longer active.'}</p>{card && <dl><div><dt>Employee</dt><dd>{card.employee_name}</dd></div><div><dt>Employee ID</dt><dd>{card.employee_id}</dd></div><div><dt>Designation</dt><dd>{card.designation}</dd></div><div><dt>Company</dt><dd>{card.company_name}</dd></div><div><dt>Status</dt><dd className={card.valid ? 'text-emerald-700' : 'text-red-700'}>{card.card_status}</dd></div><div><dt>Issued</dt><dd>{new Date(card.issued_at).toLocaleDateString()}</dd></div></dl>}<p className="privacy-note">Only public professional information is shown. Email addresses and phone numbers remain private.</p></section></main>;
}
