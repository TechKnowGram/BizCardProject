'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    api('/notifications').then(setItems).catch(() => {});
    function close(event) { if (wrap.current && !wrap.current.contains(event.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = items.filter(item => !item.is_read).length;

  async function markAll() {
    await api('/notifications/read-all', { method: 'PATCH' });
    setItems(current => current.map(item => ({ ...item, is_read: true })));
  }

  async function markOne(item) {
    if (item.is_read) return;
    await api(`/notifications/item/${item.id}/read`, { method: 'PATCH' });
    setItems(current => current.map(value => value.id === item.id ? { ...value, is_read: true } : value));
  }

  return <div className="notification-wrap" ref={wrap}>
    <button className="notification-button" aria-label={`${unread} unread notifications`} aria-expanded={open} onClick={() => setOpen(!open)}>
      <svg className="bell-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </svg>{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
    </button>
    {open && <div className="notification-menu">
      <div className="notification-head"><div><strong>Notifications</strong><small>{unread ? `${unread} unread` : 'All caught up'}</small></div>{unread > 0 && <button onClick={markAll}>Mark all read</button>}</div>
      <div className="notification-list">{items.length ? items.map(item => <button key={item.id} onClick={() => markOne(item)} className={`notification-item ${item.is_read ? '' : 'unread'}`}><span /><div><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString()}</small></div></button>) : <div className="notification-empty"><span>✓</span><p>You are all caught up.</p></div>}</div>
    </div>}
  </div>;
}
