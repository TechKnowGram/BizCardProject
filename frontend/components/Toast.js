'use client';

import { useEffect } from 'react';

export default function Toast({ type = 'success', message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return <div className={`toast toast-${type}`} role={type === 'error' ? 'alert' : 'status'}>
    <span>{type === 'error' ? '!' : '✓'}</span><p>{message}</p>
    <button type="button" aria-label="Dismiss notification" onClick={onClose}>×</button>
  </div>;
}
