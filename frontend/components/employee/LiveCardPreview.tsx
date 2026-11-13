'use client';

import { cx } from '@/components/ui';

/*
 * On-screen card mock-up used by the employee card studio.
 * The card face markup below is kept exactly as it was so the preview does not change.
 */
export default function LiveCardPreview({
  theme = 'navy',
  name,
  designation,
  department,
  phone,
  email,
  companyName,
  isCompany,
  templateName,
}: {
  theme?: 'navy' | 'clean' | 'royal';
  name?: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  isCompany: boolean;
  templateName?: string;
}) {
  const displayName = name?.trim() || 'Your Full Name';
  const displayTitle = designation?.trim() || (isCompany ? 'Senior Consultant' : 'Independent Professional');
  const displayDept = department?.trim() || (isCompany ? 'Engineering & Operations' : 'Strategy & Consulting');
  const displayPhone = phone?.trim() || '+880 1700 000000';
  const displayEmail = email?.trim() || 'contact@bizcard.me';
  const displayOrg = isCompany ? (companyName || 'Verified Organization') : 'BIZCARD INDEPENDENT';

  const isNavy = theme === 'navy';
  const isRoyal = theme === 'royal';
  const isClean = theme === 'clean';

  const cardBgClass = isNavy
    ? 'bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white border border-navy-800 shadow-2xl'
    : isRoyal
    ? 'bg-gradient-to-br from-navy-900 via-navy-900 to-navy-950 text-white border border-brand-800 shadow-2xl'
    : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900 border border-slate-200/90 shadow-xl';

  const accentPillClass = isNavy
    ? 'bg-brand-600 text-white'
    : isRoyal
    ? 'bg-amber-400 text-slate-950'
    : 'bg-slate-900 text-white';

  const secondaryTextClass = isClean ? 'text-slate-600' : 'text-slate-300';
  const subtleTextClass = isClean ? 'text-slate-400' : 'text-slate-400';

  return (
    <div className="relative w-full max-w-md mx-auto select-none">
      {/* Physical Card Mockup with standard 1.75:1 aspect ratio */}
      <div
        className={cx(
          'relative aspect-[1.75/1] w-full rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-all duration-300',
          cardBgClass
        )}
      >
        {/* Ambient mesh glow */}
        {!isClean && (
          <div
            className="absolute -right-16 -top-16 size-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: isNavy ? '#4dffc8' : '#c084fc' }}
          />
        )}
        <div
          className="absolute -left-12 -bottom-12 size-36 rounded-full blur-2xl opacity-10 pointer-events-none"
          style={{ backgroundColor: isNavy ? '#2bbbc4' : '#efb53e' }}
        />

        {/* Card Header */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cx(
                'grid size-8 place-items-center rounded-lg text-xs font-bold shadow-xs shrink-0',
                accentPillClass
              )}
            >
              {displayOrg.charAt(0)}
            </span>
            <div className="min-w-0">
              <span
                className={cx(
                  'block text-2xs font-semibold uppercase tracking-wider truncate',
                  accentPillClass.includes('text-slate-950') && !isClean
                    ? 'text-emerald-600'
                    : isRoyal
                    ? 'text-amber-400'
                    : 'text-slate-900'
                )}
              >
                {displayOrg}
              </span>
              <span className={cx('block text-3xs tabular-nums tracking-tight truncate', subtleTextClass)}>
                {isCompany ? (templateName ? `Template: ${templateName}` : 'Corporate Workspace') : 'Verified Personal Card'}
              </span>
            </div>
          </div>

          {/* NFC / Prepress badge */}
          <div className="flex items-center gap-1.5 opacity-70 shrink-0">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5A2.5 2.5 0 0 0 11 12a2.5 2.5 0 0 0-2.5-2.5M12 17.5a5.5 5.5 0 0 0 0-11M15.5 20.5a8.5 8.5 0 0 0 0-17" />
            </svg>
            <span className="text-3xs tabular-nums font-bold tracking-wider">Vector PDF</span>
          </div>
        </div>

        {/* Card Body: Name & Title */}
        <div className="relative z-10 my-auto py-1">
          <h3
            className={cx(
              'text-lg sm:text-xl font-bold tracking-tight leading-tight line-clamp-1',
              isClean ? 'text-slate-900' : 'text-white'
            )}
          >
            {displayName}
          </h3>
          <p className={cx('text-2xs sm:text-xs font-semibold tracking-wide uppercase mt-0.5 line-clamp-1', secondaryTextClass)}>
            {displayTitle}
          </p>
          <span className={cx('text-3xs tracking-wider block mt-0.5 line-clamp-1', subtleTextClass)}>
            {displayDept}
          </span>
        </div>

        {/* Card Footer: Contact & QR Code */}
        <div className="relative z-10 flex items-end justify-between gap-2 border-t pt-2.5 border-current/10">
          <div className="space-y-0.5 text-3xs min-w-0">
            <div className="flex items-center gap-1.5 tabular-nums truncate">
              <span className="opacity-60 shrink-0">TEL</span>
              <span className={cx('truncate', secondaryTextClass)}>{displayPhone}</span>
            </div>
            <div className="flex items-center gap-1.5 tabular-nums truncate">
              <span className="opacity-60 shrink-0">EMAIL</span>
              <span className={cx('truncate', secondaryTextClass)}>{displayEmail}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={cx(
                'size-8 rounded p-1 grid grid-cols-3 gap-0.5 place-items-center',
                isClean ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'
              )}
              title="QR code"
            >
              <span className="size-1.5 bg-current rounded-xs" />
              <span className="size-1 bg-current" />
              <span className="size-1.5 bg-current rounded-xs" />
              <span className="size-1 bg-current" />
              <span className="size-1 bg-current" />
              <span className="size-1 bg-current" />
              <span className="size-1.5 bg-current rounded-xs" />
              <span className="size-1 bg-current" />
              <span className="size-1.5 bg-current rounded-xs" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
