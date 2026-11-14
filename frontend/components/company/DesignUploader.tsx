'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import ProtectedImage from '@/components/ui/ProtectedImage';
import { AutoBackFace, FieldText, SideFields, assetPath } from '@/components/cards/ImageTemplateCard';
import type { CardValues } from '@/components/cards/ImageTemplateCard';
import { SectionCard } from '@/components/dashboard/Surface';
import { Button, cx, inputClass } from '@/components/ui';
import { api } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type { AutoBack, CompanySummary, Employee, IllustratorAnalysis, Template, TemplateAnalysis, TemplateField, TemplateFieldRole } from '@/lib/types';
import Accordion from '@/components/ui/Accordion';
import IllustratorUpload from '@/components/company/IllustratorUpload';

const ROLE_LABELS: Record<TemplateFieldRole, string> = {
  name: 'Name', title: 'Job title', department: 'Department', phone: 'Phone', email: 'Email',
  website: 'Website', address: 'Address', company: 'Company name', logo: 'Company logo', photo: 'Photo', qr: 'QR code', other: 'Keep as design',
};
const ROLE_ORDER: TemplateFieldRole[] = ['name', 'title', 'department', 'phone', 'email', 'website', 'address', 'company', 'logo', 'photo', 'qr', 'other'];
const IMAGE_ROLES: TemplateFieldRole[] = ['photo', 'logo', 'qr'];
const MAX_BYTES = 10_000_000;

type Side = 'front' | 'back';
type BackMode = 'none' | 'auto' | 'upload';
type Drag = { index: number; mode: 'move' | 'resize'; startX: number; startY: number; field: TemplateField };

const BACK_OPTIONS: { mode: BackMode; title: string; text: string }[] = [
  { mode: 'none', title: 'Front only', text: 'Cards are printed on one side.' },
  { mode: 'auto', title: 'Simple back', text: 'Your logo, company name, website and QR code on a colour you pick. Nothing to upload.' },
  { mode: 'upload', title: 'Upload the back', text: 'Machine learning reads the back design the same way as the front.' },
];

function boxTone(role: TemplateFieldRole, selected: boolean) {
  if (selected) return 'border-brand-600 bg-brand-600/10';
  if (role === 'photo' || role === 'logo') return 'border-emerald-500 bg-emerald-500/10';
  if (role === 'qr') return 'border-amber-500 bg-amber-500/10';
  if (role === 'other') return 'border-dashed border-slate-400 bg-transparent';
  return 'border-sky-500 bg-sky-500/10';
}

function labelTone(role: TemplateFieldRole, selected: boolean) {
  if (selected) return 'bg-brand-600';
  if (role === 'photo' || role === 'logo') return 'bg-emerald-600';
  if (role === 'qr') return 'bg-amber-600';
  if (role === 'other') return 'bg-slate-500';
  return 'bg-sky-600';
}

