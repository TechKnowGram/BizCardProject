import type { CSSProperties } from 'react';
import type { CardDesign } from '../lib/types';
import { cx } from './ui';
import ProtectedImage from './ProtectedImage';

export interface CardPreviewProps {
  style?: string;
  name?: string;
  company?: string;
  designation?: string;
  email?: string;
  phone?: string;
  department?: string;
  design?: CardDesign | null;
  logoPath?: string | null;
  photoPath?: string | null;
  back?: boolean;
  website?: string | null;
  /** 'studio' fills its parent face (card studio), 'library' is a fluid container-query card (template library). */
  variant?: 'default' | 'studio' | 'library';
  className?: string;
}

const fonts: Record<CardDesign['font'], string> = { Helvetica: 'Arial, sans-serif', 'Times-Roman': 'Georgia, serif', Courier: 'monospace' };

const decorationClass: Record<CardDesign['decoration'], string> = {
  stripe: 'left-0 top-0 h-[5.55%] w-full',
  corner: '-right-[12%] -top-[21%] aspect-square w-[24%] rounded-full',
  frame: 'inset-[5.5%_3.2%] border-3 border-(color:--ai-accent) bg-transparent!',
  minimal: 'left-[8%] top-[13.2%] h-[2%] w-[12%]',
};

const qrPath = 'M1 1h7v7H1zM13 1h7v7h-7zM1 13h7v7H1zM10 10h3v3h-3zM14 10h2v5h-2zM18 10h2v2h-2zM10 16h3v4h-3zM15 17h5v3h-5zM18 13h2v3h-2z';

const classicStyles: Record<string, string> = {
  classic: 'border border-[#e2e6ed] border-t-7 border-t-[#243e4f] bg-white text-[#243e4f]',
  modern: 'border-l-7 border-l-[#c7e79d] bg-[#24243c] bg-[radial-gradient(circle_at_top_right,#6254a8,transparent_65%)] text-white',
  minimal: 'border-l-3 border-l-[#7d8b70] bg-[#f4f1e8] text-[#4f4a3c]',
};

