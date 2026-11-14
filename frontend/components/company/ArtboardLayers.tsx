'use client';

import { useEffect, useMemo, useState } from 'react';
import ProtectedImage from '@/components/ui/ProtectedImage';
import ReviewDialog from '@/components/ui/ReviewDialog';
import { cx } from '@/components/ui';
import { api } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import LayerTree, { expandableIds } from '@/components/company/LayerTree';
import type { Artboard, ArtboardLayers as Layers, LayerNode, LayerObject } from '@/lib/types';

type Kind = 'images' | 'texts' | 'shapes';

const KIND_LABEL: Record<Kind, string> = { images: 'Images', texts: 'Text', shapes: 'Shapes' };
const SHAPE_LABEL: Record<string, string> = { rectangle: 'Rectangle', polygon: 'Polygon', ellipse: 'Ellipse', curve: 'Curve', line: 'Line', path: 'Path', gradient: 'Gradient' };
const PAGE = 60;

const percent = (value: number) => `${Math.round(value * 100)}%`;

function Swatch({ fill, stroke }: { fill: string | null; stroke: string | null }) {
  return (
    <span
      className="size-8 shrink-0 rounded-md border border-slate-300 bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:8px_8px]"
      style={fill ? { background: fill, borderColor: stroke || undefined } : stroke ? { borderColor: stroke, borderWidth: 2 } : undefined}
      aria-hidden="true"
    />
  );
}

export interface ArtboardLayersProps {
  uploadId: string;
  companyId: number;
  artboard: Artboard;
  onClose: () => void;
}

