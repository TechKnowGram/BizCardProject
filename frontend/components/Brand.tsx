import { Icon } from '@/components/home/Iconify';
import { cx } from '@/components/ui';

export interface BrandProps {
  light?: boolean;
  className?: string;
}

/** Small pill label used above headings. */
export const sectionChipClass =
  'inline-flex rounded-full bg-lemon px-3.5 py-1.5 font-display text-3xs font-semibold tracking-2xl text-black';
export const sectionChipDarkClass =
  'inline-flex rounded-full bg-mint px-3.5 py-1.5 font-display text-3xs font-semibold tracking-2xl text-black';

/** BizCard logo: card icon + wordmark. */
export default function Brand({ light = false, className }: BrandProps) {
  return (
    <div className={cx('flex items-center gap-3', light ? 'text-white' : 'text-black', className)}>
      <Icon icon="tabler:id-badge-2" className="size-8" />
      <span className="font-display text-xl font-medium tracking-tight">BizCard</span>
    </div>
  );
}
