import ProtectedImage from './ProtectedImage';

export default function CardPreview({ style = 'classic', name = 'Alex Morgan', company = 'Your company', designation = 'Product Designer', email = 'hello@company.com', phone = '', department = '', design, logoPath, photoPath, back = false, website }) {
  if (design) {
    const fonts = { Helvetica: 'Arial, sans-serif', 'Times-Roman': 'Georgia, serif', Courier: 'monospace' };
    if (back) return <div className="ai-card ai-card-stripe ai-card-back" style={{ background: design.background, color: design.text, fontFamily: fonts[design.font], '--ai-accent': design.accent }} aria-label="Back of card"><span className="ai-card-decoration" />{logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="ai-back-logo" />}<strong className="ai-back-company">{company}</strong><span className="ai-back-website">{website || 'Your people. Your brand.'}</span><span className="ai-back-qr" aria-label="Verification QR placeholder"><svg viewBox="0 0 21 21" aria-hidden="true"><path fill="currentColor" d="M1 1h7v7H1zM13 1h7v7h-7zM1 13h7v7H1zM10 10h3v3h-3zM14 10h2v5h-2zM18 10h2v2h-2zM10 16h3v4h-3zM15 17h5v3h-5zM18 13h2v3h-2z" /></svg></span></div>;
    return <div className={`ai-card ai-card-${design.decoration}`} style={{ background: design.background, color: design.text, fontFamily: fonts[design.font], '--ai-accent': design.accent }} aria-label={`${design.name} template preview`}>
      <span className="ai-card-decoration" />
      {logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="ai-card-logo" />}
      {photoPath && <ProtectedImage path={photoPath} alt={name} className="ai-card-photo" />}
      <div className={`ai-card-person ${photoPath ? 'with-photo' : design.layout}`}><strong>{name}</strong><span>{designation}</span><small>{department}</small></div>
      <div className="ai-card-contact"><span>{email}</span><span>{phone}</span></div>
      <span className="ai-card-qr" aria-label="QR placeholder"><svg viewBox="0 0 21 21" aria-hidden="true"><path fill="currentColor" d="M1 1h7v7H1zM13 1h7v7h-7zM1 13h7v7H1zM10 10h3v3h-3zM14 10h2v5h-2zM18 10h2v2h-2zM10 16h3v4h-3zM15 17h5v3h-5zM18 13h2v3h-2z"/><path fill="white" d="M2 2h5v5H2zM14 2h5v5h-5zM2 14h5v5H2z"/><path fill="currentColor" d="M3 3h3v3H3zM15 3h3v3h-3zM3 15h3v3H3z"/></svg><small>QR PREVIEW</small></span>
      <b className="ai-card-company">{company}</b>
    </div>;
  }
  return <div className={`card-preview preview-${style}`} aria-label={`${style} template preview`}>
    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em]"><span className="preview-company">{logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="preview-logo" />}{company}</span><span>✦</span></div>
    {photoPath && <ProtectedImage path={photoPath} alt={name} className="preview-photo" />}
    <div className="mt-7 text-lg font-semibold tracking-tight">{name}</div>
    <div className="mt-1 text-xs opacity-65">{designation}</div>
    <div className="mt-5 flex flex-wrap justify-between gap-2 text-[9px] opacity-60"><span>{email}</span><span>{phone || 'Business, beautifully connected.'}</span></div>
  </div>;
}
