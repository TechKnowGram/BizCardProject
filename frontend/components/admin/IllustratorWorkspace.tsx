'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import ProtectedImage from '@/components/ui/ProtectedImage';
import { FieldPicture, FieldText, SideFields, assetPath } from '@/components/cards/ImageTemplateCard';
import type { CardValues } from '@/components/cards/ImageTemplateCard';
import { useAdmin } from '@/components/admin/AdminDashboard';
import { cx } from '@/components/ui';
import { api, getToken } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type { ArtboardPieces, ComposeResult, IllustratorAnalysis, LayerPiece, Template, TemplateAnalysis, TemplateField, TemplateFieldRole } from '@/lib/types';

/** The upload page stores what the server read from the .ai file here, then opens this workspace. */
export const WORKSPACE_KEY = 'bizcard.illustrator-workspace';
export interface WorkspaceHandoff { result: IllustratorAnalysis; fileName: string }
/** What the server sends to reopen a saved template (see POST /admin/templates/{id}/workspace). */
interface EditSession { template_id: number; name: string; description: string; result: IllustratorAnalysis; auto_back: Record<string, unknown> | null }

const SHARED = { company_id: 0 };
/** A file from the temporary folder of the uploaded project (a layer, drawn as SVG or a picture). */
const projectFile = (uploadId: string, file: string) => '/templates/image/projects/' + uploadId + '/' + file;
/** Browser weight and family for a PDF font name such as "Montserrat-Black". */
function fontStyle(font: string | null | undefined, bold: boolean | undefined) {
  const name = (font || '').toLowerCase();
  const weight = name.includes('black') ? 900 : name.includes('heavy') || name.includes('extrabold') ? 800 : name.includes('semibold') ? 600 : name.includes('bold') || bold ? 700 : name.includes('medium') ? 500 : name.includes('light') ? 300 : 400;
  const family = (font || '').split('-')[0].replace(/([a-z])([A-Z])/g, '$1 $2');
  return { fontWeight: weight, fontFamily: (family ? "'" + family + "', " : '') + 'Helvetica, Arial, sans-serif' };
}
/** Work on an uploaded file is over: ask the server to delete its working copy and the pictures drawn from it. */
function endSession(uploadId: string | undefined, discard: (string | undefined)[] = []) {
  if (!uploadId) return;
  const unsaved = discard.filter(Boolean).map(name => 'discard=' + encodeURIComponent(name as string)).join('&');
  void fetch('/api/templates/illustrator/session/' + uploadId + (unsaved ? '?' + unsaved : ''), { method: 'DELETE', headers: { Authorization: 'Bearer ' + getToken() }, keepalive: true }).catch(() => {});
} // 0 is the platform's shared folder
const ROLE_LABELS: Record<TemplateFieldRole, string> = {
  name: 'Name', title: 'Job title', department: 'Department', phone: 'Phone', email: 'Email',
  website: 'Website', address: 'Address', company: 'Company name', logo: 'Company logo', photo: 'Photo', qr: 'QR code', other: 'Keep as design', static_text: 'Added text', static_image: 'Added picture',
};
const ROLE_ORDER = (Object.keys(ROLE_LABELS) as TemplateFieldRole[]).filter(r => !r.startsWith('static_'));
const IMAGE_ROLES: TemplateFieldRole[] = ['photo', 'logo', 'qr'];
const newUid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const isAdded = (f: TemplateField) => f.role === 'static_text' || f.role === 'static_image';
const MM_PX = 96 / 25.4; // Illustrator's 100% is 96 px per inch
const SAMPLE: CardValues = {
  name: 'Farhana Akter', title: 'Head of Finance', department: 'Finance', phone: '+880 1711 204 518', email: 'farhana@company.com',
  website: 'www.company.com', address: 'Gulshan 2, Dhaka 1212', company: 'Your company', photoPath: null, logoPath: null,
};

type Side = 'front' | 'back';
type Tool = 'select' | 'hand' | 'zoom';
type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Doc = { front: TemplateField[]; back: TemplateField[] };
type Gesture =
  | { kind: 'field'; index: number; handle: Handle; startX: number; startY: number; field: TemplateField }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number };

const HANDLES: { id: Handle; x: number; y: number; cursor: string }[] = [
  { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize' }, { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize' }, { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize' }, { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize' }, { id: 's', x: 0.5, y: 1, cursor: 'ns-resize' }, { id: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
];
const MIN = 0.02;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function resize(f: TemplateField, handle: Handle, dx: number, dy: number): Partial<TemplateField> {
  if (handle === 'move') return { x: clamp(f.x + dx, 0, 1 - f.w), y: clamp(f.y + dy, 0, 1 - f.h) };
  let left = f.x, top = f.y, right = f.x + f.w, bottom = f.y + f.h;
  if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN);
  if (handle.includes('e')) right = clamp(right + dx, left + MIN, 1);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + MIN, 1);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function Ruler({ vertical, origin, pxPerMm, length, mm }: { vertical?: boolean; origin: number; pxPerMm: number; length: number; mm: number }) {
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => s * pxPerMm >= 48) ?? 500;
  const first = Math.floor((0 - origin) / pxPerMm / step) * step;
  const last = Math.ceil((length - origin) / pxPerMm / step) * step;
  const marks: ReactNode[] = [];
  for (let v = first; v <= last; v += step) {
    const at = origin + v * pxPerMm;
    marks.push(vertical
      ? <g key={v}><line x1={12} x2={20} y1={at} y2={at} /><text x={2} y={at + 10} transform={`rotate(-90 2 ${at + 10})`}>{v}</text></g>
      : <g key={v}><line x1={at} x2={at} y1={12} y2={20} /><text x={at + 3} y={10}>{v}</text></g>);
  }
  return (
    <svg className={cx('pointer-events-none absolute z-20 bg-[#2b2b2b] text-[9px] text-zinc-400', vertical ? 'top-5 left-0 h-[calc(100%-20px)] w-5' : 'top-0 left-5 h-5 w-[calc(100%-20px)]')} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" fill="currentColor" style={{ transform: vertical ? 'translateY(-20px)' : 'translateX(-20px)' }}>{marks}</g>
      <title>{mm} mm</title>
    </svg>
  );
}

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-black/60">
      <header className="flex items-center justify-between bg-[#3a3a3a] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-zinc-300 uppercase">
        <span>{title}</span>{action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

const numberClass = 'w-full rounded-sm border border-black/50 bg-[#1f1f1f] px-1.5 py-1 text-xs text-zinc-100 tabular-nums outline-none focus:border-[#4a90ff]';

function NumberField({ label, value, onChange, onFocus, step = 0.1, disabled }: { label: string; value: number; onChange: (value: number) => void; onFocus: () => void; step?: number; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
      <span className="w-3.5 shrink-0">{label}</span>
      <input type="number" className={numberClass} step={step} disabled={disabled} value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0} onFocus={onFocus} onChange={e => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(n); }} />
    </label>
  );
}

function ToolButton({ label, shortcut, active, onClick, children }: { label: string; shortcut: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={`${label} (${shortcut})`} aria-label={label} aria-pressed={active} onClick={onClick}
      className={cx('grid size-8 place-items-center rounded-sm', active ? 'bg-[#4a90ff] text-white' : 'text-zinc-300 hover:bg-white/10')}>
      {children}
    </button>
  );
}

