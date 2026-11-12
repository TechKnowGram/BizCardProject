import Link from 'next/link';
import { Icon } from '../home/Iconify';

const links = [
  { href: '/#how', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/login', label: 'Sign in' },
];

/** Floating pill header: logo icon, navigation links, then the new card request button. */
export default function SiteHeader() {
  return (
    <nav className="mx-auto flex h-[72px] max-w-7xl items-center gap-4 rounded-full border border-black/5 bg-white px-5 shadow-xs">
      <Link href="/" aria-label="BizCard home" className="flex shrink-0 items-center border-r border-black/10 pr-6">
        <Icon icon="tabler:id-badge-2" className="size-8" />
      </Link>

      <div className="hidden items-center gap-8 pl-2 font-body text-sm font-medium text-black/70 md:flex">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="transition hover:text-black">{link.label}</Link>
        ))}
      </div>

      <Link href="/register" className="ml-auto flex h-11 shrink-0 items-center gap-2 rounded-full bg-royal px-5 font-body text-sm font-medium text-white transition hover:opacity-90">
        <Icon icon="lucide:plus" className="size-4" />
        New card request
      </Link>
    </nav>
  );
}
