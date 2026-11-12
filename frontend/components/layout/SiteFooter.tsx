import Link from 'next/link';
import { Icon } from '../home/Iconify';

const links = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/login', label: 'Sign in' },
  { href: '/register', label: 'Register' },
];

/** Simple footer shared by the public pages. */
export default function SiteFooter() {
  return (
    <footer className="bg-black px-4 py-10 text-white sm:px-6">
      <div className="mx-auto flex max-w-[1070px] flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-3 font-display text-xl font-medium">
          <Icon icon="tabler:id-badge-2" className="size-7" /> BizCard
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-2 font-body text-sm text-white/70">
          {links.map((link) => <Link key={link.href} href={link.href} className="hover:text-white">{link.label}</Link>)}
        </nav>
        <p className="font-body text-xs text-white/50">© {new Date().getFullYear()} BizCard</p>
      </div>
    </footer>
  );
}
