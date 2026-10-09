'use client';

import { useState } from 'react';
import CardPreview from './CardPreview';
import Icon from './Icon';
import AiDesigner from './AiDesigner';
import PdfPreview from './PdfPreview';

export default function CardStudio({ company, employees, templates, templateId, onChoose, onSaved, busy = false }) {
  const active = employees.filter(employee => employee.is_active);
  const [employeeId, setEmployeeId] = useState(active[0]?.id || '');
  const [draftId, setDraftId] = useState(templateId || templates[0]?.id);
  const [surface, setSurface] = useState('light');
  const [zoom, setZoom] = useState(1);
  const [back, setBack] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const employee = active.find(item => String(item.id) === String(employeeId)) || active[0];
  const template = templates.find(item => item.id === draftId) || templates[0];
  if (!template) return <div className="premium-empty"><h3>No active templates available</h3><p>Your administrator can activate a company card style.</p></div>;
  return <section className="panel studio-panel">
    <div className="panel-header"><div><span className="panel-kicker">YOUR BRAND, IN FOCUS</span><h2>Card Studio</h2><p>Explore your signature style with real team details.</p></div><span className="studio-pill">Your design collection</span></div>
    <AiDesigner company={company} employee={employee} onSaved={onSaved} />
    <div className="studio-layout">
      <aside className="studio-controls"><label className="field-label" htmlFor="studio-employee">Preview employee</label><select id="studio-employee" className="input" value={employeeId} onChange={event => setEmployeeId(event.target.value)}>{active.length ? active.map(item => <option value={item.id} key={item.id}>{item.name}</option>) : <option value="">Sample employee</option>}</select><p className="studio-control-label">Signature styles</p><div className="studio-styles">{templates.map((item, index) => <button key={item.id} aria-pressed={draftId === item.id} className={draftId === item.id ? 'active' : ''} onClick={() => setDraftId(item.id)}><span>0{index + 1}</span><div><strong>{item.name}</strong><small>{item.description}</small></div><Icon name={draftId === item.id ? 'check' : 'arrow'} /></button>)}</div><div className="studio-brand-note"><Icon name="check" /><p>Company-owned data.<br /><strong>One consistent brand.</strong></p></div></aside>
      <div className={`studio-stage ${surface}`}><div className="studio-stage-top"><span><i /> LIVE DESIGN PREVIEW</span><button className="btn-secondary" onClick={() => setSurface(surface === 'light' ? 'dark' : 'light')}>{surface === 'light' ? 'Dark' : 'Light'} surface</button></div><div className="studio-card-space"><div className={`studio-flipper ${back ? 'is-back' : ''}`} style={{ '--preview-scale': zoom }}><div className="studio-face"><CardPreview design={template.design} department={employee?.department} style={template.style_key} company={company.name} name={employee?.name || 'Your employee'} designation={employee?.designation || 'Job title'} email={employee?.email || 'name@company.com'} phone={employee?.phone || ''} logoPath={company.has_logo ? '/company/logo' : null} photoPath={employee?.has_photo ? `/employees/${employee.id}/photo` : null} /></div><div className="studio-face studio-back">{template.design?.two_sided ? <CardPreview design={template.design} back company={company.name} website={company.website} logoPath={company.has_logo ? '/company/logo' : null} /> : <><strong>{company.name}</strong><span className="studio-star">✦</span><p>{company.website || 'Your people. Your brand.'}</p><small>Brand view · exported PDF is single-sided</small></>}</div></div></div><div className="studio-toolbar"><button className="btn-secondary" onClick={() => setPdfOpen(true)}>Actual PDF preview</button><button className="btn-secondary" onClick={() => setBack(!back)}><Icon name="flip" /> {back ? 'Employee view' : 'Brand view'}</button><div><button aria-label="Zoom out" disabled={zoom <= .85} onClick={() => setZoom(value => Math.max(.85, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="Zoom in" disabled={zoom >= 1.15} onClick={() => setZoom(value => Math.min(1.15, value + .1))}>+</button></div></div></div>
    </div>
    <div className="studio-footer"><div><strong>{template.name}</strong><p>{draftId === templateId ? 'Current company standard' : 'Previewing a new company standard'}</p></div><button className="btn-primary" disabled={busy || draftId === templateId} onClick={() => onChoose(draftId)}>{busy ? 'Saving…' : draftId === templateId ? 'Selected template' : `Use ${template.name}`} <Icon name="check" /></button></div>
    {pdfOpen && <PdfPreview templateId={template.id} employeeId={employee?.id} onClose={() => setPdfOpen(false)} />}
  </section>;
}
