import { cx } from '@/components/ui';

export interface BrandProps {
  light?: boolean;
  className?: string;
  /** Small line under the wordmark, e.g. "Company admin". */
  tagline?: string;
}

/** Small label used above headings on light backgrounds. */
export const sectionChipClass =
  'inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-iris-500';
/** Same label for navy backgrounds. */
export const sectionChipDarkClass =
  'inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-brand-300';

/**
 * PLACEHOLDER LOGO: two stacked cards drawn in SVG.
 * To use the real logo, replace the <svg> below with an <img src="/logo.svg" ... />
 * (put the file in /public). Every header, sidebar and footer uses this component.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cx('size-8 shrink-0', className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#3267b0" />
      <rect x="9" y="7.5" width="16" height="10.5" rx="1.6" fill="#ffffff" opacity=".35" transform="rotate(-8 17 12.75)" />
      <rect x="6.5" y="12" width="17" height="11" rx="1.8" fill="#ffffff" />
      <rect x="9" y="15" width="7" height="1.6" rx=".8" fill="#3267b0" />
      <rect x="9" y="18.2" width="10" height="1.2" rx=".6" fill="#94a3b8" />
    </svg>
  );
}

/** BizCard logo: card mark + wordmark. */
export default function Brand({ light = false, className, tagline }: BrandProps) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <BrandMark />
      <span className="leading-none">
        <span className={cx('block font-display text-lg font-bold tracking-tight', light ? 'text-white' : 'text-navy-900')}>BizCard</span>
        {tagline && <span className={cx('mt-1 block text-3xs font-medium', light ? 'text-brand-300' : 'text-slate-500')}>{tagline}</span>}
      </span>
    </span>
  );
}
