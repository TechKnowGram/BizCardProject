import Link from 'next/link';
import { Icon } from '@iconify/react';
import Brand from '@/components/ui/Brand';
import { site } from '@/lib/site';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#how', label: 'How it works' },
      { href: '/#templates', label: 'Card templates' },
      { href: '/#verify', label: 'QR verification' },
      { href: '/#faq', label: 'Questions and answers' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { href: '/register/company', label: 'Register a company' },
      { href: '/employee/register', label: 'Join as an employee' },
      { href: '/login', label: 'Sign in' },
      { href: '/#roles', label: 'Who uses BizCard' },
    ],
  },
];

export default function SiteFooter() {
  const { contact } = site;
  return (
    <footer className="bg-navy-950 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 pt-16 pb-12 sm:px-8 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" aria-label={`${site.name} home`}>
            <Brand light />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            One place for a company to keep its staff list, agree on a card design and get print-ready business cards, each with its own QR check.
          </p>
          <div className="mt-6 flex gap-2">
            {site.social.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="grid size-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-white/30 hover:text-white">
                <Icon icon={s.icon} className="size-4" />
              </a>
            ))}
          </div>
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

          <div>
            <p className="text-sm font-semibold text-white">Contact</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-2.5">
                <Icon icon="lucide:mail" className="mt-0.5 size-4 shrink-0 text-brand-300" />
                <a href={`mailto:${contact.email}`} className="break-all hover:text-white">{contact.email}</a>
              </li>
              <li className="flex gap-2.5">
                <Icon icon="lucide:phone" className="mt-0.5 size-4 shrink-0 text-brand-300" />
                <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className="hover:text-white">{contact.phone}</a>
              </li>
              <li className="flex gap-2.5">
                <Icon icon="lucide:map-pin" className="mt-0.5 size-4 shrink-0 text-brand-300" />
                <span>{contact.address}</span>
              </li>
              <li className="flex gap-2.5">
                <Icon icon="lucide:clock" className="mt-0.5 size-4 shrink-0 text-brand-300" />
                <span>{contact.hours}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} {site.legalName} All rights reserved.</p>
          <p>Vector PDF · 3.5 × 2 in · QR verified</p>
        </div>
      </div>
    </footer>
  );
}