const TEXT_ROLES: TemplateFieldRole[] = ['name', 'title', 'department', 'phone', 'email', 'website', 'address', 'company'];
const IMAGE_CHOICES: TemplateFieldRole[] = ['photo', 'logo', 'qr'];

type Box = { x: number; y: number; w: number; h: number };
function overlap(f: Box, n: Box): number {
  const w = Math.min(f.x + f.w, n.x + n.w) - Math.max(f.x, n.x);
  const h = Math.min(f.y + f.h, n.y + n.h) - Math.max(f.y, n.y);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (f.w * f.h + n.w * n.h - w * h);
}

const KIND_GLYPH: Record<LayerPiece['kind'], string> = { text: 'T', image: '▨', path: '◆', group: '▣' };

type Row = { kind: 'field'; i: number } | { kind: 'piece'; pc: LayerPiece };

/** Which of the file's own objects each field sits on (piece index -> field index): the detected boxes line up with them. */
function matchFields(fields: TemplateField[], pieces: LayerPiece[]): Map<number, number> {
  const taken = new Set<number>(), found = new Map<number, number>();
  for (const node of pieces) {
    if ((node.kind !== 'text' && node.kind !== 'image') || node.w <= 0) continue;
    let best = -1, score = 0.25;
    fields.forEach((f, i) => { const o = taken.has(i) || isAdded(f) ? 0 : overlap(f, node); if (o > score) { score = o; best = i; } });
    if (best >= 0) { taken.add(best); found.set(node.index, best); }
  }
  return found;
}

/** Objects of the file that a changeable field replaces, so they are left out of the printed artwork. */
function replacedPieces(fields: TemplateField[], pieces: LayerPiece[]): Set<number> {
  const out = new Set<number>();
  matchFields(fields, pieces).forEach((fieldIndex, pieceIndex) => {
    const piece = pieces.find(p => p.index === pieceIndex);
    const role = fields[fieldIndex]?.role;
    if (piece && role && ((piece.kind === 'text' && TEXT_ROLES.includes(role)) || (piece.kind === 'image' && IMAGE_CHOICES.includes(role)))) out.add(pieceIndex);
  });
  return out;
}

type DragProps = {
  draggable: boolean; accepts: boolean; edge: 'above' | 'below' | null;
  onDragStart: () => void; onDragEnd: () => void; onOver: (edge: 'above' | 'below') => void; onDrop: () => void;
};

/** A row of the Layers panel that can be picked up and dropped between other rows, like Illustrator's. */
function RowShell({ drag, className, children }: { drag: DragProps; className: string; children: ReactNode }) {
  return (
    <li draggable={drag.draggable}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'layer'); drag.onDragStart(); }}
      onDragEnd={drag.onDragEnd}
      onDragOver={e => { if (!drag.accepts) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); drag.onOver(e.clientY < r.top + r.height / 2 ? 'above' : 'below'); }}
      onDrop={e => { e.preventDefault(); drag.onDrop(); }}
      className={cx('relative', className)}>
      {children}
      {drag.edge && <span aria-hidden="true" className={cx('pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-[#4a90ff]', drag.edge === 'above' ? 'top-0' : 'bottom-0')} />}
    </li>
  );
}

const eyeOn = <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;

