'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import ReviewDialog from './ReviewDialog';
import Icon from './Icon';
import { api } from '../lib/api';
import { employeeHeaders, parseEmployeeCsv, type CsvRow } from '../lib/csv';
import type { Employee } from '../lib/types';
import { Button, Notice, cx, tableClass, tdClass, thClass } from './ui';
import { cellNoteClass, errorMessage, hintClass } from './CompanyDashboardParts';

export interface CsvImportDialogProps {
  employees: Employee[];
  onClose: () => void;
  onComplete: (imported: number) => void | Promise<void>;
}

export default function CsvImportDialog({ employees, onClose, onComplete }: CsvImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  async function inspect(candidate: File | undefined) {
    if (!candidate || busy) return;
    setError(''); setRows([]); setFile(null);
    if (!candidate.name.toLowerCase().endsWith('.csv')) { setError('Choose a .csv file.'); return; }
    if (candidate.size > 5 * 1024 * 1024) { setError('CSV files must be 5 MB or smaller.'); return; }
    try { const parsed = parseEmployeeCsv(await candidate.text(), employees.map(item => item.employee_id)); setRows(parsed); setFile(candidate); }
    catch (failure) { setError(errorMessage(failure)); }
  }
  async function importFile() {
    if (busy || !file || rows.some(item => item.errors.length)) return;
    setBusy(true); setError('');
    try { const body = new FormData(); body.append('file', file); const result = await api<{ imported: number }>('/employees/import', { method: 'POST', body }); await onComplete(result.imported); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  const invalid = rows.filter(item => item.errors.length).length;
  const rowPad = 'max-md:p-3.5';
  return <ReviewDialog title="Bring your team together" eyebrow="EMPLOYEE CSV IMPORT" busy={busy} onClose={onClose}>
    <label className={cx('flex cursor-pointer flex-col items-center gap-2.5 rounded-[28px] border border-dashed px-5 py-8 text-center [&_svg]:text-[#4a1ff2]', dragging ? 'border-[#4a1ff2] bg-[#eee4fc]' : 'border-[#bba3d9] bg-[#f6f8f7]')} onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); inspect(event.dataTransfer.files[0]); }}><Icon name="upload" size={32} /><strong className="text-base">{file ? file.name : 'Drop your employee CSV here'}</strong><span className="text-xs text-[#7c8a90]">or choose a file · up to 5 MB</span><input className="w-full max-w-57.5 text-2xs" disabled={busy} type="file" accept=".csv" onChange={event => inspect(event.target.files?.[0])} /><small className="mt-2 text-3xs [overflow-wrap:anywhere] text-[#7c8a90]">Required: {employeeHeaders.join(', ')}</small></label>
    {rows.length > 0 && <><div className="flex gap-5 py-5 text-xs text-[#39846b]"><span><b>{rows.length - invalid}</b> ready to import</span><span className={invalid ? 'text-[#b05266]' : ''}><b>{invalid}</b> rows need attention</span></div><div className="max-h-75 overflow-auto rounded-xl border border-[#ece5f2]"><table className={tableClass}><thead><tr><th className={cx(thClass, rowPad)}>Row</th><th className={cx(thClass, rowPad)}>Employee</th><th className={cx(thClass, rowPad)}>Department</th><th className={cx(thClass, rowPad)}>Validation</th></tr></thead><tbody>{rows.slice(0, 100).map(item => <tr key={item.row} className="hover:bg-[#f6f8f7]"><td className={cx(tdClass, rowPad)}>{item.row}</td><td className={cx(tdClass, rowPad)}><strong>{item.values.name}</strong><small className={cellNoteClass}>{item.values.employee_id}</small></td><td className={cx(tdClass, rowPad)}>{item.values.department}</td><td className={cx(tdClass, rowPad)}>{item.errors.length ? <span className="text-2xs text-[#b05266]">{item.errors.join(' ')}</span> : 'Ready'}</td></tr>)}</tbody></table></div>{rows.length > 100 && <p className={hintClass}>Showing the first 100 of {rows.length} rows. All rows were checked.</p>}<p className={hintClass}>All rows must pass. The server revalidates the file before saving anything.</p></>}
    {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#e3e8e6] pt-5.5 max-sm:flex-col max-sm:items-stretch"><span className="text-2xs text-[#7c8a90]">No partial imports</span><Button disabled={busy || !rows.length || invalid > 0} onClick={importFile}>{busy ? 'Importing…' : `Import ${rows.length || ''} employees`} <Icon name="arrow" /></Button></div>
  </ReviewDialog>;
}
