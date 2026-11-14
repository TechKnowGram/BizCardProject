'use client';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';

export interface ProtectedImageProps {
  path: string;
  alt: string;
  className?: string;
}

export default function ProtectedImage({ path, alt, className = '' }: ProtectedImageProps) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setSource(null);
    fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Image unavailable'); return response.blob(); })
      .then(blob => { if (controller.signal.aborted) return; objectUrl = URL.createObjectURL(blob); setSource(objectUrl); })
      .catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  // eslint-disable-next-line @next/next/no-img-element
  return source ? <img src={source} alt={alt} className={className} /> : null;
}
