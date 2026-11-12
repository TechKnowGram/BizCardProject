'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * One long line that runs down the whole page. It hugs the left or right edge inside
 * a section, then swings across to the other edge where one section meets the next.
 * It draws itself as you scroll, with a small dot riding on its tip.
 * The path is rebuilt from the real section positions whenever the page size changes.
 */
export default function ScrollLine() {
  const svg = useRef<SVGSVGElement>(null);
  const path = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const svgEl = svg.current;
    const pathEl = path.current;
    const dotEl = dot.current;
    const page = svgEl?.parentElement;
    if (!svgEl || !pathEl || !dotEl || !page) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { svgEl.style.display = 'none'; return; }

    let tween: gsap.core.Tween | null = null;
    let timer: ReturnType<typeof setTimeout>;

    const build = () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();

      const width = page.clientWidth;
      const height = page.scrollHeight;
      svgEl.setAttribute('width', String(width));
      svgEl.setAttribute('height', String(height));
      svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);

      const left = width * 0.035;
      const right = width * 0.965;
      const x = (side: number) => (side === 0 ? left : right);

      // y position where each section starts (skip the first, which starts at 0)
      const bounds = Array.from(page.querySelectorAll<HTMLElement>(':scope > header, :scope > section'))
        .slice(1)
        .map((section) => section.offsetTop);

      let side = 0;
      let cursor = 0;
      let d = `M ${x(side)} 0`;
      // gentle wobble down the edge between two y values
      const wobble = (from: number, to: number) => {
        const gap = to - from;
        if (gap <= 0) return '';
        const sway = side === 0 ? 28 : -28;
        return ` C ${x(side) + sway} ${from + gap / 3}, ${x(side) - sway} ${from + (gap * 2) / 3}, ${x(side)} ${to}`;
      };

      bounds.forEach((boundary) => {
        const swingStart = Math.max(cursor, boundary - 110);
        d += wobble(cursor, swingStart);
        const other = side === 0 ? 1 : 0;
        d += ` C ${x(side)} ${boundary}, ${x(other)} ${boundary}, ${x(other)} ${boundary + 110}`;
        side = other;
        cursor = boundary + 110;
      });
      d += wobble(cursor, height);

      pathEl.setAttribute('d', d);
      const length = pathEl.getTotalLength();
      if (!length) return;
      gsap.set(pathEl, { strokeDasharray: length, strokeDashoffset: length });
      gsap.set(dotEl, { attr: { cx: x(0), cy: 0 } });

      tween = gsap.to(pathEl, {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: page,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (self) => {
            const point = pathEl.getPointAtLength(length * self.progress);
            gsap.set(dotEl, { attr: { cx: point.x, cy: point.y } });
          },
        },
      });
    };

    build();
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(build, 200);
    });
    observer.observe(page);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, []);

  return (
    <svg ref={svg} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-20 hidden lg:block">
      <path ref={path} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" style={{ mixBlendMode: 'difference' }} />
      <circle ref={dot} r="9" fill="#fff700" stroke="#000" strokeWidth="2" />
    </svg>
  );
}
