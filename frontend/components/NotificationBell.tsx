'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AppNotification } from '../lib/types';
import { cx } from './ui';

const REFRESH_MS = 60_000;

export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(() => {
    api<AppNotification[]>('/notifications').then((list) => { setItems(list); setFailed(false); }).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    refresh();
    // Keep the count fresh: on an interval, and whenever the tab comes back into focus.
    const timer = window.setInterval(refresh, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    function close(event: MouseEvent) { if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false); }
    function onKey(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); button.current?.focus(); } }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [refresh]);

  const unread = items.filter(item => !item.is_read).length;

  async function markAll() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      setItems(current => current.map(item => ({ ...item, is_read: true })));
    } catch {
      setFailed(true);
    }
  }

  async function markOne(item: AppNotification) {
    if (item.is_read) return;
    try {
      await api(`/notifications/item/${item.id}/read`, { method: 'PATCH' });
      setItems(current => current.map(value => value.id === item.id ? { ...value, is_read: true } : value));
    } catch {
      setFailed(true);
    }
  }

  return <div className="relative" ref={wrap}>
    <button ref={button} type="button" className="group relative grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
      <svg className="size-4.5 fill-none stroke-slate-600 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8] transition-[stroke] duration-200 group-hover:stroke-brand-600 group-aria-expanded:stroke-brand-600" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>
      {unread > 0 && <b className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[11px] leading-none font-semibold text-white">{unread > 9 ? '9+' : unread}</b>}
    </button>
    {open && <div role="dialog" aria-label="Notifications" className="absolute top-11 right-0 z-50 w-90 max-w-[calc(100vw-var(--spacing)*8)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-navy-900">Notifications</p>
          <p className="mt-0.5 text-xs text-slate-500">{unread ? `${unread} unread` : 'All caught up'}</p>
        </div>
        {unread > 0 && <button type="button" className="text-xs font-semibold text-brand-600 hover:text-brand-700" onClick={markAll}>Mark all as read</button>}
      </div>
      {failed && <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">Notifications could not be updated. Try again shortly.</p>}
      <div className="max-h-85 overflow-y-auto">
        {items.length ? items.map(item => (
          <button type="button" key={item.id} onClick={() => markOne(item)} className={cx('flex w-full gap-3 border-b border-slate-100 px-4 py-3.5 text-left text-sm leading-normal last:border-0', item.is_read ? 'text-slate-500' : 'bg-brand-50/60 text-slate-700')}>
            <span className={cx('mt-1.5 size-2 flex-none rounded-full', item.is_read ? 'bg-slate-300' : 'bg-brand-600')} aria-hidden="true" />
            <span>
              <span className="block">{item.message}</span>
              <span className="mt-1 block text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
            </span>
          </button>
        )) : (
          <div className="grid min-h-40 place-items-center content-center px-6 text-center text-sm text-slate-500">
            <span className="mb-2.5 grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>
            </span>
            <p>You are all caught up.</p>
          </div>
        )}
      </div>
    </div>}
  </div>;
}
