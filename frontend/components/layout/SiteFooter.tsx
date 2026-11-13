import Link from 'next/link';
import Brand from '../Brand';

const links = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/login', label: 'Sign in' },
  { href: '/register', label: 'Register' },
];

/** TechKnowGram-styled Enterprise Footer */
export default function SiteFooter() {
  return (
    <footer className="bg-[#080d26] border-t border-[#1a2462] px-4 py-12 text-white sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/" aria-label="BizCard Home">
          <Brand light />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-2 font-display text-xs font-semibold text-slate-300">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#2d62a8] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="font-mono text-3xs text-slate-400">
          © {new Date().getFullYear()} BizCard Limited. Enterprise Prepress Solutions.
        </p>
      </div>
    </footer>
  );
}
