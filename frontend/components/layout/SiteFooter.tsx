import Link from 'next/link';
import Brand from '../Brand';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#how', label: 'How it works' },
      { href: '/#templates', label: 'Card templates' },
      { href: '/#verify', label: 'QR verification' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/register/company', label: 'Register a company' },
      { href: '/employee/register', label: 'Join as an employee' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/#faq', label: 'Questions and answers' },
      { href: '/#roles', label: 'Who uses BizCard' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-navy-950 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pt-16 pb-12 sm:px-8 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <Link href="/" aria-label="BizCard home">
            <Brand light />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            One place for a company to keep its staff list, agree on a card design and get print-ready business cards, each with its own QR check.
          </p>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-white">{column.title}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-white">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} BizCard. All rights reserved.</p>
          <p>Vector PDF · 3.5 × 2 in · QR verified</p>
        </div>
      </div>
    </footer>
  );
}
