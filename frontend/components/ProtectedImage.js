'use client';
import { useEffect, useState } from 'react';
import { getToken } from '../lib/api';

export default function ProtectedImage({ path, alt, className = '' }) {
  const [source, setSource] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); let objectUrl;
    setSource(null);
    fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Image unavailable'); return response.blob(); })
      .then(blob => { if (controller.signal.aborted) return; objectUrl = URL.createObjectURL(blob); setSource(objectUrl); })
      .catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  return source ? <img src={source} alt={alt} className={className} /> : null;
}
