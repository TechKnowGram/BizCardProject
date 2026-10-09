'use client';

export function contrastError(design) {
  function luminance(color) {
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255);
    return rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  }
  const values = [luminance(design.background), luminance(design.text)].sort((a, b) => a - b);
  return (values[1] + .05) / (values[0] + .05) < 4.5 ? 'Increase the contrast between text and background for a readable card.' : '';
}

export default function DesignEditor({ design, onChange, disabled }) {
  function update(key, value) { onChange({ ...design, [key]: value }); }
  return <div className="design-editor"><div className="editor-heading"><strong>Make it yours</strong><span>No AI call needed</span></div><div className="editor-colors">{['background', 'text', 'accent'].map(key => <label key={key}><span>{key}</span><div><input aria-label={`${key} color`} type="color" disabled={disabled} value={design[key]} onChange={e => update(key, e.target.value)} /><code>{design[key]}</code></div></label>)}</div><div className="editor-options"><label>Typography<select className="input" disabled={disabled} value={design.font} onChange={e => update('font', e.target.value)}><option value="Helvetica">Clean sans</option><option value="Times-Roman">Editorial serif</option><option value="Courier">Modern mono</option></select></label><label>Alignment<select className="input" disabled={disabled} value={design.layout} onChange={e => update('layout', e.target.value)}><option value="left">Left aligned</option><option value="center">Centered</option></select></label><label>Detail<select className="input" disabled={disabled} value={design.decoration} onChange={e => update('decoration', e.target.value)}>{['stripe', 'corner', 'frame', 'minimal'].map(value => <option key={value} value={value}>{value}</option>)}</select></label></div><label className="editor-checkbox"><input type="checkbox" disabled={disabled} checked={!!design.two_sided} onChange={e => update('two_sided', e.target.checked)} /> Include branded back · two-page PDF</label>{contrastError(design) && <p role="alert" className="ai-error">{contrastError(design)}</p>}</div>;
}
