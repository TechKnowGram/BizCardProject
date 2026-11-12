'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Icon } from './Iconify';

export type FaqItem = { question: string; answer: string };

// Answer text slides open with GSAP when its question is clicked.
function Answer({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(() => {
    gsap.from(ref.current, { height: 0, opacity: 0, paddingBottom: 0, duration: 0.45, ease: 'power2.out', clearProps: 'height,paddingBottom' });
  }, { scope: ref });
  return <p ref={ref} className="overflow-hidden px-6 pb-8 font-body text-lg leading-[29px] text-white sm:px-[46px]">{text}</p>;
}

export default function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="mx-auto mt-[66px] flex max-w-[1070px] flex-col gap-[33px]">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.question} data-g="card" className="rounded-[36px] border border-white/60">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : index)}
              className="flex min-h-[98px] w-full items-center justify-between gap-6 px-6 text-left font-body text-lg text-white sm:px-[46px] sm:text-2xl"
            >
              {item.question}
              <Icon icon={isOpen ? 'lucide:minus' : 'lucide:plus'} className="size-6 shrink-0" />
            </button>
            {isOpen && <Answer text={item.answer} />}
          </div>
        );
      })}
    </div>
  );
}
