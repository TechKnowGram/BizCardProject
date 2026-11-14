'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import ProtectedImage from '@/components/ui/ProtectedImage';
import Icon from '@/components/ui/Icon';
import { cx } from '@/components/ui';
import type { LayerNode } from '@/lib/types';

const PAGE = 80;
/** This many plain shapes in a row are shown as one expandable line, so a logo drawn in 50 paths stays readable. */
const RUN_MIN = 6;

type Item = { type: 'node'; node: LayerNode } | { type: 'run'; id: string; nodes: LayerNode[] };

/** Split a node's children into rows: each child on its own, except long runs of plain shapes. */
function toItems(children: LayerNode[]): Item[] {
  const items: Item[] = [];
  let run: LayerNode[] = [];
  const flush = () => {
    if (run.length >= RUN_MIN) items.push({ type: 'run', id: `run-${run[0].id}`, nodes: run });
    else run.forEach((node) => items.push({ type: 'node', node }));
    run = [];
  };
  for (const node of children) {
    if (node.kind === 'shape' && !node.clip_shape) run.push(node);
    else { flush(); items.push({ type: 'node', node }); }
  }
  flush();
  return items;
}

/** Every id that has something inside it, so "Expand all" can open the whole tree. */
export function expandableIds(nodes: LayerNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: LayerNode[]) => {
    for (const node of list) {
      if (node.children.length) { ids.push(String(node.id)); walk(node.children); }
    }
    toItems(list).forEach((item) => { if (item.type === 'run') ids.push(item.id); });
  };
  walk(nodes);
  return ids;
}

function Swatch({ fill, stroke }: { fill?: string | null; stroke?: string | null }) {
  return (
    <span
      className="size-6 shrink-0 rounded border border-slate-300 bg-[conic-gradient(#e2e8f0_25%,#fff_0_50%,#e2e8f0_0_75%,#fff_0)] bg-[length:8px_8px]"
      style={fill ? { background: fill, borderColor: stroke || undefined } : stroke ? { borderColor: stroke, borderWidth: 2 } : undefined}
      aria-hidden="true"
    />
  );
}

function Thumb({ node, companyId }: { node: LayerNode; companyId: number }): ReactNode {
  if (node.kind === 'layer') return <span className="grid size-6 shrink-0 place-items-center rounded bg-brand-600 text-white"><Icon name="layers" size={14} /></span>;
  if (node.kind === 'group' || node.kind === 'clip') return <span className="grid size-6 shrink-0 place-items-center rounded border border-slate-300 bg-slate-50 text-slate-500"><Icon name="folder" size={14} /></span>;
  if (node.kind === 'image') {
    return (
      <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded border border-slate-300 bg-slate-50">
        {node.thumbnail && <ProtectedImage path={`/templates/image/assets/${companyId}/${node.thumbnail}`} alt="" className="max-h-full max-w-full object-contain" />}
      </span>
    );
  }
  if (node.kind === 'text') {
    return <span className="grid size-6 shrink-0 place-items-center rounded border border-slate-300 bg-white text-xs" style={{ color: node.color || undefined, fontWeight: node.bold ? 700 : 400 }}>T</span>;
  }
  return <Swatch fill={node.fill} stroke={node.stroke} />;
}

function detail(node: LayerNode): string {
  if (node.kind === 'text') return `${node.size_pt} pt${node.bold ? ' · bold' : ''}`;
  if (node.kind === 'image') return node.width_px && node.height_px ? `${node.width_px} × ${node.height_px} px` : '';
  if (node.kind === 'shape') return [node.fill ? `Fill ${node.fill}` : '', node.stroke ? `Stroke ${node.stroke}` : ''].filter(Boolean).join(' · ');
  return '';
}

export interface LayerTreeProps {
  nodes: LayerNode[];
  companyId: number;
  open: Set<string>;
  onToggle: (id: string) => void;
  selected: LayerNode | null;
  onSelect: (node: LayerNode | null) => void;
}

/** Illustrator's Layers panel: layers open into groups, clip groups and objects, topmost first. */
export default function LayerTree({ nodes, companyId, open, onToggle, selected, onSelect }: LayerTreeProps) {
  return <ul role="tree" aria-label="Layers" className="space-y-0.5">{nodes.map((node) => <Row key={node.id} node={node} depth={0} {...{ companyId, open, onToggle, selected, onSelect }} />)}</ul>;
}

