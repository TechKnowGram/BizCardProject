'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AppNotification } from '../lib/types';
import { cx } from './ui';

export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<AppNotification[]>('/notifications').then(setItems).catch(() => {});
    function close(event: MouseEvent) { if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter(item => !item.is_read).length;

  async function markAll() {
    await api('/notifications/read-all', { method: 'PATCH' });
    setItems(current => current.map(item => ({ ...item, is_read: true })));
  }

  async function markOne(item: AppNotification) {
    if (item.is_read) return;
    await api(`/notifications/item/${item.id}/read`, { method: 'PATCH' });
    setItems(current => current.map(value => value.id === item.id ? { ...value, is_read: true } : value));
  }

  return <div className="relative" ref={wrap}>
    <button className="group relative grid size-9 place-items-center rounded-xl border border-[#e5e7ec] text-lg text-[#5d6372]" aria-label={`${unread} unread notifications`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <svg className="size-4.5 fill-none stroke-[#655d6f] [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8] transition-[stroke,transform] duration-200 group-hover:rotate-[-7deg] group-hover:stroke-[#6430c2] group-aria-expanded:rotate-[-7deg] group-aria-expanded:stroke-[#6430c2]" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>{unread > 0 && <b className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full border-2 border-white bg-coral px-0.75 text-3xs text-white">{unread > 9 ? '9+' : unread}</b>}
    </button>
    {open && <div className="absolute right-0 top-11 z-50 w-90 max-w-[calc(100vw-var(--spacing)*8)] overflow-hidden rounded-[28px] border border-[#e2e5ec] bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-[#e3e8e6] px-4 py-4"><div><strong className="block text-xs">Notifications</strong><small className="mt-0.75 block text-3xs text-[#9b94a1]">{unread ? `${unread} unread` : 'All caught up'}</small></div>{unread > 0 && <button className="text-3xs font-bold text-[#6630c3]" onClick={markAll}>Mark all read</button>}</div>
      <div className="max-h-85 overflow-y-auto">{items.length ? items.map(item => <button key={item.id} onClick={() => markOne(item)} className={cx('flex w-full gap-3 border-b border-[#f0f1f4] px-4 py-3.5 text-left text-xs leading-normal', item.is_read ? 'text-[#626878]' : 'bg-[#f8f7ff] text-[#383d4d]')}><span className={cx('mt-1.25 size-1.75 flex-none rounded-full', item.is_read ? 'bg-[#d7d9e0]' : 'bg-[#6756c2]')} /><div><p>{item.message}</p><small className="mt-1 block text-3xs text-[#a0a4b0]">{new Date(item.created_at).toLocaleString()}</small></div></button>) : <div className="grid min-h-45 place-items-center content-center text-2xs text-[#8c8594]"><span className="mb-2.5 grid size-10 place-items-center rounded-full bg-[#e8f8f0] text-[#25805d]">✓</span><p>You are all caught up.</p></div>}</div>
    </div>}
  </div>;
}