function StepTitle({ number, title, hint }: { number: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white tabular-nums">{number}</span>
      <div>
        <p className="text-[15px] font-semibold tracking-tight text-navy-900">{title}</p>
        {hint && <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

function DropZone({ file, label, onFile }: { file: File | null; label: string; onFile: (file: File | null, error?: string) => void }) {
  return (
    <label className={cx('group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors', file ? 'border-brand-300 bg-brand-50/50' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50')}>
      <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
        const chosen = e.target.files?.[0] || null;
        if (chosen && chosen.size > MAX_BYTES) { onFile(null, 'That file is larger than 10 MB. Export it smaller and try again.'); return; }
        onFile(chosen);
      }} />
      <span className={cx('grid size-11 place-items-center rounded-full transition-colors', file ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-600 group-hover:bg-brand-100')}>
        {file
          ? <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
          : <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>}
      </span>
      <span className="mt-3 max-w-full truncate text-sm font-semibold text-navy-900">{file ? file.name : label}</span>
      <span className="mt-1 text-xs text-slate-500">{file ? 'Click to choose a different file' : 'PNG, JPG or WebP, up to 10 MB, at least 1050 × 600 px'}</span>
    </label>
  );
}

function BackChooser({ mode, onMode, file, onFile }: { mode: BackMode; onMode: (mode: BackMode) => void; file: File | null; onFile: (file: File | null, error?: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Back of the card">
        {BACK_OPTIONS.map((option) => {
          const active = mode === option.mode;
          return (
            <button key={option.mode} type="button" role="radio" aria-checked={active} onClick={() => onMode(option.mode)}
              className={cx('rounded-xl border px-4 py-3 text-left transition-colors', active ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 bg-white hover:border-slate-300')}>
              <span className="flex items-center gap-2">
                <span className={cx('grid size-4 place-items-center rounded-full border', active ? 'border-brand-600' : 'border-slate-300')}>
                  {active && <span className="size-2 rounded-full bg-brand-600" />}
                </span>
                <span className={cx('text-sm font-semibold', active ? 'text-brand-700' : 'text-navy-900')}>{option.title}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">{option.text}</span>
            </button>
          );
        })}
      </div>
      {mode === 'upload' && <DropZone file={file} label="Choose the back design" onFile={onFile} />}
    </div>
  );
}

function DesignUploaderForm({ company, employees, onSaved, incoming, onIncomingUsed }: { company: CompanySummary; employees: Employee[]; onSaved: (template: Template) => void; incoming?: { result: IllustratorAnalysis; fileName: string } | null; onIncomingUsed?: () => void }) {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [blankFile, setBlankFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [backMode, setBackMode] = useState<BackMode>('none');
  const [autoBack, setAutoBack] = useState<AutoBack>({ style: 'auto', color: '#101845', text_color: '#FFFFFF', show_qr: true });
  const [front, setFront] = useState<TemplateAnalysis | null>(null);
  const [back, setBack] = useState<TemplateAnalysis | null>(null);
  const [frontFields, setFrontFields] = useState<TemplateField[]>([]);
  const [backFields, setBackFields] = useState<TemplateField[]>([]);
  const [side, setSide] = useState<Side>('front');
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [showOriginal, setShowOriginal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sampleId, setSampleId] = useState<string>('');
  const [busy, setBusy] = useState<'analyze' | 'back' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  // Set when the design came from an Illustrator file, so the template keeps it and cards can be made as .ai too.
  const [aiSource, setAiSource] = useState<{ upload_id: string; front: number; back: number | null } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const sample = employees.find((e) => String(e.id) === sampleId);
  const values: CardValues = useMemo(() => ({
    name: sample?.name || 'Farhana Akter',
    title: sample?.designation || 'Head of Finance',
    department: sample?.department || 'Finance',
    phone: sample?.phone || '+880 1711 204 518',
    email: sample?.email || 'farhana@company.com',
    website: company.website || 'www.company.com',
    address: (company as { address?: string | null }).address || 'Gulshan 2, Dhaka 1212',
    company: company.name,
    photoPath: sample?.has_photo ? `/employees/${sample.id}/photo` : null,
    logoPath: company.has_logo ? '/company/logo' : null,
  }), [sample, company]);

  // The editor works on one side at a time.
  const analysis = side === 'back' ? back : front;
  // The card has the shape of the uploaded design: a 3.5 x 2 in card, a portrait ID card, anything.
  const shape = analysis || front;
  const aspect = shape ? shape.height / shape.width : 4 / 7;
  const fields = side === 'back' ? backFields : frontFields;
  const setFields = side === 'back' ? setBackFields : setFrontFields;
  const design = { company_id: company.id };

  function pickFile(setter: (file: File | null) => void) {
    return (file: File | null, message?: string) => { setter(file); setError(message || ''); };
  }

  async function analyseFile(file: File, which: Side, blank?: File | null) {
    const form = new FormData();
    form.append('design', file);
    if (blank) form.append('background', blank);
    // The front is sent exactly as before; only the back adds side=back.
    if (which === 'back') form.append('side', 'back');
    return api<TemplateAnalysis>('/templates/image/analyze', { method: 'POST', body: form });
  }

  async function analyse() {
    if (!frontFile) return;
    if (backMode === 'upload' && !backFile) { setError('Choose the back design, or pick another option for the back.'); return; }
    setBusy('analyze'); setError(''); setSaved('');
    try {
      const frontResult = await analyseFile(frontFile, 'front', blankFile);
      const backResult = backMode === 'upload' && backFile ? await analyseFile(backFile, 'back') : null;
      setFront(frontResult); setFrontFields(frontResult.fields);
      setBack(backResult); setBackFields(backResult?.fields || []);
      setAiSource(null);
      setSide('front'); setSelected(null); setView('edit');
      if (!name) setName(frontFile.name.replace(/\.[^.]+$/, '').slice(0, 60));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  /** Take what the server read from an Illustrator file's front (and back) artboards into the editor. */
  function applyIllustrator(result: IllustratorAnalysis, fileName: string) {
    setError(''); setSaved('');
    setFront(result.front); setFrontFields(result.front.fields);
    setBack(result.back); setBackFields(result.back?.fields || []);
    setBackMode(result.back ? 'upload' : 'none');
    setAiSource({ upload_id: result.upload_id, front: result.front_artboard, back: result.back_artboard });
    setSide('front'); setSelected(null); setView('edit');
    if (!name) setName(fileName.replace(/\.[^.]+$/, '').slice(0, 60));
  }

  // The page header can also start an Illustrator upload; its result arrives here.
  useEffect(() => {
    if (!incoming) return;
    applyIllustrator(incoming.result, incoming.fileName);
    onIncomingUsed?.();
    document.getElementById('design-uploader')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  async function analyseBackLater() {
    if (!backFile) return;
    setBusy('back'); setError('');
    try {
      const result = await analyseFile(backFile, 'back');
      setBack(result); setBackFields(result.fields); setSelected(null);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  function backPayload() {
    if (backMode === 'auto') return autoBack;
    if (backMode === 'upload' && back) return { style: 'image', source: back.source, background: back.background, width: back.width, height: back.height, fields: backFields };
    return null;
  }

  async function save() {
    if (!front) return;
    setBusy('save'); setError('');
    try {
      const template = await api<Template>('/templates/image', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), source: front.source, background: front.background, width: front.width, height: front.height, fields: frontFields, back: backPayload(), ...(front.width_pt && front.height_pt ? { width_pt: front.width_pt, height_pt: front.height_pt } : {}), ...(aiSource ? { ai: aiSource } : {}) }),
      });
      setSaved(`“${template.name}” is saved and can now be used for card requests.`);
      reset();
      onSaved(template);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setFront(null); setBack(null); setFrontFields([]); setBackFields([]);
    setFrontFile(null); setBlankFile(null); setBackFile(null); setBackMode('none');
    setName(''); setDescription(''); setSide('front'); setSelected(null); setAiSource(null);
  }

  function update(index: number, patch: Partial<TemplateField>) {
    setFields((list) => list.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField(role: TemplateFieldRole) {
    const square = IMAGE_ROLES.includes(role);
    const base: TemplateField = { role, x: 0.35, y: 0.4, w: square ? 0.18 : 0.35, h: square ? 0.32 : 0.08, size: 0.06, color: '#111111', align: 'left', bold: role === 'name', shape: role === 'photo' ? 'circle' : 'rect', lines: 1 };
    setFields((list) => [...list, base]);
    setSelected(fields.length);
  }

  function startDrag(event: ReactPointerEvent, index: number, mode: Drag['mode']) {
    event.preventDefault(); event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { index, mode, startX: event.clientX, startY: event.clientY, field: fields[index] };
    setSelected(index);
  }

  function onMove(event: ReactPointerEvent) {
    const d = drag.current; const rect = canvasRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (event.clientX - d.startX) / rect.width; const dy = (event.clientY - d.startY) / rect.height;
    const f = d.field;
    if (d.mode === 'move') update(d.index, { x: Math.min(Math.max(0, f.x + dx), 1 - f.w), y: Math.min(Math.max(0, f.y + dy), 1 - f.h) });
    else update(d.index, { w: Math.min(Math.max(0.03, f.w + dx), 1 - f.x), h: Math.min(Math.max(0.03, f.h + dy), 1 - f.y) });
  }

  function switchSide(next: Side) {
    setSide(next); setSelected(null); drag.current = null;
  }

  const current = selected !== null ? fields[selected] : null;
  const hasName = frontFields.some((f) => f.role === 'name');
  const backWaiting = backMode === 'upload' && !back;

  /* ---------- step 1: upload ---------- */
  if (!front) {
    return (
      <SectionCard title="Upload your card design" info="Upload a card designed in Photoshop or Canva. Machine learning finds where the name, title, contact details and photo go.">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-7">
            <div className="space-y-3">
              <StepTitle number={1} title="Front of the card" hint="Keep the sample text on it: a name, job title, phone and email. Machine learning uses them to find the right spots." />
              <DropZone file={frontFile} label="Choose the front design" onFile={pickFile(setFrontFile)} />
              <Accordion title="Optional: the same front with the sample text hidden">
                <p className="leading-relaxed text-slate-600">If you have it, upload the design with its text layers hidden. Cards will be printed on this clean background instead of one cleaned by machine learning.</p>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-navy-900 hover:file:bg-slate-200" onChange={(e) => setBlankFile(e.target.files?.[0] || null)} />
              </Accordion>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-navy-900">Have an Illustrator file?</p>
                  <p className="text-xs text-slate-500">Upload the .ai file. We find its artboards and you choose the front and back.</p>
                </div>
                <IllustratorUpload companyId={company.id} onAnalysed={applyIllustrator} onError={setError} />
              </div>
            </div>

            <div className="space-y-3">
              <StepTitle number={2} title="Back of the card" hint="Optional. You can change this later in the editor." />
              <BackChooser mode={backMode} onMode={setBackMode} file={backFile} onFile={pickFile(setBackFile)} />
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {saved && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saved}</p>}
            <Button disabled={!frontFile || busy === 'analyze' || (backMode === 'upload' && !backFile)} onClick={analyse}>
              {busy === 'analyze' ? 'Reading your design…' : 'Analyse design'}
            </Button>
          </div>

          <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[15px] font-semibold tracking-tight text-navy-900">How it works</p>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                ['Upload', 'Export the card at 3.5 × 2 in, 1050 × 600 px or larger.'],
                ['Machine learning reads it', 'It finds each line of text, works out what it is, and cleans the sample text off the background.'],
                ['Check and save', 'Move or resize any box, preview with a real employee, then save.'],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white text-[11px] font-semibold text-brand-700 ring-1 ring-slate-200 tabular-nums">{i + 1}</span>
                  <span><span className="block font-medium text-navy-900">{title}</span><span className="mt-0.5 block leading-relaxed text-slate-600">{text}</span></span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </SectionCard>
    );
  }

  /* ---------- step 2: review and adjust ---------- */
  let canvasContent: ReactNode = null;
  let editorNote = '';
  if (side === 'back' && backMode === 'auto') {
    canvasContent = <AutoBackFace back={autoBack} values={values} />;
    editorNote = values.logoPath ? 'The logo, name and website come from your company profile.' : 'Add a logo in Company profile and it will appear here.';
  } else if (side === 'back' && backMode === 'none') {
    canvasContent = <div className="absolute inset-0 grid place-items-center bg-slate-50 px-6 text-center text-sm text-slate-500">This card is printed on the front only.</div>;
  } else if (side === 'back' && backWaiting) {
    canvasContent = <div className="absolute inset-0 grid place-items-center bg-slate-50 px-6 text-center text-sm text-slate-500">Choose the back design on the right, then analyse it.</div>;
  } else if (analysis) {
    canvasContent = <>
      <ProtectedImage path={assetPath(design, view === 'edit' && showOriginal ? analysis.source : analysis.background)} alt="Your design" className="pointer-events-none absolute inset-0 size-full object-fill" />
      {view === 'preview' && <SideFields fields={fields} values={values} aspect={aspect} />}
      {/* The text from the design is drawn back in as HTML, same size, colour and weight, so the editor looks like the original card. */}
      {view === 'edit' && !showOriginal && fields.map((f, i) => (
        !['photo', 'qr', 'logo', 'other'].includes(f.role) && f.text ? <div key={`text-${i}`} className="pointer-events-none absolute inset-0"><FieldText field={f} text={f.text} aspect={aspect} /></div> : null
      ))}
      {view === 'edit' && fields.map((f, i) => (
        <div
          key={i}
          role="button"
          tabIndex={0}
          aria-label={`${ROLE_LABELS[f.role]} field`}
          onPointerDown={(e) => startDrag(e, i, 'move')}
          onFocus={() => setSelected(i)}
          onKeyDown={(e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); setFields((l) => l.filter((_, j) => j !== i)); setSelected(null); return; }
            const step = 0.01;
            const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            const delta = move[e.key];
            if (!delta) return;
            e.preventDefault();
            if (e.shiftKey) update(i, { w: Math.min(Math.max(0.03, f.w + delta[0]), 1 - f.x), h: Math.min(Math.max(0.03, f.h + delta[1]), 1 - f.y) });
            else update(i, { x: Math.min(Math.max(0, f.x + delta[0]), 1 - f.w), y: Math.min(Math.max(0, f.y + delta[1]), 1 - f.h) });
          }}
          className={cx('absolute cursor-move border-2', f.role === 'photo' && f.shape === 'circle' ? 'rounded-full' : 'rounded-sm', boxTone(f.role, selected === i))}
          style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}
        >
          <span className={cx('absolute left-0 rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white', f.y < 0.08 ? 'top-0.5 left-0.5' : '-top-5', labelTone(f.role, selected === i))}>
            {ROLE_LABELS[f.role]}
          </span>
          <span onPointerDown={(e) => startDrag(e, i, 'resize')} className="absolute -right-2 -bottom-2 size-4 cursor-se-resize rounded-sm border-2 border-white bg-brand-600 shadow sm:size-3.5" aria-hidden="true" />
        </div>
      ))}
    </>;
    editorNote = view === 'edit'
      ? 'Blue: text that changes per person. Green: photo or logo. Amber: QR code. Dashed: left as part of the design. Keyboard: Tab to a box, arrows to move, Shift + arrows to resize, Delete to remove.'
      : 'This is roughly how a card will look. The PDF uses the same positions, colours and sizes.';
  }
  const editingFields = Boolean(analysis) && !(side === 'back' && backMode !== 'upload');
  const warnings = editingFields ? analysis?.warnings || [] : [];

  return (
    <SectionCard
      title="Check the fields"
      info="Boxes show where each detail will be printed. Drag a box to move it, or drag its corner to resize."
      action={<button type="button" className="text-sm font-medium text-slate-500 hover:text-navy-900" onClick={() => { if (window.confirm('Start over? Your changes to these fields will be lost.')) reset(); }}>Start over</button>}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm" role="tablist" aria-label="Card side">
          {(['front', 'back'] as const).map((s) => (
            <button key={s} type="button" role="tab" aria-selected={side === s} onClick={() => switchSide(s)}
              className={cx('rounded-md px-4 py-1.5 font-medium transition-colors', side === s ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-500 hover:text-navy-900')}>
              {s === 'front' ? 'Front' : 'Back'}
              {s === 'back' && <span className="ml-1.5 text-xs font-normal text-slate-400">{backMode === 'none' ? 'none' : backMode === 'auto' ? 'simple' : 'uploaded'}</span>}
            </button>
          ))}
        </div>
        {editingFields && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
              {(['edit', 'preview'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} className={cx('rounded-md px-3 py-1.5 font-medium', view === v ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-navy-900')}>
                  {v === 'edit' ? 'Edit fields' : 'Preview card'}
                </button>
              ))}
            </div>
            {view === 'edit' ? (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="accent-brand-600" checked={showOriginal} onChange={(e) => setShowOriginal(e.target.checked)} />
                Show original
              </label>
            ) : (
              <select className={cx(inputClass, 'w-auto py-1.5')} value={sampleId} onChange={(e) => setSampleId(e.target.value)} aria-label="Preview with">
                <option value="">Sample person</option>
                {employees.filter((e) => e.is_active).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {warnings.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <div
            ref={canvasRef}
            onPointerMove={onMove}
            onPointerUp={() => { drag.current = null; }}
            onPointerDown={() => setSelected(null)}
            className={cx('relative w-full touch-none overflow-hidden rounded-lg bg-slate-100 shadow-md select-none [container-type:inline-size]', aspect > 1 && 'mx-auto max-w-md')}
            style={{ aspectRatio: shape ? `${shape.width} / ${shape.height}` : '7 / 4' }}
          >
            {canvasContent}
          </div>
          {editorNote && <p className="mt-2 text-xs leading-relaxed text-slate-500">{editorNote}</p>}
        </div>

        <div className="space-y-5">
          {side === 'back' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-navy-900">Back of the card</p>
              <BackChooser mode={backMode} onMode={(mode) => { setBackMode(mode); setSelected(null); }} file={backFile} onFile={pickFile(setBackFile)} />
              {backMode === 'upload' && backFile && (
                <Button variant="secondary" className="w-full" disabled={busy === 'back'} onClick={analyseBackLater}>
                  {busy === 'back' ? 'Reading the back…' : back ? 'Analyse this file instead' : 'Analyse back design'}
                </Button>
              )}
              {backMode === 'auto' && (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">Background
                      <input type="color" value={autoBack.color} onChange={(e) => setAutoBack({ ...autoBack, color: e.target.value.toUpperCase() })} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">Text
                      <input type="color" value={autoBack.text_color} onChange={(e) => setAutoBack({ ...autoBack, text_color: e.target.value.toUpperCase() })} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="accent-brand-600" checked={autoBack.show_qr} onChange={(e) => setAutoBack({ ...autoBack, show_qr: e.target.checked })} />
                    Show the verification QR code
                  </label>
                </div>
              )}
            </div>
          )}

          {editingFields && (
            <div>
              <p className="text-sm font-semibold text-navy-900">Fields</p>
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {fields.map((f, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => setSelected(i)} className={cx('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm', selected === i ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                      <span className="font-medium text-navy-900">{ROLE_LABELS[f.role]}</span>
                      <span className="truncate text-xs text-slate-500">{f.text || (f.role === 'qr' ? 'Suggested spot' : '')}</span>
                    </button>
                  </li>
                ))}
                {fields.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No fields yet. Add one below.</li>}
              </ul>
              <select className={cx(inputClass, 'mt-2')} value="" onChange={(e) => e.target.value && addField(e.target.value as TemplateFieldRole)} aria-label="Add a field">
                <option value="">Add a field…</option>
                {ROLE_ORDER.filter((r) => r !== 'other').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          )}

          {editingFields && current && selected !== null && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">Selected field</p>
                <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => { setFields((l) => l.filter((_, j) => j !== selected)); setSelected(null); }}>Remove</button>
              </div>
              <label className="block text-xs font-medium text-slate-600">What goes here
                <select className={cx(inputClass, 'mt-1')} value={current.role} onChange={(e) => update(selected, { role: e.target.value as TemplateFieldRole })}>
                  {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </label>
              {current.role === 'photo' ? (
                <div className="flex gap-2 text-sm">
                  {(['circle', 'rect'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => update(selected, { shape: s })} className={cx('flex-1 rounded-md border px-3 py-1.5', current.shape === s ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600')}>
                      {s === 'circle' ? 'Round' : 'Square'}
                    </button>
                  ))}
                </div>
              ) : !IMAGE_ROLES.includes(current.role) && current.role !== 'other' && (
                <>
                  <label className="block text-xs font-medium text-slate-600">Text size
                    <input type="range" min={0.02} max={0.16} step={0.002} value={current.size} onChange={(e) => update(selected, { size: Number(e.target.value) })} className="mt-1 w-full accent-brand-600" />
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">Colour
                      <input type="color" value={current.color} onChange={(e) => update(selected, { color: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-slate-200" />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input type="checkbox" className="accent-brand-600" checked={current.bold} onChange={(e) => update(selected, { bold: e.target.checked })} /> Bold
                    </label>
                    <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600">Lines
                      <select className="rounded border border-slate-200 px-1.5 py-1 text-xs" value={current.lines} onChange={(e) => update(selected, { lines: Number(e.target.value) })}>
                        {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-1 text-sm">
                    {(['left', 'center', 'right'] as const).map((a) => (
                      <button key={a} type="button" onClick={() => update(selected, { align: a })} className={cx('flex-1 rounded-md border px-2 py-1 capitalize', current.align === a ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600')}>{a}</button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-3 border-t border-slate-100 pt-5">
            <label className="block text-sm font-medium text-slate-700">Template name
              <input className={cx(inputClass, 'mt-1')} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Head office card" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Description <span className="font-normal text-slate-400">(optional)</span>
              <input className={cx(inputClass, 'mt-1')} value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} />
            </label>
            {!hasName && <p className="text-sm text-amber-700">Add a Name field on the front before saving.</p>}
            {backWaiting && <p className="text-sm text-amber-700">Analyse the back design, or pick another option for the back.</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <Button className="w-full" disabled={!hasName || !name.trim() || backWaiting || busy === 'save'} onClick={save}>
              {busy === 'save' ? 'Saving…' : 'Save template'}
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export type DesignUploaderProps = Parameters<typeof DesignUploaderForm>[0];

/** The upload form. The wrapper gives the page header's "Upload .ai file" something to scroll to. */
export default function DesignUploader(props: DesignUploaderProps) {
  return (
    <div id="design-uploader" className="scroll-mt-24">
      <DesignUploaderForm {...props} />
    </div>
  );
}
