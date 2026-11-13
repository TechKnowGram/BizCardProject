import type { ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from './Iconify';
import { PhotoShape, Shape, photo, photos } from './Shapes';

// Shared pieces used by the homepage sections.

export const display = 'font-display font-medium tracking-[-0.01em]';

export function PillButton({ href, children, tone = 'black', className = '' }: { href: string; children: ReactNode; tone?: 'black' | 'mint' | 'white'; className?: string }) {
  const tones = {
    black: 'bg-[#2d62a8] text-white hover:bg-[#28528d] shadow-sm',
    mint: 'bg-[#080d26] text-white hover:bg-[#101845]',
    white: 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
  };
  return (
    <Link href={href} className={`inline-flex h-[48px] items-center gap-2 rounded-lg px-6 font-display text-sm font-semibold transition ${tones[tone]} ${className}`}>
      {children}
      <Icon icon="lucide:arrow-right" className="size-4" />
    </Link>
  );
}

export function ClaimForm({ buttonLabel }: { buttonLabel: string }) {
  return (
    <form action="/register" className="flex flex-wrap items-center gap-3">
      <input
        aria-label="Your company link"
        placeholder="bizcard.com/yourcompany"
        className="h-[52px] w-full max-w-[312px] rounded-[10px] border border-black bg-white px-6 font-body text-base text-navy placeholder:text-navy sm:w-[312px]"
      />
      <button className="h-[52px] rounded-full bg-black px-6 font-display text-base font-medium text-white transition hover:opacity-85">{buttonLabel}</button>
    </form>
  );
}

export function Squiggle({ className, stroke = '#e4e9f8' }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 520 260" fill="none" className={className} aria-hidden="true">
      <path d="M0 210 C60 230 90 110 120 120 C160 130 90 250 150 230 C230 200 330 120 520 40" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function RequestCard({ handle, text, badge, badgeFill, className, avatar }: { handle: string; text: string; badge: string; badgeFill: string; className: string; avatar: string }) {
  return (
    <div data-g="card" className={`absolute h-[250px] w-[275px] -rotate-[8deg] rounded-[28px] border-2 border-black bg-white p-5 ${className}`}>
      <div className="flex items-center gap-2 border-b border-black/10 pb-3">
        <img src={photo(avatar, 80)} alt="" className="size-6 rounded-full object-cover" />
        <span className="font-display text-xs font-semibold text-royal">{handle}</span>
      </div>
      <p className="mt-5 font-body text-[17px] leading-[26px] text-black">{text}</p>
      <div className="absolute inset-x-5 bottom-5 grid h-[50px] place-items-center rounded-full bg-linear-to-r from-lilac/70 to-blush/30 font-display text-sm">Approve</div>
      <div className="absolute -top-4 -right-3 grid size-[70px] place-items-center">
        <Shape kind="burst" points={12} inner={0.78} fill={badgeFill} className="absolute inset-0" />
        <span className="relative font-display text-sm font-semibold">{badge}</span>
      </div>
    </div>
  );
}

export function TiltedRow({ icon, handle, text, className }: { icon: string; handle: string; text: string; className: string }) {
  return (
    <div className={`absolute w-[310px] rounded-[10px] border border-black p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-white"><Icon icon={icon} className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[13px] font-semibold">{handle}</p>
          <p className="mt-1 font-body text-xs leading-4">{text}</p>
          <div className="mt-2 flex justify-between font-body text-[11px] text-black/40"><span>Date</span><span>Reply</span></div>
        </div>
        <span className="flex flex-col items-center gap-1 font-body text-xs"><Icon icon="lucide:heart" className="size-4" />10</span>
      </div>
    </div>
  );
}

export function SmallCard({ tone, name, className = '' }: { tone: string; name: string; className?: string }) {
  return (
    <div data-g="card" className={`relative h-[344px] w-[298px] shrink-0 overflow-hidden rounded-[28px] bg-white ${className}`}>
      {/* the coloured blob behind the photo */}
      {tone === 'mint' && <Shape kind="burst" points={9} inner={0.5} fill="#4dffc8" className="absolute -top-24 left-[-70px] size-[430px]" />}
      {tone === 'lemon' && <Shape kind="blob" amp={0.12} fill="#fff700" className="absolute -top-28 -left-24 size-[460px]" />}
      {tone === 'blush' && <Shape kind="flower" points={6} amp={0.12} fill="#ffd0dc" className="absolute -top-20 -left-6 size-[380px]" />}
      {tone === 'royal' && <Shape kind="burst" points={7} inner={0.45} fill="#4a1ff2" className="absolute -top-28 -left-20 size-[440px]" />}
      <PhotoShape
        kind={tone === 'mint' ? 'oval' : tone === 'lemon' ? 'burst' : 'flower'}
        points={tone === 'lemon' ? 11 : 8}
        inner={0.78}
        amp={0.12}
        src={photo(tone === 'mint' ? photos.womanLaughing : tone === 'lemon' ? photos.manLong : tone === 'blush' ? photos.womanBlazer : photos.manGlasses)}
        alt={name}
        className="absolute top-[63px] left-1/2 size-[186px] -translate-x-1/2"
      />
      <p className="absolute inset-x-0 top-[250px] text-center font-body text-xl text-black">{name}</p>
    </div>
  );
}