/** One of the file's own objects: eye, small picture, name, and (for text and pictures) what it becomes. */
function PieceRow({ piece, uploadId, hidden, role, active, drag, onEye, onDelete, onPick, onRole }: {
  piece: LayerPiece; uploadId: string; hidden: boolean; role: TemplateFieldRole | 'fixed'; active: boolean; drag: DragProps;
  onEye: () => void; onDelete: () => void; onPick: () => void; onRole: (role: TemplateFieldRole | 'fixed') => void;
}) {
  const bundle = /^\d+ more objects$/.test(piece.name); // objects past the limit are shown together and cannot be removed one by one
  const choices = piece.kind === 'text' ? TEXT_ROLES : piece.kind === 'image' ? IMAGE_CHOICES : null;
  return (
    <RowShell drag={drag} className={cx('flex items-center gap-1 pr-2 text-xs', active ? 'bg-[#4a90ff]/30 text-white' : 'text-zinc-300 hover:bg-white/5', role !== 'fixed' && !active && 'bg-[#4a90ff]/10')}>
      {bundle ? <span className="size-6 shrink-0" /> : (
        <button type="button" aria-label={hidden ? 'Show layer' : 'Hide layer'} title={hidden ? 'Hidden: removed from the template and the .ai file when you save' : 'Hide (removes it from the template and the .ai file when you save)'} aria-pressed={!hidden} onClick={onEye} className="grid size-6 shrink-0 place-items-center text-zinc-400 hover:text-white">
          {hidden ? <span className="size-3" /> : eyeOn}
        </button>
      )}
      <button type="button" onClick={onPick} className={cx('flex min-w-0 flex-1 items-center gap-2 py-1 text-left', hidden && 'opacity-50')}>
        <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-sm bg-[#4a4a4a] text-[10px] text-zinc-300">
          {piece.file && uploadId ? <ProtectedImage path={projectFile(uploadId, piece.file)} alt="" className="max-h-full max-w-full object-contain" /> : KIND_GLYPH[piece.kind]}
        </span>
        <span className="truncate">{piece.name}</span>
      </button>
      {choices && (
        <select aria-label={'What ' + piece.name + ' is'} value={role} onChange={e => onRole(e.target.value as TemplateFieldRole | 'fixed')}
          className={cx('w-28 shrink-0 rounded-sm border px-1 py-0.5 text-[11px] outline-none', role === 'fixed' ? 'border-black/50 bg-[#1f1f1f] text-zinc-400' : 'border-[#4a90ff] bg-[#1f1f1f] text-white')}>
          <option value="fixed">Fixed</option>
          {choices.map(r => <option key={r} value={r}>{'Changes: ' + ROLE_LABELS[r]}</option>)}
        </select>
      )}
      {!bundle && <button type="button" aria-label="Delete layer" title="Delete (removes it from the template and the .ai file when you save)" className="text-zinc-500 hover:text-red-300" onClick={onDelete}>✕</button>}
    </RowShell>
  );
}

/** A layer of the template (an added text or picture, or a box that changes per employee). It can be dragged to restack it. */
function FieldRow({ field, active, off, drag, onEye, onPick, onDelete }: {
  field: TemplateField; active: boolean; off: boolean; drag: DragProps; onEye: () => void; onPick: () => void; onDelete: () => void;
}) {
  const label = field.role === 'static_image' ? 'Picture' : field.role === 'static_text' ? field.text || 'Text' : ROLE_LABELS[field.role] + (field.text ? ' — ' + field.text : '');
  return (
    <RowShell drag={drag} className={cx('flex cursor-grab items-center gap-1 pr-2 text-xs active:cursor-grabbing', active ? 'bg-[#4a90ff]/30 text-white' : 'text-zinc-300 hover:bg-white/5')}>
      <button type="button" aria-label={off ? 'Show layer' : 'Hide layer'} aria-pressed={!off} onClick={onEye} className="grid size-6 shrink-0 place-items-center text-zinc-400 hover:text-white">
        {off ? <span className="size-3" /> : eyeOn}
      </button>
      <button type="button" onClick={onPick} className={cx('flex min-w-0 flex-1 items-center gap-2 py-1 text-left', off && 'opacity-50')}>
        <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-sm bg-[#4a4a4a] text-[10px] font-bold text-zinc-200">
          {field.role === 'static_image' && field.image ? <ProtectedImage path={assetPath(SHARED, field.image)} alt="" className="max-h-full max-w-full object-contain" /> : IMAGE_ROLES.includes(field.role) ? '▨' : 'T'}
        </span>
        <span className="truncate">{label}</span>
        <span className="shrink-0 rounded-sm bg-[#4a90ff]/25 px-1 text-[9px] text-[#9cc2ff]">{isAdded(field) ? 'added' : field.role === 'other' ? 'design' : 'changes'}</span>
      </button>
      <span aria-hidden="true" title="Drag to change the stacking order" className="shrink-0 select-none text-zinc-600">⋮⋮</span>
      <button type="button" aria-label="Delete layer" title="Delete layer" className="text-zinc-500 hover:text-red-300" onClick={onDelete}>✕</button>
    </RowShell>
  );
}

export default function IllustratorWorkspace() {
  const router = useRouter();
  const { load } = useAdmin();
  const [handoff, setHandoff] = useState<WorkspaceHandoff | null | undefined>(undefined);
  const [doc, setDoc] = useState<Doc>({ front: [], back: [] });
  const [undo, setUndo] = useState<Doc[]>([]);
  const [redo, setRedo] = useState<Doc[]>([]);
  const [side, setSide] = useState<Side>('front');
  const [selected, setSelected] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [spaceDown, setSpaceDown] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<'layers' | 'edit' | 'preview' | 'original'>('layers');
  const [viewport, setViewport] = useState({ w: 800, h: 600 });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [layers, setLayers] = useState<Record<Side, ArtboardPieces | null>>({ front: null, back: null });
  const [layerError, setLayerError] = useState('');
  const [picked, setPicked] = useState<LayerPiece | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hiddenAdded, setHiddenAdded] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: number; autoBack: Record<string, unknown> | null } | null>(null);
  const [openError, setOpenError] = useState('');
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [over, setOver] = useState<{ key: string; edge: 'above' | 'below' } | null>(null);
  const asked = useRef<Record<Side, boolean>>({ front: false, back: false });
  const opened = useRef(false);
  const [retry, setRetry] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const pictureInput = useRef<HTMLInputElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  // Read what the upload page stored.
  useEffect(() => {
    const withIds = (list: TemplateField[]) => list.map(f => ({ ...f, uid: f.uid ?? newUid() }));
    // /workspace?edit=ID reopens a saved template; otherwise the upload page has stored a file to open.
    const editId = Number(new URLSearchParams(window.location.search).get('edit'));
    if (editId) {
      if (opened.current) return;
      opened.current = true;
      api<EditSession>('/admin/templates/' + editId + '/workspace', { method: 'POST' })
        .then(session => {
          setHandoff({ result: session.result, fileName: session.name });
          setDoc({ front: withIds(session.result.front.fields), back: withIds(session.result.back?.fields ?? []) });
          setName(session.name); setDescription(session.description);
          setEditing({ id: session.template_id, autoBack: session.auto_back });
        })
        .catch(e => { setOpenError((e as ApiError).message); setHandoff(null); });
      return;
    }
    let value: WorkspaceHandoff | null = null;
    try { value = JSON.parse(sessionStorage.getItem(WORKSPACE_KEY) || 'null'); } catch { value = null; }
    setHandoff(value);
    if (value) {
      setDoc({ front: withIds(value.result.front.fields), back: withIds(value.result.back?.fields ?? []) });
      setName(value.fileName.replace(/\.[^.]+$/, '').slice(0, 60));
    }
  }, []);

  const result = handoff?.result;
  const analysis: TemplateAnalysis | null | undefined = result ? (side === 'back' ? result.back : result.front) : null;
  const fields = doc[side];
  const aspect = analysis ? analysis.height / analysis.width : 4 / 7;
  const mmW = analysis ? (analysis.width_pt ? analysis.width_pt * 25.4 / 72 : analysis.width >= analysis.height ? 88.9 : 88.9 * analysis.width / analysis.height) : 88.9;
  const mmH = analysis?.height_pt ? analysis.height_pt * 25.4 / 72 : mmW * aspect;
  const boardW = mmW * MM_PX * zoom;
  const boardH = mmH * MM_PX * zoom;
  const origin = { x: viewport.w / 2 + pan.x - boardW / 2, y: viewport.h / 2 + pan.y - boardH / 2 };
  const handTool = tool === 'hand' || spaceDown;

  /* ---------- history ---------- */
  const checkpoint = useCallback(() => { setUndo(list => [...list.slice(-49), doc]); setRedo([]); }, [doc]);
  const edit = useCallback((next: Doc) => { checkpoint(); setDoc(next); }, [checkpoint]);
  const setFields = (list: TemplateField[]) => setDoc(current => ({ ...current, [side]: list }));
  const patch = (index: number, change: Partial<TemplateField>) => setDoc(current => ({ ...current, [side]: current[side].map((f, i) => (i === index ? { ...f, ...change } : f)) }));
  function undoStep() { setUndo(list => { const last = list[list.length - 1]; if (!last) return list; setRedo(r => [...r, doc]); setDoc(last); setSelected(null); return list.slice(0, -1); }); }
  function redoStep() { setRedo(list => { const last = list[list.length - 1]; if (!last) return list; setUndo(u => [...u, doc]); setDoc(last); setSelected(null); return list.slice(0, -1); }); }

  /* ---------- viewport, fit, zoom ---------- */
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewport({ w: element.clientWidth, h: element.clientHeight }));
    observer.observe(element);
    setViewport({ w: element.clientWidth, h: element.clientHeight });
    return () => observer.disconnect();
  }, [handoff]);

  const fit = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(clamp(Math.min((viewport.w - 120) / (mmW * MM_PX), (viewport.h - 120) / (mmH * MM_PX)), 0.1, 8));
  }, [viewport.w, viewport.h, mmW, mmH]);
  useEffect(() => { if (handoff) fit(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [handoff, side, viewport.w > 0]);

  function zoomAt(next: number, clientX?: number, clientY?: number) {
    const rect = stage.current?.getBoundingClientRect();
    const target = clamp(next, 0.1, 8);
    if (rect && clientX !== undefined && clientY !== undefined) {
      const px = clientX - rect.left - rect.width / 2, py = clientY - rect.top - rect.height / 2;
      setPan(p => ({ x: px - (px - p.x) * (target / zoom), y: py - (py - p.y) * (target / zoom) }));
    }
    setZoom(target);
  }

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.altKey || event.metaKey) zoomAt(zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), event.clientX, event.clientY);
      else setPan(p => ({ x: p.x - event.deltaX, y: p.y - event.deltaY }));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  });

  /* ---------- Illustrator's own layers ---------- */
  useEffect(() => {
    if (!result) return;
    (['front', 'back'] as const).forEach(which => {
      const artboard = which === 'back' ? result.back_artboard : result.front_artboard;
      if (artboard === null || !result.upload_id || asked.current[which]) return;
      asked.current[which] = true;
      api<ArtboardPieces>('/templates/illustrator/pieces', { method: 'POST', body: JSON.stringify({ upload_id: result.upload_id, artboard }) })
        .then(data => setLayers(current => ({ ...current, [which]: data })))
        .catch(e => { asked.current[which] = false; setLayerError((e as ApiError).message); setView(v => (v === 'layers' ? 'edit' : v)); });
    });
  }, [result, retry]);

  /* ---------- pointer gestures ---------- */
  function startField(event: ReactPointerEvent, index: number, handle: Handle) {
    if (handTool || view === 'preview' || view === 'original') return;
    event.preventDefault(); event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    checkpoint();
    gesture.current = { kind: 'field', index, handle, startX: event.clientX, startY: event.clientY, field: fields[index] };
    setSelected(index); setPicked(null);
  }
  function startStage(event: ReactPointerEvent) {
    if (handTool || event.button === 1) {
      event.preventDefault();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      gesture.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
    } else if (tool === 'zoom') {
      zoomAt(event.altKey ? zoom / 1.5 : zoom * 1.5, event.clientX, event.clientY);
    } else {
      setSelected(null); setPicked(null);
    }
  }
  function onMove(event: ReactPointerEvent) {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pan') { setPan({ x: g.panX + event.clientX - g.startX, y: g.panY + event.clientY - g.startY }); return; }
    const rect = board.current?.getBoundingClientRect();
    if (!rect) return;
    patch(g.index, resize(g.field, g.handle, (event.clientX - g.startX) / rect.width, (event.clientY - g.startY) / rect.height));
  }
  const endGesture = () => { gesture.current = null; };

  /* ---------- editing actions ---------- */
  function addField(role: TemplateFieldRole) {
    const image = IMAGE_ROLES.includes(role);
    const field: TemplateField = { role, x: 0.35, y: 0.4, w: image ? 0.18 : 0.35, h: image ? 0.3 : 0.08, size: 0.06, color: '#111111', align: 'left', bold: role === 'name', shape: role === 'photo' ? 'circle' : 'rect', lines: 1, text: image ? undefined : ROLE_LABELS[role], uid: newUid() };
    edit({ ...doc, [side]: [...fields, field] });
    setSelected(fields.length);
  }
  function remove(index: number) { edit({ ...doc, [side]: fields.filter((_, i) => i !== index) }); setSelected(null); }
  function duplicate(index: number) {
    const copy = { ...fields[index], uid: newUid(), x: clamp(fields[index].x + 0.02, 0, 1 - fields[index].w), y: clamp(fields[index].y + 0.02, 0, 1 - fields[index].h) };
    edit({ ...doc, [side]: [...fields, copy] }); setSelected(fields.length);
  }
  /** Put a layer in a new place in the stack: above or below a row of the Layers panel, or at the very top or bottom. */
  function placeField(moving: number, target: Row | 'top' | 'bottom', edge: 'above' | 'below') {
    const f = fields[moving];
    if (!f) return;
    if (!stackable) {
      // Without the file's objects the only order is among the layers themselves.
      if (target === 'top' || target === 'bottom') {
        const list = fields.filter((_, i) => i !== moving);
        if (target === 'top') list.push(f); else list.unshift(f);
        edit({ ...doc, [side]: list }); setSelected(list.indexOf(f));
      }
      return;
    }
    const list = fields.filter((_, i) => i !== moving);
    const groupAt = (z: number) => list.map((x, i) => ((x.z ?? pieces.length) === z ? i : -1)).filter(i => i >= 0);
    let z: number, pos: number;
    if (target === 'top') { z = pieces.length; pos = list.length; }
    else if (target === 'bottom') { z = 0; pos = 0; }
    else if (target.kind === 'piece') {
      const group = groupAt(edge === 'above' ? target.pc.index + 1 : target.pc.index);
      z = edge === 'above' ? target.pc.index + 1 : target.pc.index;
      pos = edge === 'above' ? (group.length ? group[0] : list.length) : (group.length ? group[group.length - 1] + 1 : list.length);
    } else {
      if (target.i === moving) return;
      const anchor = fields[target.i];
      z = anchor.z ?? pieces.length;
      pos = list.indexOf(anchor) + (edge === 'above' ? 1 : 0);
    }
    const moved: TemplateField = { ...f, z: z >= pieces.length ? undefined : z };
    list.splice(pos, 0, moved);
    edit({ ...doc, [side]: list });
    setSelected(list.indexOf(moved));
  }
  /** Move a layer one row (±1) or all the way (±Infinity) through the whole stack, the file's own layers included. */
  function arrange(index: number, by: number) {
    if (by === Infinity) { placeField(index, 'top', 'above'); return; }
    if (by === -Infinity) { placeField(index, 'bottom', 'below'); return; }
    if (!stackable) { reorder(index, by > 0 ? 1 : -1); return; }
    const at = rows.findIndex(r => r.kind === 'field' && r.i === index);
    if (at < 0) return;
    if (by > 0 && rows[at - 1]) placeField(index, rows[at - 1], 'above');
    if (by < 0 && rows[at + 1]) placeField(index, rows[at + 1], 'below');
  }
  function dropOn(row: Row, edge: 'above' | 'below') {
    const moving = fields.findIndex(f => f.uid === dragUid);
    setDragUid(null); setOver(null);
    if (moving >= 0) placeField(moving, row, edge);
  }
  function reorder(index: number, by: number) {
    const to = index + by;
    if (to < 0 || to >= fields.length) return;
    const list = [...fields];
    [list[index], list[to]] = [list[to], list[index]];
    edit({ ...doc, [side]: list }); setSelected(to);
  }

  function addText() {
    const field: TemplateField = { role: 'static_text', x: 0.2, y: 0.45, w: 0.6, h: 0.08, size: 0.06, color: '#111111', align: 'left', bold: false, shape: 'rect', lines: 1, text: 'Your text', uid: newUid() };
    edit({ ...doc, [side]: [...fields, field] });
    setSelected(fields.length); setPicked(null);
  }
  async function addPicture(file: File | undefined) {
    if (!file) return;
    setError('');
    try {
      const form = new FormData();
      form.append('image', file);
      const stored = await api<{ file: string; width: number; height: number }>('/templates/image/layer', { method: 'POST', body: form });
      // About a third of the card wide, in the picture's own shape.
      let w = 0.34, h = (w * mmW * stored.height) / (stored.width * mmH);
      if (h > 0.6) { h = 0.6; w = (h * mmH * stored.width) / (stored.height * mmW); }
      const field: TemplateField = { role: 'static_image', x: (1 - w) / 2, y: (1 - h) / 2, w, h, size: 0.05, color: '#111111', align: 'left', bold: false, shape: 'rect', lines: 1, image: stored.file, uid: newUid() };
      edit({ ...doc, [side]: [...fields, field] });
      setSelected(fields.length); setPicked(null);
    } catch (e) {
      setError((e as ApiError).message);
    }
  }

  const hasName = doc.front.some(f => f.role === 'name');
  /** The artwork exactly as the file draws it, minus what changes per employee, split where layers sit between objects. */
  /** Layers of the file that were hidden or deleted: they are taken out of the saved artwork and out of the saved .ai. */
  const removedOf = (which: Side) => [...new Set([...hidden, ...deleted])].filter(k => k.startsWith(which + ':')).map(k => Number(k.slice(which.length + 1))).filter(n => Number.isInteger(n));
  async function composeSide(which: Side): Promise<ComposeResult | null> {
    const data = layers[which];
    const artboard = which === 'back' ? result?.back_artboard : result?.front_artboard;
    if (!result || !result.upload_id || !data || artboard == null || !data.pieces.length || data.truncated || data.pieces.some((p, k) => p.index !== k)) return null;
    const list = doc[which];
    const cuts = [...new Set(list.map(f => f.z).filter((z): z is number => typeof z === 'number' && z < data.pieces.length))];
    const ref = which === 'back' && result.back ? result.back : result.front;
    return api<ComposeResult>('/templates/illustrator/compose', {
      method: 'POST',
      body: JSON.stringify({ upload_id: result.upload_id, artboard, hide: [...new Set([...replacedPieces(list, data.pieces), ...removedOf(which)])], cuts, long_side: clamp(Math.max(ref.width, ref.height), 400, 3000) }),
    });
  }
  async function save() {
    if (!result || !hasName || !name.trim()) return;
    setBusy(true); setError('');
    try {
      const front = result.front, back = result.back;
      const [frontArt, backArt] = await Promise.all([composeSide('front'), back ? composeSide('back') : Promise.resolve(null)]);
      if (editing) {
        await api<Template>('/templates/image/' + editing.id, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(), description: description.trim(), fields: doc.front,
            ...(frontArt ? { background: frontArt.background, width: frontArt.width, height: frontArt.height } : {}),
            overlays: frontArt?.overlays ?? front.overlays ?? [],
            back: back
              ? { style: 'image', source: back.source, background: backArt?.background ?? back.background, width: backArt?.width ?? back.width, height: backArt?.height ?? back.height, fields: doc.back, overlays: backArt?.overlays ?? back.overlays ?? [] }
              : editing.autoBack ?? undefined,
            ...(result.upload_id && (removedOf('front').length || removedOf('back').length) ? { ai_edit: { upload_id: result.upload_id, remove_front: removedOf('front'), remove_back: removedOf('back') } } : {}),
          }),
        });
        endSession(result.upload_id);
        await load();
        router.push('/dashboard/templates');
        return;
      }
      const template = await api<Template>('/templates/image', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(), description: description.trim(),
          source: front.source, background: frontArt?.background ?? front.background, width: frontArt?.width ?? front.width, height: frontArt?.height ?? front.height,
          fields: doc.front, overlays: frontArt?.overlays ?? [],
          back: back ? { style: 'image', source: back.source, background: backArt?.background ?? back.background, width: backArt?.width ?? back.width, height: backArt?.height ?? back.height, fields: doc.back, overlays: backArt?.overlays ?? [] } : null,
          ...(front.width_pt && front.height_pt ? { width_pt: front.width_pt, height_pt: front.height_pt } : {}),
          ai: { upload_id: result.upload_id, front: result.front_artboard, back: result.back_artboard, remove_front: removedOf('front'), remove_back: removedOf('back') },
        }),
      });
      sessionStorage.removeItem(WORKSPACE_KEY);
      endSession(result.upload_id);
      await load();
      router.push(`/dashboard/templates?saved=${template.id}`);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- keyboard ---------- */
  const keys = useRef({ save, undoStep, redoStep, duplicate, remove, fit, arrange });
  keys.current = { save, undoStep, redoStep, duplicate, remove, fit, arrange };
  useEffect(() => {
    const typing = (target: EventTarget | null) => target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
    const down = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (event.code === 'Space') { event.preventDefault(); setSpaceDown(true); return; }
      if (mod && key === 'z') { event.preventDefault(); event.shiftKey ? keys.current.redoStep() : keys.current.undoStep(); return; }
      if (mod && key === 'y') { event.preventDefault(); keys.current.redoStep(); return; }
      if (mod && key === 's') { event.preventDefault(); void keys.current.save(); return; }
      if (mod && key === '0') { event.preventDefault(); keys.current.fit(); return; }
      if (mod && (key === ']' || key === '[') && selectedRef.current !== null) { event.preventDefault(); keys.current.arrange(selectedRef.current, (key === ']' ? 1 : -1) * (event.shiftKey ? Infinity : 1)); return; }
      if (mod && key === 'd' && selectedRef.current !== null) { event.preventDefault(); keys.current.duplicate(selectedRef.current); return; }
      if (mod) return;
      if (key === 'v') setTool('select'); else if (key === 'h') setTool('hand'); else if (key === 'z') setTool('zoom');
      else if (key === 'delete' || key === 'backspace') { if (selectedRef.current !== null) { event.preventDefault(); keys.current.remove(selectedRef.current); } }
      else if (key.startsWith('arrow') && selectedRef.current !== null) {
        event.preventDefault();
        const step = event.shiftKey ? 0.05 : 0.005;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0, dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        const index = selectedRef.current;
        setDoc(current => ({ ...current, [sideRef.current]: current[sideRef.current].map((f, i) => (i === index ? { ...f, ...resize(f, 'move', dx, dy) } : f)) }));
      }
    };
    const up = (event: KeyboardEvent) => { if (event.code === 'Space') setSpaceDown(false); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
  const selectedRef = useRef<number | null>(null); selectedRef.current = selected;
  const sideRef = useRef<Side>('front'); sideRef.current = side;

  const current = selected !== null ? fields[selected] : null;
  const isStatic = current ? current.role.startsWith('static_') : false;
  const isText = current ? (!IMAGE_ROLES.includes(current.role) && current.role !== 'other' && current.role !== 'static_image') : false;
  const pxPerMm = MM_PX * zoom;
  const cursor = handTool ? 'cursor-grab' : tool === 'zoom' ? 'cursor-zoom-in' : 'cursor-default';
  const pieces = useMemo(() => layers[side]?.pieces ?? [], [layers, side]);
  const matches = useMemo(() => matchFields(fields, pieces), [fields, pieces]);
  // The file's objects are numbered bottom to top; a layer's z says how many of them lie beneath it.
  const stackable = pieces.length > 0 && !layers[side]?.truncated && pieces.every((p, k) => p.index === k);
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    if (!stackable) {
      for (let i = fields.length - 1; i >= 0; i--) out.push({ kind: 'field', i });
      for (let k = pieces.length - 1; k >= 0; k--) out.push({ kind: 'piece', pc: pieces[k] });
      return out;
    }
    const n = pieces.length;
    for (let slot = n; slot >= 0; slot--) {
      for (let i = fields.length - 1; i >= 0; i--) if ((fields[i].z ?? n) === slot) out.push({ kind: 'field', i });
      if (slot > 0) out.push({ kind: 'piece', pc: pieces[slot - 1] });
    }
    return out;
  }, [fields, pieces, stackable]);
  const replaced = useMemo(() => replacedPieces(fields, pieces), [fields, pieces]);
  const ptH = mmH * 72 / 25.4;
  function rowDrag(row: Row, key: string, moving: boolean): DragProps {
    return {
      draggable: moving, accepts: dragUid !== null && (stackable || row.kind === 'field') && !(row.kind === 'field' && fields[row.i]?.uid === dragUid),
      edge: over?.key === key ? over.edge : null,
      onDragStart: () => { if (row.kind === 'field') setDragUid(fields[row.i].uid ?? null); },
      onDragEnd: () => { setDragUid(null); setOver(null); },
      onOver: edge => setOver(o => (o && o.key === key && o.edge === edge ? o : { key, edge })),
      onDrop: () => dropOn(row, over?.key === key ? over.edge : 'above'),
    };
  }
  function setItemRole(node: LayerPiece, role: TemplateFieldRole | 'fixed') {
    const index = matches.get(node.index);
    if (role === 'fixed') { if (index !== undefined) remove(index); return; }
    if (index !== undefined) { checkpoint(); patch(index, { role, shape: role === 'photo' ? 'circle' : 'rect' }); setSelected(index); return; }
    const image = IMAGE_ROLES.includes(role);
    const box = { x: clamp(node.x ?? 0, 0, 0.98), y: clamp(node.y ?? 0, 0, 0.98), w: clamp(node.w ?? 0.2, MIN, 1), h: clamp(node.h ?? 0.08, MIN, 1) };
    const field: TemplateField = { role, ...box, size: clamp((node.size_pt || 10) / ptH, 0.01, 0.4), color: node.color || '#111111', align: 'left', bold: Boolean(node.bold), shape: role === 'photo' ? 'circle' : 'rect', lines: 1, text: image ? undefined : node.text ?? undefined, uid: newUid() };
    edit({ ...doc, [side]: [...fields, field] });
    setSelected(fields.length);
  }

  if (handoff === undefined) return null;
  if (!handoff || !result) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-[#323232] p-6 text-center text-zinc-200">
        <div>
          <p className="text-lg font-semibold">{openError ? 'This template cannot be opened' : 'No Illustrator file is open'}</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-400">{openError || 'Upload an .ai file first; its artboards open here.'}</p>
          <Link href={openError ? '/dashboard/templates' : '/dashboard/templates/upload'} className="mt-4 inline-block rounded-sm bg-[#4a90ff] px-4 py-2 text-sm font-semibold text-white">{openError ? 'Back to templates' : 'Go to upload'}</Link>
        </div>
      </div>
    );
  }

  const designFile = view === 'original' ? analysis?.source : analysis?.background;
  const layerContent = (f: TemplateField, i: number): ReactNode => {
    if (f.uid && hiddenAdded.has(f.uid)) return null;
    const wrap = (child: ReactNode) => <div key={'c' + (f.uid ?? i)} className="pointer-events-none absolute inset-0">{child}</div>;
    if (view === 'preview') return wrap(<SideFields fields={[f]} values={SAMPLE} aspect={aspect} owner={0} />);
    if (f.role === 'static_text') return f.text ? wrap(<FieldText field={f} text={f.text} aspect={aspect} />) : null;
    if (f.role === 'static_image') return wrap(<FieldPicture field={f} owner={0} />);
    if (view === 'edit' && TEXT_ROLES.includes(f.role) && f.text) return wrap(<FieldText field={f} text={f.text} aspect={aspect} />);
    return null;
  };
  const highlight = picked && picked.w > 0 ? picked : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#323232] text-zinc-200 select-none" onPointerMove={onMove} onPointerUp={endGesture} onPointerCancel={endGesture}>
      {/* Application bar */}
      <header className="flex h-10 shrink-0 items-center gap-1 border-b border-black bg-[#2b2b2b] px-2 text-xs">
        <Link href={editing ? '/dashboard/templates' : '/dashboard/templates/upload'} className="rounded-sm px-2 py-1 text-zinc-300 hover:bg-white/10" onClick={() => { sessionStorage.removeItem(WORKSPACE_KEY); endSession(result.upload_id, editing ? [] : [result.front.source, result.front.background, result.back?.source, result.back?.background]); }}>← Exit</Link>
        <span className="mx-1 rounded-sm bg-[#ff9a00] px-1.5 py-0.5 text-[11px] font-bold text-black">Ai</span>
        <span className="mr-3 font-medium text-zinc-300">{editing ? 'Editing ' + name : 'Template workspace'}</span>
        <button type="button" onClick={undoStep} disabled={!undo.length} className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-40" title="Undo (Ctrl+Z)">Undo</button>
        <button type="button" onClick={redoStep} disabled={!redo.length} className="rounded-sm px-2 py-1 hover:bg-white/10 disabled:opacity-40" title="Redo (Ctrl+Shift+Z)">Redo</button>
        <span className="mx-2 h-4 w-px bg-white/15" />
        {([['layers', 'Layers'], ['edit', 'Design'], ['preview', 'Fill sample'], ['original', 'Original']] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setView(id)} className={cx('rounded-sm px-2 py-1', view === id ? 'bg-white/15 text-white' : 'hover:bg-white/10')} title={id === 'layers' ? 'Every layer of your file, drawn as Illustrator draws it' : id === 'edit' ? 'The template as it will print, with changeable text drawn in' : id === 'preview' ? 'See sample employee details' : 'The uploaded artwork with its text'}>{label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {error && <span role="alert" className="max-w-md truncate text-red-300" title={error}>{error}</span>}
          <button type="button" onClick={save} disabled={busy || !hasName || !name.trim()} className="rounded-sm bg-[#4a90ff] px-3 py-1 font-semibold text-white disabled:opacity-40" title="Save template (Ctrl+S)">{busy ? 'Saving…' : editing ? 'Save changes' : 'Save template'}</button>
        </div>
      </header>

      {/* Document tabs, like Illustrator's artboard tabs */}
      <div className="flex h-8 shrink-0 items-end gap-px border-b border-black bg-[#2b2b2b] px-2 text-xs">
        {(['front', 'back'] as const).filter(s => s === 'front' || result.back).map(s => (
          <button key={s} type="button" onClick={() => { setSide(s); setSelected(null); setPicked(null); }}
            className={cx('rounded-t-sm px-4 py-1.5', side === s ? 'bg-[#535353] text-white' : 'bg-[#3a3a3a] text-zinc-400 hover:text-zinc-200')}>
            {handoff.fileName} <span className="text-zinc-400">· {s === 'front' ? 'Front' : 'Back'} @ {Math.round(zoom * 100)}% (RGB/Preview)</span>
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Toolbar */}
        <nav aria-label="Tools" className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-black bg-[#2b2b2b] py-2">
          <ToolButton label="Selection tool" shortcut="V" active={tool === 'select' && !spaceDown} onClick={() => setTool('select')}>
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true"><path d="M5 3l14 8-6 1.5L10 19 5 3z" /></svg>
          </ToolButton>
          <ToolButton label="Hand tool" shortcut="H" active={handTool} onClick={() => setTool('hand')}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 13V5a1.5 1.5 0 0 1 3 0v6m0-1V4a1.5 1.5 0 0 1 3 0v7m0-5a1.5 1.5 0 0 1 3 0v8c0 4-2.5 6-6 6-3 0-4.5-1.5-6-4l-1.5-3a1.5 1.5 0 0 1 2.5-1.5L8 14" /></svg>
          </ToolButton>
          <ToolButton label="Zoom tool" shortcut="Z" active={tool === 'zoom' && !spaceDown} onClick={() => setTool('zoom')}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 6 6" /></svg>
          </ToolButton>
          <span className="my-1 h-px w-6 bg-white/15" />
          <ToolButton label="Add text layer" shortcut="Type" onClick={addText}>
            <span className="text-sm font-bold" aria-hidden="true">T</span>
          </ToolButton>
          <ToolButton label="Add picture layer" shortcut="Place" onClick={() => pictureInput.current?.click()}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
          </ToolButton>
          <input ref={pictureInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => { void addPicture(e.target.files?.[0]); e.target.value = ''; }} />
          <span className="my-1 h-px w-6 bg-white/15" />
          <ToolButton label="Fit artboard in window" shortcut="Ctrl+0" onClick={fit}>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </ToolButton>
        </nav>

        {/* Canvas */}
        <div className="relative min-w-0 flex-1 overflow-hidden bg-[#535353]">
          <div className="pointer-events-none absolute top-0 left-0 z-30 size-5 bg-[#2b2b2b]" />
          <Ruler origin={origin.x} pxPerMm={pxPerMm} length={viewport.w} mm={mmW} />
          <Ruler vertical origin={origin.y} pxPerMm={pxPerMm} length={viewport.h} mm={mmH} />
          <div ref={stage} className={cx('absolute inset-0 touch-none', cursor)} onPointerDown={startStage}>
            <div ref={board} className="absolute bg-white shadow-[0_0_0_1px_#000,0_6px_24px_rgba(0,0,0,.5)] [container-type:inline-size]"
              style={{ width: boardW, height: boardH, left: origin.x, top: origin.y }}>
              {analysis && designFile && (!stackable || view === 'original') && <ProtectedImage path={assetPath(SHARED, designFile)} alt="Artboard" className="pointer-events-none absolute inset-0 size-full object-fill" />}
              {view !== 'original' && stackable ? (
                <>
                  {Array.from({ length: pieces.length + 1 }, (_, slot) => (
                    <Fragment key={slot}>
                      {fields.map((f, i) => ((f.z ?? pieces.length) === slot ? layerContent(f, i) : null))}
                      {slot < pieces.length && (() => {
                        const pc = pieces[slot];
                        if (hidden.has(side + ':' + pc.index) || deleted.has(side + ':' + pc.index) || (view !== 'layers' && replaced.has(pc.index))) return null;
                        const box = { left: pc.x * 100 + '%', top: pc.y * 100 + '%', width: pc.w * 100 + '%', height: pc.h * 100 + '%' };
                        if (pc.format === 'text') {
                          // Real text, in the size, colour and font the file gives it.
                          return <div key={'p' + pc.index} className="pointer-events-none absolute flex items-center whitespace-nowrap leading-none" style={{ ...box, width: undefined, color: pc.color || '#000', fontSize: ((pc.size_pt || 10) / (mmW * 72 / 25.4)) * 100 + 'cqw', ...fontStyle(pc.font, pc.bold) }}>{pc.text}</div>;
                        }
                        if (!pc.file || !result?.upload_id) return null;
                        return <ProtectedImage key={'p' + pc.index} path={projectFile(result.upload_id, pc.file)} alt="" className="pointer-events-none absolute object-fill" style={box} />;
                      })()}
                    </Fragment>
                  ))}
                </>
              ) : view !== 'original' ? fields.map((f, i) => layerContent(f, i)) : null}
              {(view === 'edit' || view === 'layers') && fields.map((f, i) => {
                const on = selected === i;
                return (
                  <div key={i} role="button" tabIndex={-1} aria-label={`${ROLE_LABELS[f.role]} field`}
                    onPointerDown={e => startField(e, i, 'move')}
                    className={cx('absolute', handTool ? 'pointer-events-none' : 'cursor-move', f.role === 'photo' && f.shape === 'circle' ? 'rounded-full' : '',
                      on ? 'outline outline-1 outline-[#4a90ff]' : 'outline outline-1 outline-dashed outline-[#4a90ff]/50 hover:outline-[#4a90ff]')}
                    style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}>
                    {on && HANDLES.map(h => (
                      <span key={h.id} onPointerDown={e => startField(e, i, h.id)} aria-hidden="true"
                        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-[#4a90ff] bg-white"
                        style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, cursor: h.cursor }} />
                    ))}
                  </div>
                );
              })}
              {highlight && <div className="pointer-events-none absolute outline outline-2 outline-[#ff2d95]" style={{ left: `${highlight.x * 100}%`, top: `${highlight.y * 100}%`, width: `${highlight.w * 100}%`, height: `${highlight.h * 100}%` }} />}
            </div>
          </div>
          {/* Status bar */}
          <div className="pointer-events-none absolute right-0 bottom-0 left-5 z-20 flex h-6 items-center gap-4 bg-[#2b2b2b]/95 px-3 text-[11px] text-zinc-400">
            <span>{Math.round(mmW * 10) / 10} × {Math.round(mmH * 10) / 10} mm</span>
            <span>{tool === 'select' ? 'Selection' : tool === 'hand' ? 'Hand' : 'Zoom'}</span>
            <span className="ml-auto flex items-center gap-1 [&>button]:pointer-events-auto">
              <button type="button" onClick={() => zoomAt(zoom / 1.25, viewport.w / 2 + (stage.current?.getBoundingClientRect().left ?? 0), viewport.h / 2 + (stage.current?.getBoundingClientRect().top ?? 0))} className="px-1.5 hover:text-white" aria-label="Zoom out">−</button>
              <span className="w-10 text-center text-zinc-200 tabular-nums">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => zoomAt(zoom * 1.25, viewport.w / 2 + (stage.current?.getBoundingClientRect().left ?? 0), viewport.h / 2 + (stage.current?.getBoundingClientRect().top ?? 0))} className="px-1.5 hover:text-white" aria-label="Zoom in">+</button>
            </span>
          </div>
        </div>

        {/* Panels */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-black bg-[#2f2f2f]" aria-label="Panels">
          <Panel title="Selected item">
            {current ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-zinc-200">{ROLE_LABELS[current.role]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={current.x * mmW} onFocus={checkpoint} onChange={v => patch(selected!, { x: clamp(v / mmW, 0, 1 - current.w) })} />
                  <NumberField label="Y" value={current.y * mmH} onFocus={checkpoint} onChange={v => patch(selected!, { y: clamp(v / mmH, 0, 1 - current.h) })} />
                  <NumberField label="W" value={current.w * mmW} onFocus={checkpoint} onChange={v => patch(selected!, { w: clamp(v / mmW, MIN, 1 - current.x) })} />
                  <NumberField label="H" value={current.h * mmH} onFocus={checkpoint} onChange={v => patch(selected!, { h: clamp(v / mmH, MIN, 1 - current.y) })} />
                </div>
                {!isStatic && <label className="block text-[11px] text-zinc-400">Field is
                  <select className={cx(numberClass, 'mt-1')} value={current.role} onFocus={checkpoint}
                    onChange={e => { const role = e.target.value as TemplateFieldRole; patch(selected!, { role, shape: role === 'photo' ? 'circle' : 'rect' }); }}>
                    {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </label>}
                {isText && (
                  <>
                    <label className="block text-[11px] text-zinc-400">{current?.role === 'static_text' ? 'Text' : 'Sample text'}
                      <input className={cx(numberClass, 'mt-1')} value={current.text ?? ''} onFocus={checkpoint} onChange={e => patch(selected!, { text: e.target.value })} />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField label="Aa" step={0.5} value={current.size * 100} onFocus={checkpoint} onChange={v => patch(selected!, { size: clamp(v / 100, 0.01, 0.4) })} />
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <input type="color" className="h-6 w-8 cursor-pointer border border-black/50 bg-transparent p-0" value={/^#[0-9a-f]{6}$/i.test(current.color) ? current.color : '#111111'} onFocus={checkpoint} onChange={e => patch(selected!, { color: e.target.value })} />
                        <span className="tabular-nums">{current.color}</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      {(['left', 'center', 'right'] as const).map(a => (
                        <button key={a} type="button" onClick={() => { checkpoint(); patch(selected!, { align: a }); }} aria-pressed={current.align === a}
                          className={cx('flex-1 rounded-sm border border-black/50 py-1 text-[11px] capitalize', current.align === a ? 'bg-[#4a90ff] text-white' : 'bg-[#1f1f1f] text-zinc-300 hover:bg-[#262626]')}>{a}</button>
                      ))}
                      <button type="button" onClick={() => { checkpoint(); patch(selected!, { bold: !current.bold }); }} aria-pressed={current.bold}
                        className={cx('w-9 rounded-sm border border-black/50 py-1 text-[11px] font-bold', current.bold ? 'bg-[#4a90ff] text-white' : 'bg-[#1f1f1f] text-zinc-300 hover:bg-[#262626]')}>B</button>
                    </div>
                  </>
                )}
                {current.role === 'photo' && (
                  <div className="flex gap-1">
                    {(['rect', 'circle'] as const).map(s => (
                      <button key={s} type="button" onClick={() => { checkpoint(); patch(selected!, { shape: s }); }} aria-pressed={current.shape === s}
                        className={cx('flex-1 rounded-sm border border-black/50 py-1 text-[11px] capitalize', current.shape === s ? 'bg-[#4a90ff] text-white' : 'bg-[#1f1f1f] text-zinc-300')}>{s === 'rect' ? 'Square' : 'Circle'}</button>
                    ))}
                  </div>
                )}
                {(
                  <div className="grid grid-cols-4 gap-1" role="group" aria-label="Stacking order">
                    {([['To front', 'Bring to front (Ctrl+Shift+])', Infinity], ['Forward', 'Bring forward (Ctrl+])', 1], ['Backward', 'Send backward (Ctrl+[)', -1], ['To back', 'Send to back (Ctrl+Shift+[)', -Infinity]] as const).map(([label, title, by]) => (
                      <button key={label} type="button" title={title} onClick={() => arrange(selected!, by)} className="rounded-sm border border-black/50 bg-[#1f1f1f] py-1 text-[10px] hover:bg-[#262626]">{label}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <button type="button" onClick={() => duplicate(selected!)} className="flex-1 rounded-sm border border-black/50 bg-[#1f1f1f] py-1 text-[11px] hover:bg-[#262626]">Duplicate</button>
                  <button type="button" onClick={() => remove(selected!)} className="flex-1 rounded-sm border border-black/50 bg-[#1f1f1f] py-1 text-[11px] text-red-300 hover:bg-[#262626]">Delete</button>
                </div>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-zinc-500">Select a box on the artboard to edit it. Arrows nudge, Shift+arrows nudge more, Delete removes, Ctrl+D duplicates, Space pans.</p>
            )}
          </Panel>

          <Panel title={'Layers' + (pieces.length ? ' (' + pieces.length + ')' : '')}>
            <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">Every object of your file and every layer of your template, top to bottom, as in Illustrator. Drag a layer (⋮⋮) up or down to put it in front of or behind other layers. Hidden or deleted layers of your file are taken out of the template and out of the .ai file when you save. Set a text or picture to "Changes" to make it per-employee.</p>
            {layerError && (
              <div className="mb-2 space-y-1.5">
                <p className="text-xs text-red-300">The layers could not be drawn: {layerError}</p>
                <button type="button" onClick={() => { setLayerError(''); setView('layers'); setRetry(n => n + 1); }} className="rounded-sm border border-black/50 bg-[#1f1f1f] px-2 py-1 text-[11px] hover:bg-[#262626]">Try again</button>
              </div>
            )}
            {!layerError && !layers[side] && result?.upload_id && <p className="text-xs text-zinc-500">Drawing the layers of your file…</p>}
            {result && !result.upload_id && <p className="text-xs text-zinc-500">This template has no Illustrator file, so only its changeable boxes and added layers can be edited.</p>}
            {layers[side]?.truncated && <p className="mb-2 text-[11px] text-amber-300">This file has very many objects; the last ones are shown together as one layer.</p>}
            <ul className="-mx-3 max-h-96 overflow-y-auto">
              {rows.map(row => {
                if (row.kind === 'field') {
                  const f = fields[row.i];
                  const key = 'f' + (f.uid ?? row.i);
                  return <FieldRow key={key} field={f} active={selected === row.i} off={Boolean(f.uid && hiddenAdded.has(f.uid))} drag={rowDrag(row, key, true)}
                    onEye={() => { const id = f.uid; if (id) setHiddenAdded(h => { const next = new Set(h); if (!next.delete(id)) next.add(id); return next; }); }}
                    onPick={() => { setSelected(row.i); setPicked(null); }} onDelete={() => remove(row.i)} />;
                }
                const pc = row.pc;
                if (deleted.has(side + ':' + pc.index)) return null;
                const index = matches.get(pc.index);
                const key = 'p' + pc.index;
                return <PieceRow key={key} piece={pc} uploadId={result?.upload_id ?? ''} hidden={hidden.has(side + ':' + pc.index)} role={index === undefined || fields[index].role === 'other' ? 'fixed' : fields[index].role} drag={rowDrag(row, key, false)}
                  active={(index !== undefined && selected === index) || picked?.index === pc.index}
                  onEye={() => setHidden(h => { const next = new Set(h); const k = side + ':' + pc.index; if (!next.delete(k)) next.add(k); return next; })}
                  onDelete={() => { setDeleted(d => new Set(d).add(side + ':' + pc.index)); setPicked(null); }}
                  onPick={() => { setPicked(pc); setSelected(index ?? null); }} onRole={role => setItemRole(pc, role)} />;
              })}
            </ul>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/40 pt-3">
              <span className="text-[11px] text-zinc-400">Add a changeable box:</span>
              <select aria-label="Add a changeable box" className="rounded-sm border border-black/50 bg-[#1f1f1f] px-1 py-0.5 text-[11px] text-zinc-200" value="" onChange={e => { if (e.target.value) addField(e.target.value as TemplateFieldRole); }}>
                <option value="">+ Add</option>
                {[...TEXT_ROLES, ...IMAGE_CHOICES].map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </Panel>

          <Panel title={editing ? 'Save changes' : 'Save as template'}>
            <div className="space-y-2">
              <label className="block text-[11px] text-zinc-400">Name
                <input className={cx(numberClass, 'mt-1')} value={name} maxLength={60} onChange={e => setName(e.target.value)} />
              </label>
              <label className="block text-[11px] text-zinc-400">Description
                <input className={cx(numberClass, 'mt-1')} value={description} maxLength={255} onChange={e => setDescription(e.target.value)} />
              </label>
              {!hasName && <p className="text-[11px] text-amber-300">Add a Name field on the front before saving.</p>}
              {(analysis?.warnings ?? []).map(w => <p key={w} className="text-[11px] text-amber-300">{w}</p>)}
              <button type="button" onClick={save} disabled={busy || !hasName || !name.trim()} className="w-full rounded-sm bg-[#4a90ff] py-1.5 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Saving…' : editing ? 'Save changes' : 'Save shared template'}</button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
