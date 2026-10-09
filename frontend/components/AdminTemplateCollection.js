'use client';
import CardPreview from './CardPreview';
import StatusBadge from './StatusBadge';

export default function AdminTemplateCollection({ data, busy, onToggle, onSave }) {
  function card(template, privateDesign = false) {
    const saved = data.templates.some(item => item.style_key === `shared_${template.id}`);
    const company = data.companies.find(item => item.id === template.company_id);
    return <article className="template-option library-card" key={template.id}>
      <div className="library-card-preview"><CardPreview design={template.design} style={template.style_key} /></div>
      <div className="template-meta"><div><span className="library-label">{privateDesign ? company?.name || `Company #${template.company_id}` : 'SHARED COLLECTION'}</span><h3>{template.name}</h3><p>{template.description}</p></div></div>
      <div className="library-card-footer"><StatusBadge value={privateDesign ? saved ? 'SAVED' : 'PRIVATE' : template.is_active ? 'ACTIVE' : 'INACTIVE'} /><button className={privateDesign ? 'btn-primary' : 'btn-secondary'} disabled={busy || (privateDesign && saved)} onClick={() => privateDesign ? onSave(template.id) : onToggle(template)}>{privateDesign ? saved ? 'Saved to collection' : 'Save to collection' : template.is_active ? 'Deactivate' : 'Activate'}</button></div>
    </article>;
  }
  return <div className="template-collection"><section><div className="library-section-heading"><div><h3>Shared template collection</h3><p>Curated designs available to approved companies.</p></div><span>{data.templates.length} designs</span></div><div className="template-grid">{data.templates.map(template => card(template))}</div></section><section><div className="library-section-heading"><div><h3>Company designs</h3><p>Private company styles. Save a design here to publish a shared copy.</p></div><span>{data.companyDesigns.length} designs</span></div>{data.companyDesigns.length ? <div className="template-grid">{data.companyDesigns.map(template => card(template, true))}</div> : <div className="library-empty">Company designs will appear here when teams save their first style.</div>}</section></div>;
}
