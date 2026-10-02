'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { api('/notifications').then(setItems).catch(() => {}); }, []);
  const unread = items.filter(item => !item.is_read).length;
  async function markAll() {
    await api('/notifications/read-all', { method: 'PATCH' });
    setItems(current => current.map(item => ({ ...item, is_read: true })));
  }
  return <div className="notification-wrap"><button className="notification-button" aria-label={`${unread} unread notifications`} onClick={() => setOpen(!open)}>◌{unread > 0 && <span>{unread}</span>}</button>{open && <div className="notification-menu"><div className="flex items-center justify-between border-b border-slate-100 p-4"><strong className="text-sm">Notifications</strong>{unread > 0 && <button className="text-xs font-semibold text-indigo-600" onClick={markAll}>Mark all read</button>}</div><div className="max-h-80 overflow-y-auto">{items.length ? items.map(item => <article key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`}><span /><div><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></article>) : <p className="p-6 text-center text-xs text-slate-400">You are all caught up.</p>}</div></div>}</div>;
}
