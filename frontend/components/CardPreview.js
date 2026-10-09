import ProtectedImage from './ProtectedImage';

export default function CardPreview({ style = 'classic', name = 'Alex Morgan', company = 'Your company', designation = 'Product Designer', email = 'hello@company.com', phone = '', logoPath, photoPath }) {
  return <div className={`card-preview preview-${style}`} aria-label={`${style} template preview`}>
    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em]"><span className="preview-company">{logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="preview-logo" />}{company}</span><span>✦</span></div>
    {photoPath && <ProtectedImage path={photoPath} alt={name} className="preview-photo" />}
    <div className="mt-7 text-lg font-semibold tracking-tight">{name}</div>
    <div className="mt-1 text-xs opacity-65">{designation}</div>
    <div className="mt-5 flex flex-wrap justify-between gap-2 text-[9px] opacity-60"><span>{email}</span><span>{phone || 'Business, beautifully connected.'}</span></div>
  </div>;
}
