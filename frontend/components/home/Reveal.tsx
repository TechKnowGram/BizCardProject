'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

/**
 * Fades its content up 24px when it scrolls into view (same motion as techknowgram.com).
 * `delay` staggers siblings, e.g. 0, 80, 160ms.
 */
export default function Reveal({ children, delay = 0, className, as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'article' }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-visible'); return; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} className={cx('reveal', className)} style={{ ['--reveal-delay' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