/** Every layer of one artboard, with its images, text and shapes listed by kind. Click a row to see where it sits. */
export default function ArtboardLayers({ uploadId, companyId, artboard, onClose }: ArtboardLayersProps) {
  const [data, setData] = useState<Layers | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<Kind>('texts');
  const [layer, setLayer] = useState('ALL');
  const [selected, setSelected] = useState<{ kind: Kind; id: number } | null>(null);
  const [limit, setLimit] = useState(PAGE);
  // The default view is Illustrator's layers tree; the other groups everything by kind.
  const [view, setView] = useState<'layers' | 'types'>('layers');
  const [node, setNode] = useState<LayerNode | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    api<Layers>('/templates/illustrator/layers', { method: 'POST', body: JSON.stringify({ upload_id: uploadId, artboard: artboard.index }) })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setOpen(new Set(result.tree.map((layer) => String(layer.id))));
        if (!result.tree.length) setView('types');
      })
      .catch((e) => { if (!cancelled) setError((e as ApiError).message); });
    return () => { cancelled = true; };
  }, [uploadId, artboard.index]);

  const lists = useMemo(() => {
    if (!data) return null;
    const inLayer = <T extends LayerObject>(items: T[]) => (layer === 'ALL' ? items : items.filter((item) => item.layer === layer));
    return { images: inLayer(data.images), texts: inLayer(data.texts), shapes: inLayer(data.shapes) };
  }, [data, layer]);

  const flatHighlight = lists && selected ? (lists[selected.kind] as LayerObject[]).find((item) => item.id === selected.id) : null;
  const highlight = view === 'layers' ? (node && node.w != null && node.x != null && node.y != null && node.h != null ? { x: node.x, y: node.y, w: node.w, h: node.h } : null) : flatHighlight;
  const toggle = (id: string) => setOpen((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const shapeKinds = useMemo(() => {
    const counts: Record<string, number> = {};
    (lists?.shapes || []).forEach((shape) => { counts[shape.kind] = (counts[shape.kind] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [lists]);

  const rowClass = (active: boolean) => cx('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors', active ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50');
  const pick = (next: Kind, id: number) => setSelected((current) => (current?.kind === next && current.id === id ? null : { kind: next, id }));

  return (
    <ReviewDialog title={`${artboard.name} layers`} eyebrow="Illustrator file" onClose={onClose}>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {!data && !error && <div className="h-72 animate-pulse rounded-xl bg-slate-100" aria-busy="true" aria-label="Reading the layers" />}
      {data && lists && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <div className="relative mx-auto max-h-[26rem] overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ aspectRatio: `${artboard.width_mm} / ${artboard.height_mm}` }}>
              <ProtectedImage path={`/templates/image/assets/${companyId}/${uploadId}_ab${artboard.index}.jpg`} alt={`${artboard.name} preview`} className="absolute inset-0 size-full object-contain" />
              {highlight && (
                <span
                  className="pointer-events-none absolute rounded-[2px] border-2 border-brand-600 bg-brand-600/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.18)]"
                  style={{ left: percent(highlight.x), top: percent(highlight.y), width: percent(highlight.w), height: percent(highlight.h) }}
                />
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">{artboard.width_mm} × {artboard.height_mm} mm. Click a row to see where it sits on the card.</p>

            <ul className="mt-3 space-y-1.5" aria-label="Layers">
              {data.layers.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-navy-900">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.text} text · {item.image} images · {item.shape} shapes</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-lg border border-slate-200 p-0.5" role="tablist" aria-label="How to list the objects">
                {(['layers', 'types'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => { setView(value); setNode(null); setSelected(null); }}
                    className={cx('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', view === value ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50')}
                  >
                    {value === 'layers' ? 'Layers' : 'By type'}
                  </button>
                ))}
              </div>
              {view === 'layers' && data.tree.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <button type="button" onClick={() => setOpen(new Set(expandableIds(data.tree)))} className="rounded-md px-2 py-1 font-medium text-brand-700 hover:bg-brand-50">Expand all</button>
                  <button type="button" onClick={() => setOpen(new Set(data.tree.map((layer) => String(layer.id))))} className="rounded-md px-2 py-1 font-medium text-brand-700 hover:bg-brand-50">Collapse</button>
                </div>
              )}
            </div>

            {view === 'layers' ? (
              <>
                <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 p-1.5">
                  <LayerTree nodes={data.tree} companyId={companyId} open={open} onToggle={toggle} selected={node} onSelect={setNode} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Topmost first, as in Illustrator. The file keeps layers, groups made from placed art and clip groups. Guides and names typed into Illustrator are not saved in it.</p>
              </>
            ) : (
            <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 p-0.5" role="tablist" aria-label="Kind of object">
                {(['images', 'texts', 'shapes'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={kind === value}
                    onClick={() => { setKind(value); setSelected(null); setLimit(PAGE); }}
                    className={cx('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', kind === value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
                  >
                    {KIND_LABEL[value]} <span className="tabular-nums opacity-80">({lists[value].length})</span>
                  </button>
                ))}
              </div>
              {data.layers.length > 1 && (
                <select value={layer} onChange={(e) => { setLayer(e.target.value); setSelected(null); setLimit(PAGE); }} aria-label="Layer" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700">
                  <option value="ALL">All layers</option>
                  {data.layers.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              )}
            </div>

            {kind === 'shapes' && shapeKinds.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
                {shapeKinds.map(([name, count]) => <span key={name} className="rounded-md bg-slate-100 px-2 py-0.5">{SHAPE_LABEL[name] || name} {count}</span>)}
              </p>
            )}

            <ul className="mt-3 max-h-[26rem] space-y-1.5 overflow-y-auto pr-1">
              {lists[kind].length === 0 && <li className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No {KIND_LABEL[kind].toLowerCase()} on this artboard.</li>}

              {kind === 'images' && lists.images.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick('images', item.id)} className={rowClass(selected?.kind === 'images' && selected.id === item.id)}>
                    <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      {item.thumbnail && <ProtectedImage path={`/templates/image/assets/${companyId}/${item.thumbnail}`} alt="" className="max-h-full max-w-full object-contain" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-navy-900">Image</span>
                      <span className="block text-xs text-slate-500 tabular-nums">{item.width_px && item.height_px ? `${item.width_px} × ${item.height_px} px · ` : ''}{percent(item.w)} wide</span>
                    </span>
                  </button>
                </li>
              ))}

              {kind === 'texts' && lists.texts.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick('texts', item.id)} className={rowClass(selected?.kind === 'texts' && selected.id === item.id)}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-sm" style={{ color: item.color, fontWeight: item.bold ? 700 : 400 }}>Aa</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy-900">{item.text}</span>
                      <span className="block text-xs text-slate-500 tabular-nums">{item.size_pt} pt · {item.bold ? 'bold' : 'regular'} · {item.color}</span>
                    </span>
                  </button>
                </li>
              ))}

              {kind === 'shapes' && lists.shapes.slice(0, limit).map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => pick('shapes', item.id)} className={rowClass(selected?.kind === 'shapes' && selected.id === item.id)}>
                    <Swatch fill={item.fill} stroke={item.stroke} />
                    <span className="min-w-0">
                      <span className="block font-medium text-navy-900">{SHAPE_LABEL[item.kind] || item.kind}</span>
                      <span className="block text-xs text-slate-500 tabular-nums">
                        {item.fill ? `Fill ${item.fill}` : 'No fill'}{item.stroke ? ` · Stroke ${item.stroke}${item.stroke_width ? ` ${item.stroke_width} pt` : ''}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {kind === 'shapes' && lists.shapes.length > limit && (
                <li>
                  <button type="button" onClick={() => setLimit((value) => value + PAGE)} className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
                    Show more ({lists.shapes.length - limit} left)
                  </button>
                </li>
              )}
            </ul>
            </>
            )}
            {data.truncated && <p className="mt-2 text-xs text-amber-700">This artboard has a very large number of objects; only the first ones are listed.</p>}
          </div>
        </div>
      )}
    </ReviewDialog>
  );
}
