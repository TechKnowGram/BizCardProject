'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Icon } from './Iconify';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const separators = ['lucide:asterisk', 'lucide:globe', 'lucide:arrow-right'];

/**
 * Endless sliding strip of words, driven by GSAP.
 * The list is doubled, so sliding exactly half its width loops with no gap.
 */
export default function Marquee({ items, className, duration = 35 }: { items: string[]; className: string; duration?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const row = [...items, ...items];

  useGSAP(
    () => {
      const slide = gsap.to(track.current, { xPercent: -50, duration, ease: 'none', repeat: -1 });
      const node = track.current?.parentElement;
      let hovering = false;
      const pause = () => { hovering = true; gsap.to(slide, { timeScale: 0, duration: 0.5, overwrite: true }); };
      const play = () => { hovering = false; gsap.to(slide, { timeScale: 1, duration: 0.5, overwrite: true }); };

      // Scrolling speeds the strip up and flips its direction when you scroll back up.
      const settle = gsap.delayedCall(0.15, () => { if (!hovering) gsap.to(slide, { timeScale: 1, duration: 0.9, overwrite: true }); });
      const trigger = ScrollTrigger.create({
        onUpdate: (self) => {
          if (hovering) return;
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 6);
          gsap.to(slide, { timeScale: self.direction * boost, duration: 0.3, overwrite: true });
          settle.restart(true);
        },
      });
      node?.addEventListener('mouseenter', pause);
      node?.addEventListener('mouseleave', play);
      return () => {
        trigger.kill();
        settle.kill();
        node?.removeEventListener('mouseenter', pause);
        node?.removeEventListener('mouseleave', play);
      };
    },
    { scope: track },
  );

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div ref={track} className="flex w-max items-center will-change-transform">
        {row.map((text, i) => (
          <span key={i} className="flex items-center gap-8 pr-8 font-display text-2xl font-medium whitespace-nowrap">
            {text}
            <Icon icon={separators[i % 3]} className="size-7" />
          </span>
        ))}
      </div>
    </div>
  );
}
