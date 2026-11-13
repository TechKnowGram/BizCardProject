import { Icon } from '@/components/home/Iconify';
import { cx } from '@/components/ui';

export interface BrandProps {
  light?: boolean;
  className?: string;
}

/** Small pill label used above headings. */
export const sectionChipClass =
  'inline-flex items-center rounded-full bg-[#eef3fa] px-3.5 py-1 font-display text-3xs font-bold tracking-wider text-[#2d62a8] border border-[#d8e3f3]';
export const sectionChipDarkClass =
  'inline-flex items-center rounded-full bg-[#101845] px-3.5 py-1 font-display text-3xs font-bold tracking-wider text-[#8eaee0] border border-[#1a2462]';

/** BizCard logo: card badge + wordmark + TechKnowGram crimson accent dot. */
export default function Brand({ light = false, className }: BrandProps) {
  return (
    <div className={cx('flex items-center gap-2.5', light ? 'text-white' : 'text-slate-900', className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-[#2d62a8] text-white font-black text-xs shadow-xs">
        B
      </span>
      <div className="flex items-center">
        <span className="font-display text-lg font-extrabold tracking-tight">BizCard</span>
        <span className="ml-0.5 size-1.5 rounded-full bg-[#e20917]" />
      </div>
    </div>
  );
}
