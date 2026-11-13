'use client';

import type { CardDesign } from '../lib/types';
import { ColorField, aiErrorClass, compactSelectClass } from './StudioParts';

export function contrastError(design: Pick<CardDesign, 'background' | 'text'>): string {
  function luminance(color: string): number {
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
    return rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  }
  const values = [luminance(design.background), luminance(design.text)].sort((a, b) => a - b);
  return (values[1] + .05) / (values[0] + .05) < 4.5 ? 'Increase the contrast between text and background for a readable card.' : '';
}

export interface DesignEditorProps {
  design: CardDesign;
  onChange: (design: CardDesign) => void;
  disabled?: boolean;
}

const colorKeys = ['background', 'text', 'accent'] as const;
const decorations = ['stripe', 'corner', 'frame', 'minimal', 'star', 'sun', 'govt'] as const;
const optionLabel = 'text-sm text-slate-600';

export default function DesignEditor({ design, onChange, disabled }: DesignEditorProps) {
  function update<K extends keyof CardDesign>(key: K, value: CardDesign[K]) { onChange({ ...design, [key]: value }); }
  const contrast = contrastError(design);
  return <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold text-navy-900">Adjust the design</p><span className="text-xs text-slate-500">Changes here do not use the AI service</span></div>
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{colorKeys.map(key => <ColorField key={key} label={key} value={design[key]} disabled={disabled} onChange={value => update(key, value)} />)}</div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className={optionLabel}>Font<select className={compactSelectClass} disabled={disabled} value={design.font} onChange={e => update('font', e.target.value as CardDesign['font'])}><option value="Helvetica">Clean sans</option><option value="Times-Roman">Editorial serif</option><option value="Courier">Modern mono</option></select></label>
      <label className={optionLabel}>Alignment<select className={compactSelectClass} disabled={disabled} value={design.layout} onChange={e => update('layout', e.target.value as CardDesign['layout'])}><option value="left">Left aligned</option><option value="center">Centered</option></select></label>
      <label className={optionLabel}>Detail<select className={compactSelectClass} disabled={disabled} value={design.decoration} onChange={e => update('decoration', e.target.value as CardDesign['decoration'])}>{decorations.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <label className="mt-4 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="size-4 accent-brand-600" disabled={disabled || design.decoration === 'govt'} checked={!!design.two_sided && design.decoration !== 'govt'} onChange={e => update('two_sided', e.target.checked)} /> Add a printed back (two-page PDF)</label>
    {contrast && <p role="alert" className={aiErrorClass}>{contrast}</p>}
  </div>;
}
