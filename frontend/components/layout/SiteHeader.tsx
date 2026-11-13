import Link from 'next/link';
import Brand from '../Brand';

const links = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/login', label: 'Sign in' },
];

/** TechKnowGram-styled Floating pill header: glassmorphism, brand logo, navigation links, and primary CTA. */
export default function SiteHeader() {
  return (
    <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md px-6 shadow-sm">
      <Link href="/" aria-label="BizCard home" className="flex shrink-0 items-center border-r border-slate-200 pr-5">
        <Brand />
      </Link>

      <div className="hidden items-center gap-7 pl-2 font-display text-sm font-semibold text-slate-700 md:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="transition-colors hover:text-[#2d62a8]">
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="hidden sm:inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#2d62a8] hover:bg-[#eef3fa] transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="flex items-center gap-1.5 rounded-lg bg-[#2d62a8] px-5 py-2.5 font-display text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#28528d]"
        >
          <span>+</span>
          New card request
        </Link>
      </div>
    </nav>
  );
}
