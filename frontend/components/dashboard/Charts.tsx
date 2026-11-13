'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '@/components/ui';

/* ------------------------------------------------------------------ */
/* Area chart: one series over time, with a crosshair tooltip          */
/* ------------------------------------------------------------------ */

export interface SeriesPoint {
  /** Axis label, e.g. "Nov" or "12 Nov" */
  label: string;
  value: number;
  /** Longer label for the tooltip, e.g. "November 2026" */
  detail?: string;
}

/** Round the max up to a clean number and return 4 evenly spaced ticks. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? rough;
  const stepInt = Math.max(1, Math.ceil(step));
  return [0, 1, 2, 3, 4].map((i) => i * stepInt);
}

/** Monotone cubic path so the curve never overshoots below zero. */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const n = pts.length;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const m = pts.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export function AreaChart({ data, unit, height = 240, className }: { data: SeriesPoint[]; unit: string; height?: number; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = { top: 12, right: 12, bottom: 28, left: 36 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const ticks = useMemo(() => niceTicks(Math.max(0, ...data.map((d) => d.value))), [data]);
  const top = ticks[ticks.length - 1] || 1;

  const pts: Array<[number, number]> = data.map((d, i) => [
    pad.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    pad.top + plotH - (d.value / top) * plotH,
  ]);
  const line = smoothPath(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${pad.top + plotH} L${pts[0][0]},${pad.top + plotH} Z` : '';

  // Show at most ~6 x labels so they never collide.
  const every = Math.max(1, Math.ceil(data.length / 6));
  const gradientId = useMemo(() => `area-${Math.random().toString(36).slice(2, 8)}`, []);

  function onMove(clientX: number) {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !pts.length) return;
    const x = clientX - rect.left;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(p[0] - x) < Math.abs(pts[best][0] - x)) best = i; });
    setHover(best);
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hp = hover !== null ? pts[hover] : null;

  return (
    <div className={cx('relative', className)}>
      <div
        ref={wrapRef}
        className="relative outline-none"
        tabIndex={0}
        role="img"
        aria-label={`${unit} over time, ${total} in total`}
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(data.length - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? data.length) - 1));
          if (e.key === 'ArrowRight') setHover((h) => Math.min(data.length - 1, (h ?? -1) + 1));
        }}
      >
        <svg width={width} height={height} className="block max-w-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3267b0" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3267b0" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => {
            const y = pad.top + plotH - (t / top) * plotH;
            return (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : '3 4'} />
                <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">{t.toLocaleString()}</text>
              </g>
            );
          })}
          {data.map((d, i) => (i % every === 0 || i === data.length - 1) && (
            <text key={i} x={pts[i][0]} y={height - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-slate-400 text-[11px]">{d.label}</text>
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke="#3267b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {hp && (
            <g>
              <line x1={hp[0]} x2={hp[0]} y1={pad.top} y2={pad.top + plotH} stroke="#94a3b8" strokeWidth="1" />
              <circle cx={hp[0]} cy={hp[1]} r="5" fill="#3267b0" stroke="#ffffff" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hover !== null && hp && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(Math.max(hp[0], 70), width - 70), top: Math.max(hp[1] - 10, 48) }}
          >
            <p className="text-base font-semibold text-navy-900 tabular-nums">{data[hover].value.toLocaleString()}</p>
            <p className="text-slate-500">{unit} · {data[hover].detail ?? data[hover].label}</p>
          </div>
        )}
      </div>
      {/* Same numbers as a table for screen readers */}
      <table className="sr-only">
        <caption>{unit}</caption>
        <tbody>{data.map((d, i) => <tr key={i}><th scope="row">{d.detail ?? d.label}</th><td>{d.value}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Bucket ISO dates into a series: daily for ranges up to 31 days, otherwise monthly. */
export function bucketByDate(dates: ReadonlyArray<string>, range: '30d' | '6m' | '12m' | 'all'): SeriesPoint[] {
  const now = new Date();
  const parsed = dates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()));

  if (range === '30d') {
    const days: SeriesPoint[] = [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      days.push({
        label: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        detail: day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' }),
        value: parsed.filter((d) => d >= day && d < next).length,
      });
    }
    return days;
  }

  let months = range === '6m' ? 6 : 12;
  if (range === 'all' && parsed.length) {
    const first = new Date(Math.min(...parsed.map((d) => d.getTime())));
    months = Math.max(2, (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1);
  }
  const out: SeriesPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    out.push({
      label: start.toLocaleDateString(undefined, { month: 'short' }),
      detail: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      value: parsed.filter((d) => d >= start && d < end).length,
    });
  }
  return out;
}

export const rangeOptions = [
  { value: '30d', label: 'Last 30 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
] as const;

/* ------------------------------------------------------------------ */
/* Status breakdown: one segmented bar + a labelled list               */
/* ------------------------------------------------------------------ */

/** Status colours, always shown together with a text label and count. */
export const statusColor = {
  good: '#059669',
  warning: '#f59e0b',
  critical: '#dc2626',
  info: '#3267b0',
  neutral: '#64748b',
} as const;

export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

export function StatusBreakdown({ items, className }: { items: ReadonlyArray<BreakdownItem>; className?: string }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const pct = (v: number) => (total ? (v / total) * 100 : 0);
  return (
    <div className={className}>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={items.map((i) => `${i.label} ${i.value}`).join(', ')}>
        {items.filter((i) => i.value > 0).map((i) => (
          <span key={i.key} title={`${i.label}: ${i.value} (${pct(i.value).toFixed(1)}%)`} style={{ width: `${pct(i.value)}%`, background: i.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.key} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.color }} />
            <span className="flex-1 text-slate-700">{i.label}</span>
            <span className="font-semibold text-navy-900 tabular-nums">{i.value}</span>
            <span className="w-12 text-right text-xs text-slate-500 tabular-nums">{pct(i.value).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
