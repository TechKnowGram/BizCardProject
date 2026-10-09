'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { contrastError } from './DesignEditor';

export default function BrandKit() {
  const [kit, setKit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { let active = true; api('/templates/brand-kit').then(result => { if (active) setKit(result); }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, []);
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await api('/templates/brand-kit', { method: 'PUT', body: JSON.stringify(kit) }); setMessage('Brand preferences saved. Your next AI design will use them.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <details className="brand-kit"><summary><div><strong>Your Brand Kit</strong><span>A familiar palette. A consistent identity.</span></div><span>Edit preferences</span></summary>{kit && <form onSubmit={save}><div className="editor-colors">{['background', 'text', 'accent'].map(key => <label key={key}><span>{key}</span><div><input aria-label={`Brand ${key}`} type="color" value={kit[key]} onChange={e => { setMessage(''); setKit({ ...kit, [key]: e.target.value }); }} /><code>{kit[key]}</code></div></label>)}</div><label>Preferred font<select className="input" value={kit.font} onChange={e => setKit({ ...kit, font: e.target.value })}><option value="Helvetica">Clean sans</option><option value="Times-Roman">Editorial serif</option><option value="Courier">Modern mono</option></select></label><p className="ai-note">Your uploaded company logo is included in card previews and PDFs.</p>{contrastError(kit) && <p className="ai-error">{contrastError(kit)}</p>}<button className="btn-secondary" disabled={busy || !!contrastError(kit)}>{busy ? 'Saving…' : 'Save Brand Kit'}</button></form>}{error && <p role="alert" className="ai-error">{error}</p>}{message && <p role="status" className="ai-success">{message}</p>}</details>;
}
