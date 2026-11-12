'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import type { CardDesign, CompanySummary, Employee, Template } from '../lib/types';
import CardPreview from './CardPreview';
import DesignEditor, { contrastError } from './DesignEditor';
import PdfPreview from './PdfPreview';
import BrandKit from './BrandKit';
import { Button, FieldLabel, buttonClass, inputClass } from './ui';
import { Kicker, aiErrorClass, aiParagraphClass, aiSuccessClass, pillClass } from './StudioParts';

const ideas = ['Clean tech feel, white background, colorful accent, generous space', 'Luxury navy and gold, serif typography, elegant thin frame', 'Minimal warm ivory, charcoal text, centered typography'];

export interface AiDesignerProps {
  company: CompanySummary;
  employee?: Employee;
  onSaved: (template: Template) => void | Promise<void>;
}

export default function AiDesigner({ company, employee, onSaved }: AiDesignerProps) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState<CardDesign | null>(null);
  const [variants, setVariants] = useState<CardDesign[]>([]);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function generate(refine = false, three = false) {
    setBusy(true); setError(''); setMessage('');
    try {
      const body = JSON.stringify({ prompt: prompt.trim(), previous_design: refine ? draft : null });
      if (three) {
        const result = await api<{ designs: CardDesign[] }>('/templates/ai/variations', { method: 'POST', body });
        setVariants(result.designs);
        setDraft(result.designs[0]);
      } else {
        const result = await api<CardDesign>('/templates/ai/generate', { method: 'POST', body });
        setVariants([]);
        setDraft(result);
      }
      setBack(false);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const template = await api<Template>('/templates/ai/save', { method: 'POST', body: JSON.stringify(draft) });
      await onSaved(template);
      setMessage('Ready in your private company templates. Select it below to create cards.');
      setDraft(null); setVariants([]);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  const logoPath = company.has_logo ? '/company/logo' : null;
  const promptShort = busy || prompt.trim().length < 10;
  const draftBlocked = busy || (!!draft && !!contrastError(draft));
  return <section className="mb-7.5 rounded-[40px] border border-[#e3e8e6] bg-[linear-gradient(125deg,#f6f8f7,#f3f8ff)] p-7 max-md:p-5">
    <div className="mb-6 flex justify-between gap-4 max-md:flex-col"><div><Kicker>IMAGINE YOUR SIGNATURE</Kicker><h3 className="my-1.5 text-2xl font-[750] tracking-tighter">Meet your AI designer</h3><p className={aiParagraphClass}>Describe a mood. Shape a card. Make it yours.</p></div><span className={`${pillClass} inline-flex items-center gap-1.75 self-start whitespace-nowrap`}><svg className="flex-none text-[#7362df]" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2C12 8 8 12 2 12c6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z" /></svg>Powered by Gemini</span></div>
    <BrandKit />
    <div className="grid grid-cols-2 items-center gap-8 max-md:grid-cols-1"><div>
      <FieldLabel htmlFor="ai-prompt">What should your card feel like?</FieldLabel>
      <textarea id="ai-prompt" className={`${inputClass} min-h-28.75 resize-y`} rows={4} maxLength={2000} disabled={busy} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="A polished tech card with a white background, vibrant blue accent and clean typography..." />
      <div className="my-3 flex flex-wrap gap-1.75">{ideas.map(idea => <button key={idea} className="rounded-[28px] border border-[#ded9ec] bg-white px-2.5 py-1.75 text-xs" disabled={busy} onClick={() => setPrompt(idea)}>{idea.split(',')[0]}</button>)}</div>
      <p className={`mb-4.5 ${aiParagraphClass}`}>Original styles, print-safe layouts. Only your prompt and saved brand preferences go to AI; keep confidential details out.</p>
      <div className="flex flex-wrap gap-2"><button className={buttonClass('primary')} disabled={promptShort} onClick={() => generate()}>{busy ? 'Working…' : 'Generate design'} <span aria-hidden="true">✦</span></button><Button variant="secondary" disabled={promptShort} onClick={() => generate(false, true)}>Explore 3 styles</Button>{draft && <Button variant="secondary" disabled={promptShort} onClick={() => generate(true)}>Refine this design</Button>}</div>
      {draft && <DesignEditor design={draft} onChange={setDraft} disabled={busy} />}
      {error && <p className={aiErrorClass} role="alert">{error}</p>}{message && <p className={aiSuccessClass} role="status">{message}</p>}
    </div><div className="min-w-0 text-center" aria-live="polite">{draft ? <><CardPreview className="mx-auto mb-4" back={back && draft.two_sided} website={company.website} logoPath={logoPath} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} design={draft} company={company.name} name={employee?.name || 'Alex Morgan'} designation={employee?.designation || 'Product Designer'} department={employee?.department || 'Design'} email={employee?.email || 'hello@company.com'} phone={employee?.phone || '+880 1700 000000'} /><div><strong className="text-base">{draft.name}</strong><p className={`mb-3.5 mt-1.5 ${aiParagraphClass}`}>{draft.description}</p><div className="flex flex-wrap justify-center gap-2"><Button variant="secondary" className="text-xs!" disabled={draftBlocked} onClick={() => setPdfOpen(true)}>Actual PDF preview</Button>{draft.two_sided && <Button variant="secondary" className="text-xs!" onClick={() => setBack(!back)}>{back ? 'Show front' : 'Show back'}</Button>}<Button variant="primary" className="text-xs!" disabled={draftBlocked} onClick={save}>Use in my company</Button></div></div></> : <div className="rounded-[28px] border border-dashed border-[#cfc4e6] px-4 py-10.5"><span className="block text-5xl text-[#7755bc]" aria-hidden="true">✦</span><h4 className="text-lg font-bold">Your next great first impression</h4><p className={`mb-3.5 mt-1.5 ${aiParagraphClass}`}>A new original design will appear here.<br />Preview it before saving.</p></div>}</div></div>
    {variants.length > 0 && <div className="mt-7 grid grid-cols-3 gap-4 max-sm:grid-cols-1">{variants.map((item, index) => <button key={index} className="min-w-0 rounded-[28px] border border-[#ded7e9] bg-white p-3 text-left aria-pressed:border-[#8860be] aria-pressed:ring-3 aria-pressed:ring-[#8860be12]" disabled={busy} aria-pressed={draft?.name === item.name} onClick={() => { setDraft(item); setBack(false); }}><CardPreview design={item} company={company.name} name={employee?.name} designation={employee?.designation} /><strong className="mb-1.25 mt-3.5 block text-xs [overflow-wrap:anywhere]">0{index + 1} · {item.name}</strong><span className="block text-2xs leading-relaxed text-[#8d8096]">{item.description}</span></button>)}</div>}
    {pdfOpen && draft && <PdfPreview design={draft} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </section>;
}