type RowProps = Omit<LayerTreeProps, 'nodes'> & { node: LayerNode; depth: number };

function Chevron({ open, hidden }: { open: boolean; hidden?: boolean }) {
  return <Icon name="chevronRight" size={14} className={cx('shrink-0 text-slate-400 transition-transform', open && 'rotate-90', hidden && 'invisible')} />;
}

function Row({ node, depth, companyId, open, onToggle, selected, onSelect }: RowProps) {
  const expandable = node.children.length > 0;
  const expanded = open.has(String(node.id));
  const active = selected?.id === node.id && selected.kind === node.kind;
  const info = node.kind === 'layer' ? `${node.count ?? 0} objects` : node.kind === 'group' || node.kind === 'clip' ? `${countLeaves(node)}` : detail(node);
  return (
    <li role="treeitem" aria-expanded={expandable ? expanded : undefined} aria-selected={active}>
      <div
        className={cx('flex items-center gap-2 rounded-md py-1 pr-2 text-sm transition-colors', active ? 'bg-brand-50 ring-1 ring-brand-600/40' : 'hover:bg-slate-50', node.kind === 'layer' && 'bg-slate-50 font-semibold')}
        style={{ paddingLeft: 6 + depth * 16 }}
      >
        <button type="button" onClick={() => expandable && onToggle(String(node.id))} aria-label={expanded ? 'Collapse' : 'Expand'} className="grid size-5 place-items-center" tabIndex={expandable ? 0 : -1}>
          <Chevron open={expanded} hidden={!expandable} />
        </button>
        <button type="button" onClick={() => onSelect(active ? null : node)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <Thumb node={node} companyId={companyId} />
          <span className="min-w-0 flex-1">
            <span className={cx('block truncate text-navy-900', node.clip_shape && 'underline decoration-slate-400 underline-offset-2')}>{node.name || '(empty)'}</span>
          </span>
          {info && <span className="shrink-0 text-xs text-slate-500 tabular-nums">{info}</span>}
        </button>
      </div>
      {expandable && expanded && <Children nodes={node.children} depth={depth + 1} {...{ companyId, open, onToggle, selected, onSelect }} />}
    </li>
  );
}

function countLeaves(node: LayerNode): number {
  if (!node.children.length) return node.kind === 'group' || node.kind === 'clip' ? 0 : 1;
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

function Children({ nodes, depth, companyId, open, onToggle, selected, onSelect }: Omit<RowProps, 'node'> & { nodes: LayerNode[] }) {
  const [limit, setLimit] = useState(PAGE);
  const items = toItems(nodes);
  return (
    <ul role="group" className="space-y-0.5">
      {items.slice(0, limit).map((item) => item.type === 'node'
        ? <Row key={item.node.id} node={item.node} depth={depth} {...{ companyId, open, onToggle, selected, onSelect }} />
        : <RunRow key={item.id} item={item} depth={depth} {...{ companyId, open, onToggle, selected, onSelect }} />)}
      {items.length > limit && (
        <li>
          <button type="button" onClick={() => setLimit((value) => value + PAGE)} className="ml-6 rounded-md px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50" style={{ marginLeft: 6 + depth * 16 + 20 }}>
            Show more ({items.length - limit} left)
          </button>
        </li>
      )}
    </ul>
  );
}

function RunRow({ item, depth, companyId, open, onToggle, selected, onSelect }: Omit<RowProps, 'node'> & { item: Extract<Item, { type: 'run' }> }) {
  const expanded = open.has(item.id);
  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm text-slate-600 hover:bg-slate-50"
        style={{ paddingLeft: 6 + depth * 16 }}
      >
        <span className="grid size-5 place-items-center"><Chevron open={expanded} /></span>
        <span className="grid size-6 shrink-0 place-items-center rounded border border-dashed border-slate-300 bg-white text-slate-500"><Icon name="folder" size={14} /></span>
        <span className="min-w-0 flex-1 truncate">{item.nodes.length} paths <span className="text-xs text-slate-400">(drawn artwork, for example a logo)</span></span>
      </button>
      {expanded && (
        <ul role="group" className="space-y-0.5">
          {item.nodes.map((node) => <Row key={node.id} node={node} depth={depth + 1} {...{ companyId, open, onToggle, selected, onSelect }} />)}
        </ul>
      )}
    </li>
  );
}
