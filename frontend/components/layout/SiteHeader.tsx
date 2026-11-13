'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Brand from '../Brand';
import { cx } from '../ui';

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/#templates', label: 'Templates' },
  { href: '/#verify', label: 'Verification' },
  { href: '/#faq', label: 'FAQ' },
];

/**
 * Fixed site header. Transparent over the navy hero, then turns into a
 * white floating bar once the page is scrolled (same pattern as techknowgram.com).
 */
export default function SiteHeader({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);

  const light = scrolled || open;

  return (
    <header className={cx('fixed inset-x-0 top-0 z-50 px-3 transition-[padding] duration-300 sm:px-5', scrolled ? 'pt-3' : 'pt-5')}>
      <nav
        aria-label="Main"
        className={cx(
          'mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 rounded-xl px-4 transition-colors duration-300 sm:px-5',
          light ? 'border border-slate-200 bg-white/95 shadow-lg backdrop-blur' : 'border border-transparent',
        )}
      >
        <Link href="/" aria-label="BizCard home" onClick={() => setOpen(false)}>
          <Brand light={!light} />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                'rounded-full px-3 py-2 text-[0.8125rem] font-semibold transition-colors',
                light ? 'text-slate-700 hover:text-brand-600' : 'text-white/85 hover:text-white',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cx('hidden rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors sm:inline-flex', light ? 'text-slate-700 hover:text-brand-600' : 'text-white hover:text-brand-200')}
          >
            Sign in
          </Link>
          <Link href="/register" className="hidden rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-brand-700 sm:inline-flex xl:px-5">
            Get started
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cx('inline-flex size-10 items-center justify-center rounded-full lg:hidden', light ? 'text-navy-900' : 'text-white')}
          >
            <Icon icon={open ? 'lucide:x' : 'lucide:menu'} className="size-5" />
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-7xl rounded-xl border border-slate-200 bg-white p-3 shadow-lg lg:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {link.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <Link href="/login" className="rounded-lg border border-slate-300 px-3 py-2.5 text-center text-sm font-semibold text-slate-700">Sign in</Link>
            <Link href="/register" className="rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-semibold text-white">Get started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
