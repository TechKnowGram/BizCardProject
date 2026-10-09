'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import CardPreview from './CardPreview';
import DesignEditor, { contrastError } from './DesignEditor';
import PdfPreview from './PdfPreview';
import BrandKit from './BrandKit';

const ideas = ['Clean tech feel, white background, colorful accent, generous space', 'Luxury navy and gold, serif typography, elegant thin frame', 'Minimal warm ivory, charcoal text, centered typography'];

export default function AiDesigner({ company, employee, onSaved }) {
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState(null);
  const [variants, setVariants] = useState([]);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function generate(refine = false, three = false) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await api(three ? '/templates/ai/variations' : '/templates/ai/generate', { method: 'POST', body: JSON.stringify({ prompt: prompt.trim(), previous_design: refine ? draft : null }) });
      setVariants(three ? result.designs : []);
      setDraft(three ? result.designs[0] : result); setBack(false);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const template = await api('/templates/ai/save', { method: 'POST', body: JSON.stringify(draft) });
      await onSaved(template);
      setMessage('Ready in your private company templates. Select it below to create cards.');
      setDraft(null); setVariants([]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="ai-designer">
    <div className="ai-designer-heading"><div><span className="panel-kicker">IMAGINE YOUR SIGNATURE</span><h3>Meet your AI designer</h3><p>Describe a mood. Shape a card. Make it yours.</p></div><span className="studio-pill gemini-badge"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2C12 8 8 12 2 12c6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z" /></svg>Powered by Gemini</span></div>
    <BrandKit />
    <div className="ai-designer-grid"><div>
      <label className="field-label" htmlFor="ai-prompt">What should your card feel like?</label>
      <textarea id="ai-prompt" className="input" rows={4} maxLength={2000} disabled={busy} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="A polished tech card with a white background, vibrant blue accent and clean typography..." />
      <div className="ai-ideas">{ideas.map(idea => <button key={idea} disabled={busy} onClick={() => setPrompt(idea)}>{idea.split(',')[0]}</button>)}</div>
      <p className="ai-note">Original styles, print-safe layouts. Only your prompt and saved brand preferences go to AI; keep confidential details out.</p>
      <div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={busy || prompt.trim().length < 10} onClick={() => generate()}>{busy ? 'Working…' : 'Generate design'} <span aria-hidden="true">✦</span></button><button className="btn-secondary" disabled={busy || prompt.trim().length < 10} onClick={() => generate(false, true)}>Explore 3 styles</button>{draft && <button className="btn-secondary" disabled={busy || prompt.trim().length < 10} onClick={() => generate(true)}>Refine this design</button>}</div>
      {draft && <DesignEditor design={draft} onChange={setDraft} disabled={busy} />}
      {error && <p className="ai-error" role="alert">{error}</p>}{message && <p className="ai-success" role="status">{message}</p>}
    </div><div className="ai-preview" aria-live="polite">{draft ? <><CardPreview back={back && draft.two_sided} website={company.website} logoPath={company.has_logo ? '/company/logo' : null} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} design={draft} company={company.name} name={employee?.name || 'Alex Morgan'} designation={employee?.designation || 'Product Designer'} department={employee?.department || 'Design'} email={employee?.email || 'hello@company.com'} phone={employee?.phone || '+880 1700 000000'} /><div><strong>{draft.name}</strong><p>{draft.description}</p><div className="ai-preview-actions"><button className="btn-secondary" disabled={busy || !!contrastError(draft)} onClick={() => setPdfOpen(true)}>Actual PDF preview</button>{draft.two_sided && <button className="btn-secondary" onClick={() => setBack(!back)}>{back ? 'Show front' : 'Show back'}</button>}<button className="btn-primary" disabled={busy || !!contrastError(draft)} onClick={save}>Use in my company</button></div></div></> : <div className="ai-placeholder"><span aria-hidden="true">✦</span><h4>Your next great first impression</h4><p>A new original design will appear here.<br />Preview it before saving.</p></div>}</div></div>
    {variants.length > 0 && <div className="ai-variations">{variants.map((item, index) => <button key={index} disabled={busy} aria-pressed={draft?.name === item.name} onClick={() => { setDraft(item); setBack(false); }}><CardPreview design={item} company={company.name} name={employee?.name} designation={employee?.designation} /><strong>0{index + 1} · {item.name}</strong><span>{item.description}</span></button>)}</div>}
    {pdfOpen && draft && <PdfPreview design={draft} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </section>;
}
