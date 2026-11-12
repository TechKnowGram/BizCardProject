'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** A number that counts up from 0 when it scrolls into view. */
export default function CountUp({ to, suffix = '', className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const counter = { value: 0 };
      gsap.to(counter, {
        value: to,
        duration: 2,
        ease: 'power2.out',
        scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        onUpdate: () => {
          if (ref.current) ref.current.textContent = Math.round(counter.value).toLocaleString() + suffix;
        },
      });
    },
    { scope: ref },
  );

  return <span ref={ref} className={className}>{to.toLocaleString() + suffix}</span>;
}
