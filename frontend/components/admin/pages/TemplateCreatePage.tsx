'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CardPreview from '@/components/cards/CardPreview';
import { PageHeader, SectionCard } from '@/components/dashboard/Surface';
import { useAdmin } from '@/components/admin/AdminDashboard';
import { Button, Notice, buttonClass, cx, inputClass } from '@/components/ui';
import { api } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import { isImageDesign } from '@/lib/types';
import type { CardDesign, Template } from '@/lib/types';

const DECORATIONS: CardDesign['decoration'][] = ['stripe', 'corner', 'frame', 'minimal', 'star', 'sun', 'govt'];
const FONTS: CardDesign['font'][] = ['Helvetica', 'Times-Roman', 'Courier'];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const valid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <label className="block text-sm font-medium text-slate-700">{label}
      <span className="mt-1 flex items-center gap-2">
        <input type="color" value={valid ? value : '#000000'} onChange={e => onChange(e.target.value.toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-1" />
        <input className={inputClass} value={value} maxLength={7} onChange={e => onChange(e.target.value)} />
      </span>
    </label>
  );
}

export default function AdminTemplateCreatePage() {
  const router = useRouter();
  const { load, data } = useAdmin();
  const [editId, setEditId] = useState<number | null>(null);
  const [filled, setFilled] = useState(false);
  const [design, setDesign] = useState<CardDesign>({
    name: '', description: '', background: '#18233F', text: '#FFFFFF', accent: '#6D7CFF',
    layout: 'left', decoration: 'stripe', font: 'Helvetica', two_sided: false,
  });
  // /create?edit=ID opens an existing template with its colours and layout filled in.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('edit'));
    if (id) setEditId(id);
  }, []);
  useEffect(() => {
    if (!editId || filled) return;
    const template = data.templates.find(t => t.id === editId);
    const found = template?.design;
    if (found && !isImageDesign(found)) { setDesign({ ...found, name: found.name, description: template?.description ?? found.description }); setFilled(true); }
  }, [editId, filled, data.templates]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof CardDesign>(key: K, value: CardDesign[K]) => setDesign(current => ({ ...current, [key]: value }));
  const validColors = [design.background, design.text, design.accent].every(c => /^#[0-9A-Fa-f]{6}$/.test(c));

  async function save() {
    setBusy(true); setError('');
    try {
      await api<Template>(editId ? '/admin/templates/' + editId + '/design' : '/admin/templates/design', {
        method: editId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...design, name: design.name.trim(), description: design.description.trim() }),
      });
      await load();
      router.push('/dashboard/templates');
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? 'Edit template' : 'Create a template'}
        description="Design a shared card from colours, layout and decoration. It is available to every approved company once saved."
        actions={<Link href="/dashboard/templates" className={buttonClass('secondary')}>Back to templates</Link>}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50/60 px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900">Have the card as a photo or Photoshop file?</p>
          <p className="mt-0.5 text-sm text-slate-600">Upload it instead. Machine learning reads the design, finds where the name, title, contacts and photo go, and you check it before saving.</p>
        </div>
        <Link href="/dashboard/templates/upload" className={buttonClass('primary')}>Create from a photo or PSD</Link>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Design">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">Template name
              <input className={cx(inputClass, 'mt-1')} value={design.name} maxLength={60} onChange={e => set('name', e.target.value)} placeholder="e.g. Midnight" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Description
              <input className={cx(inputClass, 'mt-1')} value={design.description} maxLength={255} onChange={e => set('description', e.target.value)} placeholder="Short line shown to companies" />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ColorField label="Background" value={design.background} onChange={v => set('background', v)} />
              <ColorField label="Text" value={design.text} onChange={v => set('text', v)} />
              <ColorField label="Accent" value={design.accent} onChange={v => set('accent', v)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">Layout
                <select className={cx(inputClass, 'mt-1')} value={design.layout} onChange={e => set('layout', e.target.value as CardDesign['layout'])}>
                  <option value="left">Left aligned</option>
                  <option value="center">Centered</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Decoration
                <select className={cx(inputClass, 'mt-1')} value={design.decoration} onChange={e => set('decoration', e.target.value as CardDesign['decoration'])}>
                  {DECORATIONS.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Font
                <select className={cx(inputClass, 'mt-1')} value={design.font} onChange={e => set('font', e.target.value as CardDesign['font'])}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={design.two_sided} onChange={e => set('two_sided', e.target.checked)} />
              Two-sided card
            </label>
            {error && <Notice tone="error">{error}</Notice>}
            <Button className="w-full" disabled={busy || !design.name.trim() || !design.description.trim() || !validColors} onClick={save}>
              {busy ? 'Saving…' : editId ? 'Save changes' : 'Save shared template'}
            </Button>
            <p className="text-xs text-slate-500">Text and background need at least 4.5:1 contrast so the card stays readable.</p>
          </div>
        </SectionCard>
        <SectionCard title="Preview">
          {validColors ? (
            <div className="space-y-4">
              <CardPreview variant="library" design={design} style="classic" />
              {design.two_sided && <CardPreview variant="library" design={design} style="classic" back />}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Enter colours like #18233F to see the preview.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
