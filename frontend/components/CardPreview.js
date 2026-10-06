export default function CardPreview({ style = 'classic', name = 'Alex Morgan', company = 'Your company', designation = 'Product Designer' }) {
  return <div className={`card-preview preview-${style}`} aria-label={`${style} template preview`}>
    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[.2em]"><span>{company}</span><span>✦</span></div>
    <div className="mt-7 text-lg font-semibold tracking-tight">{name}</div>
    <div className="mt-1 text-xs opacity-65">{designation}</div>
    <div className="mt-5 flex justify-between text-[9px] opacity-60"><span>hello@company.com</span><span>Business, beautifully connected.</span></div>
  </div>;
}
