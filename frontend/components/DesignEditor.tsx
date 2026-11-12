'use client';

import type { CardDesign } from '../lib/types';
import { aiErrorClass, compactSelectClass } from './StudioParts';

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
const decorations = ['stripe', 'corner', 'frame', 'minimal'] as const;
const optionLabel = 'text-2xs text-[#7c8a90]';

export default function DesignEditor({ design, onChange, disabled }: DesignEditorProps) {
  function update<K extends keyof CardDesign>(key: K, value: CardDesign[K]) { onChange({ ...design, [key]: value }); }
  const contrast = contrastError(design);
  return <div className="mt-6 rounded-[28px] border border-[#e3e8e6] bg-[#ffffffa8] p-4.5">
    <div className="mb-4 flex justify-between gap-2 text-xs"><strong>Make it yours</strong><span className="text-2xs text-[#8b8097]">No AI call needed</span></div>
    <div className="mb-4 grid grid-cols-3 gap-2.5 max-sm:gap-1.25">{colorKeys.map(key => <label key={key} className="min-w-0"><span className="mb-1.5 block text-2xs capitalize text-[#7c8a90]">{key}</span><div className="flex items-center gap-1.5"><input className="size-7.5 flex-none border-0 bg-transparent p-0" aria-label={`${key} color`} type="color" disabled={disabled} value={design[key]} onChange={e => update(key, e.target.value)} /><code className="text-3xs text-[#675770] max-sm:text-3xs">{design[key]}</code></div></label>)}</div>
    <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
      <label className={optionLabel}>Typography<select className={compactSelectClass} disabled={disabled} value={design.font} onChange={e => update('font', e.target.value as CardDesign['font'])}><option value="Helvetica">Clean sans</option><option value="Times-Roman">Editorial serif</option><option value="Courier">Modern mono</option></select></label>
      <label className={optionLabel}>Alignment<select className={compactSelectClass} disabled={disabled} value={design.layout} onChange={e => update('layout', e.target.value as CardDesign['layout'])}><option value="left">Left aligned</option><option value="center">Centered</option></select></label>
      <label className={optionLabel}>Detail<select className={compactSelectClass} disabled={disabled} value={design.decoration} onChange={e => update('decoration', e.target.value as CardDesign['decoration'])}>{decorations.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <label className="mt-4 flex items-center gap-2.25 text-xs text-[#766282]"><input type="checkbox" disabled={disabled} checked={!!design.two_sided} onChange={e => update('two_sided', e.target.checked)} /> Include branded back · two-page PDF</label>
    {contrast && <p role="alert" className={aiErrorClass}>{contrast}</p>}
  </div>;
}
