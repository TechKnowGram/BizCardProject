'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Lenis from 'lenis';
import ScrollLine from './ScrollLine';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const inside = (el: Element, selector: string) => Boolean(el.closest(selector));

// Smooth easing for Lenis (ease-out expo).
const smooth = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

/**
 * Wraps the homepage and animates every section with GSAP:
 *  - the hero plays once on load
 *  - every other section reveals as it scrolls into view
 * Mark elements with data-g="card" (pop in one by one) or data-g="shape" (scale in, then float).
 */
export default function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const cleanups: Array<() => void> = [];

      // Always animate. If the visitor prefers reduced motion (or Windows has animations switched off),
      // use a calmer version: short fades, no looping float and no parallax.
      mm.add({ full: '(prefers-reduced-motion: no-preference)', calm: '(prefers-reduced-motion: reduce)' }, (context) => {
        const calm = Boolean(context.conditions?.calm);
        const page = root.current;
        if (!page) return;

        // Smooth scrolling (Lenis) wired into ScrollTrigger.
        if (!calm) {
          const lenis = new Lenis({ duration: 1.25, easing: smooth, smoothWheel: true, anchors: true });
          lenis.on('scroll', ScrollTrigger.update);
          const tick = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(tick);
          gsap.ticker.lagSmoothing(0);
          cleanups.push(() => { gsap.ticker.remove(tick); lenis.destroy(); });
        }

        const sections = gsap.utils.toArray<HTMLElement>('header, section', page);

        sections.forEach((section, index) => {
          const isHero = index === 0;
          const all = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, section);

          // Plain content: headings, paragraphs and buttons that are not part of a card.
          const text = all('h1, h2, h3, p, form, a.rounded-full').filter((el) => !inside(el, '[data-g="card"]') && !inside(el, 'nav'));
          const cards = all('[data-g="card"]');
          const shapes = all('[data-g="shape"]').filter((el) => !inside(el, '[data-g="card"]'));
          const cardShapes = all('[data-g="shape"]').filter((el) => inside(el, '[data-g="card"]'));

          const tl = gsap.timeline({
            defaults: { ease: 'power3.out' },
            ...(isHero
              ? { delay: 0.1 }
              : { scrollTrigger: { trigger: section, start: 'top 75%', once: true } }),
          });

          if (isHero) {
            const nav = section.querySelector('nav');
            if (nav) tl.from(nav, { y: -50, opacity: 0, duration: 0.8 }, 0);
          }

          if (text.length) tl.from(text, { y: calm ? 16 : 45, opacity: 0, duration: calm ? 0.5 : 0.9, stagger: calm ? 0.06 : 0.12 }, isHero ? 0.2 : 0);

          if (cards.length) {
            tl.from(
              cards,
              { y: calm ? 20 : 90, opacity: 0, rotate: isHero && !calm ? 8 : 0, scale: calm ? 1 : 0.92, duration: calm ? 0.5 : 1, stagger: calm ? 0.06 : 0.15, ease: calm ? 'power2.out' : 'back.out(1.4)' },
              isHero ? 0.35 : 0.15,
            );
          }

          if (shapes.length) {
            tl.from(shapes, { scale: calm ? 0.8 : 0, rotate: calm ? 0 : -90, opacity: 0, duration: calm ? 0.5 : 1, stagger: calm ? 0.03 : 0.08, ease: 'back.out(1.7)', transformOrigin: '50% 50%' }, 0.3);
            // After the pop-in, shapes drift gently.
            if (!calm) tl.add(() => {
              shapes.forEach((shape, i) => {
                gsap.to(shape, {
                  '--fy': i % 2 ? '10px' : '-10px',
                  duration: 2.5 + (i % 3) * 0.6,
                  repeat: -1,
                  yoyo: true,
                  ease: 'sine.inOut',
                });
              });
            });
          }

          if (cardShapes.length) tl.from(cardShapes, { scale: 0.4, opacity: 0, duration: 0.8, stagger: 0.07, ease: 'back.out(1.7)' }, '-=0.5');
        });

        // The two scrolling word strips ease up and down with the scroll speed.
        gsap.utils.toArray<HTMLElement>('[aria-hidden="true"].overflow-hidden', page).forEach((strip) => {
          gsap.from(strip, { opacity: 0, y: 30, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: strip, start: 'top 95%', once: true } });
        });

        // Scroll-linked shapes: they spin, drift and grow then shrink as the page scrolls past them.
        if (!calm) {
          gsap.utils.toArray<HTMLElement>('[data-g="shape"]', page).forEach((el, i) => {
            const dir = i % 2 ? 1 : -1;
            const spin = (50 + (i % 4) * 35) * dir;
            const drift = 50 + (i % 3) * 35;
            gsap
              .timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 } })
              .fromTo(el, { '--sr': (-spin) + 'deg', '--sy': drift + 'px' }, { '--sr': spin + 'deg', '--sy': (-drift) + 'px', duration: 2 }, 0)
              .fromTo(el, { '--ss': 0.85 }, { '--ss': 1.25, duration: 1 }, 0)
              .to(el, { '--ss': 0.9, duration: 1 }, 1);
          });
        }

        // Soft parallax on the big photo + decoration in the "new ideas" section.
        if (!calm) gsap.utils.toArray<HTMLElement>('[data-g="parallax"]', page).forEach((el) => {
          gsap.to(el, { y: -50, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });

      return () => {
        cleanups.forEach((fn) => fn());
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <main ref={root} className={`relative ${className ?? ''}`}>
      <ScrollLine />
      {children}
    </main>
  );
}