export default function CardPreview({ style = 'classic', name = 'Alex Morgan', company = 'Your company', designation = 'Product Designer', email = 'hello@company.com', phone = '', department = '', design, logoPath, photoPath, back = false, website, variant = 'default', className }: CardPreviewProps) {
  const studio = variant === 'studio';
  const library = variant === 'library';
  if (design) {
    const base = cx(
      'relative aspect-[7/4] overflow-hidden text-left [container-type:inline-size]',
      studio ? 'm-0 h-full w-full max-w-none rounded-[inherit] shadow-none' : cx('w-full rounded-md shadow-lg', library ? 'max-w-none' : 'max-w-94.5'),
      className,
    );
    const cardStyle = { background: design.background, color: design.text, fontFamily: fonts[design.font], '--ai-accent': design.accent } as CSSProperties;
    if (back) return <div className={base} style={cardStyle} aria-label="Back of card">
      <span className="absolute left-0 top-0 h-[5.55%] w-full bg-(--ai-accent)" />
      {logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="absolute left-[42%] top-[16%] h-[20%] w-[16%] object-contain" />}
      <strong className={cx('absolute left-[8%] right-[8%] top-[43%] overflow-hidden text-ellipsis whitespace-nowrap text-center', 'text-[length:7cqw]')}>{company}</strong>
      <span className={cx('absolute bottom-[21%] left-[8%] max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap', 'text-[length:3.2cqw]')}>{website || 'Your people. Your brand.'}</span>
      <span className="absolute bottom-[17%] right-[7%] aspect-square w-[17%] bg-white p-0.75 text-[#18233f]" aria-label="Verification QR placeholder"><svg viewBox="0 0 21 21" aria-hidden="true"><path fill="currentColor" d={qrPath} /></svg></span>
    </div>;
    return <div className={base} style={cardStyle} aria-label={`${design.name} template preview`}>
      <span className={cx('absolute bg-(--ai-accent)', decorationClass[design.decoration])} />
      {logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="absolute right-[9.5%] top-[12%] h-[11%] w-[13%] object-contain" />}
      {photoPath && <ProtectedImage path={photoPath} alt={name} className="absolute left-[8%] top-[18%] h-[23.6%] w-[13.5%] object-contain" />}
      <div className={cx('absolute right-[8%] top-[26%] flex flex-col', photoPath ? 'left-[24.6%]' : cx('left-[8%]', design.layout === 'center' && 'text-center'))}>
        <strong className={cx('overflow-hidden text-ellipsis whitespace-nowrap leading-snug', 'text-[length:6.7cqw]')}>{name}</strong>
        <span className={cx('mt-[1%]', 'text-[length:4cqw]')}>{designation}</span>
        <small className={cx('mt-[1%]', 'text-[length:3.2cqw]')}>{department}</small>
      </div>
      <div className={cx('absolute left-[8%] top-[65%] flex w-[61%] flex-col gap-1.25', 'text-[length:3.2cqw]')}><span className="overflow-hidden text-ellipsis whitespace-nowrap">{email}</span><span className="overflow-hidden text-ellipsis whitespace-nowrap">{phone}</span></div>
      <span className="absolute bottom-[24.3%] right-[6.3%] grid aspect-square w-[17%] place-items-center bg-white p-0 font-[Arial] text-[#162030]" aria-label="QR placeholder"><svg className="size-[90%]" viewBox="0 0 21 21" aria-hidden="true"><path fill="currentColor" d={qrPath} /><path fill="white" d="M2 2h5v5H2zM14 2h5v5h-5zM2 14h5v5H2z" /><path fill="currentColor" d="M3 3h3v3H3zM15 3h3v3h-3zM3 15h3v3H3z" /></svg><small className={cx('absolute bottom-px', 'text-[length:1.5cqw]')}>QR PREVIEW</small></span>
      <b className={cx('absolute bottom-[9%] right-[8%] max-w-[83%] overflow-hidden text-ellipsis whitespace-nowrap uppercase', 'text-[length:2.8cqw]')}>{company}</b>
    </div>;
  }
  const card = <div
    className={cx(
      'relative overflow-hidden rounded-xl shadow-sm',
      studio ? 'h-full min-h-0 w-full max-w-none rounded-[inherit] p-7.5 shadow-none' : library ? 'aspect-[7/4] min-h-0 p-[6%]' : 'min-h-45 p-5.75',
      classicStyles[style] ?? classicStyles.classic,
      className,
    )}
    aria-label={`${style} template preview`}>
    <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-2xl"><span className={cx('flex max-w-[85%] items-center gap-2.25', library && '[overflow-wrap:anywhere]')}>{logoPath && <ProtectedImage path={logoPath} alt="Company logo" className="size-6.25 rounded-md object-contain" />}{company}</span><span>✦</span></div>
    {photoPath && <ProtectedImage path={photoPath} alt={name} className="absolute right-7 top-18 size-11.25 rounded-xl object-cover" />}
    <div className={cx('font-semibold tracking-tight', library ? cx('mt-[7%]', 'text-[length:5.8cqw]') : 'mt-7 text-lg', studio && 'max-w-[78%]')}>{name}</div>
    <div className={cx('mt-1 opacity-65', library ? 'text-[length:3.8cqw]' : 'text-xs')}>{designation}</div>
    <div className={cx('flex flex-wrap justify-between gap-2 opacity-60', library ? cx('mt-[5%]', 'text-[length:2.6cqw]') : 'mt-5 text-3xs')}><span>{email}</span><span>{phone || 'Business, beautifully connected.'}</span></div>
  </div>;
  return library ? <div className="min-w-0 overflow-hidden rounded-xl [container-type:inline-size]">{card}</div> : card;
}
