'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import type { CardDesign, CompanySummary, Employee, Template } from '../lib/types';
import CardPreview from './CardPreview';
import DesignEditor, { contrastError } from './DesignEditor';
import PdfPreview from './PdfPreview';
import BrandKit from './BrandKit';
import { Button, cx, inputClass } from './ui';
import { StudioHeading, aiErrorClass, aiParagraphClass, aiSuccessClass, optionClass, studioLabelClass } from './StudioParts';

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
      setMessage('Saved to your company templates. Select it under Card designs to use it.');
      setDraft(null); setVariants([]);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  const logoPath = company.has_logo ? '/company/logo' : null;
  const promptShort = busy || prompt.trim().length < 10;
  const draftBlocked = busy || (!!draft && !!contrastError(draft));
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
    <div className="border-b border-slate-100 px-6 py-5">
      <StudioHeading
        title="Create a design from a description"
        description="Describe the look you want. You can preview the result, adjust it and save it as a company template."
        aside={<span className="text-xs text-slate-500">Generated with Gemini</span>}
      />
    </div>
    <div className="space-y-6 p-6">
      <BrandKit />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <div>
          <label htmlFor="ai-prompt" className={studioLabelClass}>Describe your card</label>
          <textarea id="ai-prompt" className={cx(inputClass, 'min-h-28 resize-y')} rows={4} maxLength={2000} disabled={busy} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="For example: white background, blue accent, clean modern typography" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Examples:</span>
            {ideas.map(idea => <button type="button" key={idea} className={optionClass(prompt === idea, 'px-2.5 py-1 text-xs text-slate-700')} disabled={busy} onClick={() => setPrompt(idea)}>{idea.split(',')[0]}</button>)}
          </div>
          <p className={cx('mt-4', aiParagraphClass)}>Only your description and saved brand preferences are sent to the AI service. Do not include confidential details.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={promptShort} onClick={() => generate()}>{busy ? 'Working…' : 'Generate design'}</Button>
            <Button variant="secondary" disabled={promptShort} onClick={() => generate(false, true)}>Show 3 options</Button>
            {draft && <Button variant="secondary" disabled={promptShort} onClick={() => generate(true)}>Refine this design</Button>}
          </div>
          {prompt.trim().length > 0 && prompt.trim().length < 10 && <p className="mt-2 text-xs text-slate-500">Write at least 10 characters.</p>}
          {draft && <DesignEditor design={draft} onChange={setDraft} disabled={busy} />}
          {error && <p className={aiErrorClass} role="alert">{error}</p>}
          {message && <p className={aiSuccessClass} role="status">{message}</p>}
        </div>

        <div className="min-w-0" aria-live="polite">
          {draft ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <CardPreview className="mx-auto" back={back && draft.two_sided} website={company.website} logoPath={logoPath} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} design={draft} company={company.name} name={employee?.name || 'Alex Morgan'} designation={employee?.designation || 'Product Designer'} department={employee?.department || 'Design'} email={employee?.email || 'hello@company.com'} phone={employee?.phone || '+880 1700 000000'} />
            <p className="mt-4 text-sm font-semibold text-navy-900">{draft.name}</p>
            {draft.description && <p className={cx('mt-1', aiParagraphClass)}>{draft.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" className="px-3 py-1.5" disabled={draftBlocked} onClick={() => setPdfOpen(true)}>Preview PDF</Button>
              {draft.two_sided && <Button variant="secondary" className="px-3 py-1.5" onClick={() => setBack(!back)}>{back ? 'Show front' : 'Show back'}</Button>}
              <Button className="px-3 py-1.5" disabled={draftBlocked} onClick={save}>Save as company template</Button>
            </div>
          </div> : <div className="grid min-h-60 place-content-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-navy-900">No design yet</p>
            <p className={cx('mt-1', aiParagraphClass)}>Your generated design will appear here so you can check it before saving.</p>
          </div>}
        </div>
      </div>

      {variants.length > 0 && <div>
        <p className={studioLabelClass}>Options</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{variants.map((item, index) => {
          const selected = draft?.name === item.name;
          return <button type="button" key={index} className={optionClass(selected, 'min-w-0 p-3')} disabled={busy} aria-pressed={selected} onClick={() => { setDraft(item); setBack(false); }}>
            <CardPreview design={item} company={company.name} name={employee?.name} designation={employee?.designation} />
            <span className={cx('mt-3 block text-sm font-medium [overflow-wrap:anywhere]', selected ? 'text-brand-700' : 'text-navy-900')}>Option {index + 1}: {item.name}</span>
            {item.description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.description}</span>}
          </button>;
        })}</div>
      </div>}
    </div>
    {pdfOpen && draft && <PdfPreview design={draft} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </section>;
}
