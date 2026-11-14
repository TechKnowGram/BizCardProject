'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import Icon from '@/components/ui/Icon';
import { cx } from '@/components/ui';

export interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/** A section that opens and closes under its heading. Smooth height change, keyboard and screen-reader friendly. */
export default function Accordion({ title, children, defaultOpen = false, className }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className={cx('overflow-hidden rounded-lg border border-slate-200 bg-white text-sm', className)}>
      <button
        type="button"
        id={`${id}-button`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium text-slate-800 transition-colors hover:bg-slate-50"
      >
        <span>{title}</span>
        <Icon name="chevronRight" size={16} className={cx('shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-90')} />
      </button>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-button`}
        className={cx('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
