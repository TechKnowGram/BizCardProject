import Link from 'next/link';
import { Icon } from './Iconify';
import { PhotoShape, Shape, photo, photos } from './Shapes';
import { ClaimForm } from './parts';
import SiteHeader from '../layout/SiteHeader';

export default function Hero() {
  return (
    <header className="relative overflow-hidden bg-gradient-to-b from-[#080d26] via-[#101845] to-[#080d26] px-4 pt-6 sm:px-6 text-white pb-16">
      <SiteHeader />

      <div className="mx-auto grid max-w-[1120px] items-center gap-12 pt-14 pb-16 lg:grid-cols-[1fr_440px] lg:pt-[70px] lg:pb-[100px]">
        <div>
          {/* TechKnowGram-styled Section Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#101845] border border-[#1a2462] px-3.5 py-1 text-3xs font-mono font-bold text-[#8eaee0] tracking-wider uppercase mb-5">
            <span className="size-1.5 rounded-full bg-[#e20917]" />
            Enterprise Visiting Card Infrastructure
          </div>

          <h1 className="font-display text-[2.75rem] leading-[1.15] font-extrabold tracking-[-0.02em] text-white lg:text-[56px] lg:leading-[68px]">
            Print business cards for whole teams.
            <span className="relative ml-2 inline-block -rotate-[3deg] rounded-lg bg-[#2d62a8] text-white px-3.5 py-1 align-middle font-display text-base font-bold shadow-md">
              Approved fast.
            </span>
          </h1>

          <p className="mt-7 max-w-[500px] font-body text-base sm:text-lg leading-[28px] text-slate-300">
            Use BizCard to manage your people, enforce brand kit standards, and receive approved, 300 DPI print-ready cards with one click.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <div className="w-full sm:w-auto">
              <ClaimForm buttonLabel="Create workspace" />
            </div>
            <Link
              href="/#features"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/15 px-6 py-3 text-xs font-bold text-white backdrop-blur-xs transition-colors"
            >
              Explore platform →
            </Link>
          </div>
        </div>

        {/* Stacked Product Cards & Live Studio Mockup */}
        <div className="relative mx-auto hidden h-[490px] w-[440px] lg:block">
          <Shape kind="burst" points={8} inner={0.45} fill="#2d62a8" className="absolute top-[250px] left-[200px] size-[190px] opacity-40 blur-xs" />
          <Icon icon="ph:sparkle" className="absolute top-[40px] left-[36px] size-[48px] text-[#8eaee0]" />
          <Icon icon="ph:sparkle-fill" className="absolute top-[22px] left-[90px] size-7 text-[#e20917]" />

          {/* Card 01 */}
          <div data-g="card" className="absolute top-[165px] left-0 flex h-[324px] w-[242px] flex-col justify-between rounded-2xl border border-[#1a2462] bg-[#0b1821] p-5 shadow-2xl text-white">
            <span className="text-3xs font-mono uppercase text-[#8eaee0] tracking-wider">01 · Enterprise Roster</span>
            <p className="font-body text-sm font-semibold leading-5 text-slate-200">Order cards for the new global sales team?</p>
            <span className="flex items-center justify-between gap-1 border-t border-[#1a2462] pt-3">
              <span className="rounded-md bg-[#2d62a8] px-3 py-1 font-display text-3xs font-bold text-white">Batch Request</span>
              <span className="grid size-7 place-items-center rounded-md bg-white/10 text-white"><Icon icon="lucide:arrow-right" className="size-3.5" /></span>
            </span>
          </div>

          {/* Card 02 */}
          <div data-g="card" className="absolute top-[83px] left-[97px] flex h-[323px] w-[246px] flex-col justify-between rounded-2xl border border-[#1a2462] bg-gradient-to-br from-[#101845] to-[#080d26] p-5 shadow-2xl text-white">
            <span className="text-3xs font-mono uppercase text-[#8eaee0] tracking-wider">02 · Brand Integrity</span>
            <p className="font-body text-sm font-semibold leading-5 text-slate-200">Follow your brand kit on every single card?</p>
            <span className="flex items-center justify-between gap-1 border-t border-[#1a2462] pt-3">
              <span className="rounded-md bg-[#2d62a8] px-3 py-1 font-display text-3xs font-bold text-white">Brand Lock</span>
              <span className="grid size-7 place-items-center rounded-md bg-white/10 text-white"><Icon icon="lucide:arrow-right" className="size-3.5" /></span>
            </span>
          </div>

          {/* Card 03 (Front Card) */}
          <div data-g="card" className="absolute top-0 left-[193px] h-[322px] w-[247px] rounded-2xl border border-slate-200 bg-white px-5 pt-[50px] shadow-2xl text-slate-900 flex flex-col justify-between pb-5">
            <div>
              <PhotoShape kind="flower" points={8} amp={0.1} src={photo(photos.womanSmile, 300)} alt="Team member" className="mx-auto size-[80px]" />
              <p className="mt-5 text-center font-body text-sm font-bold text-slate-900 leading-snug">Instant employee self-service ordering?</p>
            </div>
            <span className="flex items-center justify-between gap-1 border-t border-slate-150 pt-3">
              <span className="rounded-md bg-[#2d62a8] px-3 py-1 font-display text-3xs font-bold text-white">Prepress Ready</span>
              <span className="grid size-7 place-items-center rounded-md bg-slate-100 text-slate-700"><Icon icon="lucide:arrow-right" className="size-3.5" /></span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating 5-Column Stats Banner (Direct TechKnowGram Pattern) */}
      <div className="mx-auto max-w-5xl -mb-28 relative z-20 px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 rounded-2xl border border-slate-100 bg-white p-5 md:p-6 shadow-xl text-slate-900 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="text-center px-3 py-2">
            <strong className="block text-2xl md:text-3xl font-black font-mono text-slate-900">2024</strong>
            <span className="block text-3xs font-semibold text-slate-500 mt-0.5">Prepress Verified</span>
          </div>
          <div className="text-center px-3 py-2">
            <strong className="block text-2xl md:text-3xl font-black font-mono text-[#2d62a8]">300 DPI</strong>
            <span className="block text-3xs font-semibold text-slate-500 mt-0.5">Vector Print Standard</span>
          </div>
          <div className="text-center px-3 py-2">
            <strong className="block text-2xl md:text-3xl font-black font-mono text-slate-900">5,000+</strong>
            <span className="block text-3xs font-semibold text-slate-500 mt-0.5">Cards Issued</span>
          </div>
          <div className="text-center px-3 py-2">
            <strong className="block text-2xl md:text-3xl font-black font-mono text-[#2d62a8]">20+</strong>
            <span className="block text-3xs font-semibold text-slate-500 mt-0.5">Active Workspaces</span>
          </div>
          <div className="text-center px-3 py-2 col-span-2 md:col-span-1">
            <strong className="block text-2xl md:text-3xl font-black font-mono text-slate-900">3 ISO</strong>
            <span className="block text-3xs font-semibold text-slate-500 mt-0.5">Standard Aligned</span>
          </div>
        </div>
      </div>
    </header>
  );
}
