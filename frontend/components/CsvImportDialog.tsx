'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import ReviewDialog from './ReviewDialog';
import Icon from './Icon';
import { api } from '../lib/api';
import { employeeHeaders, parseEmployeeCsv, type CsvRow } from '../lib/csv';
import type { Employee } from '../lib/types';
import { Button, Notice, cx } from './ui';
import { cellNoteClass, errorMessage, hintClass } from './CompanyDashboardParts';

export interface CsvImportDialogProps {
  employees: Employee[];
  onClose: () => void;
  onComplete: (imported: number) => void | Promise<void>;
}

const th = 'bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase';
const td = 'border-t border-slate-100 px-4 py-3 align-top text-sm text-slate-700';

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
  return <ReviewDialog title="Import employees from CSV" eyebrow="Employees" busy={busy} onClose={onClose}>
    <label
      className={cx('flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-8 text-center transition-colors', dragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-300')}
      onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); inspect(event.dataTransfer.files[0]); }}
    >
      <Icon name="upload" size={28} className="text-slate-400" />
      <span className="text-sm font-semibold text-navy-900">{file ? file.name : 'Drop your CSV file here'}</span>
      <span className="text-sm text-slate-500">or choose a file, up to 5 MB</span>
      <input className="mt-1 w-full max-w-64 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700" disabled={busy} type="file" accept=".csv" onChange={event => inspect(event.target.files?.[0])} />
    </label>
    <p className={cx(hintClass, '[overflow-wrap:anywhere]')}>Required columns: {employeeHeaders.join(', ')}</p>

    {rows.length > 0 && <>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span className="text-slate-700"><span className="font-semibold text-navy-900">{rows.length - invalid}</span> ready to import</span>
        <span className={invalid ? 'text-red-700' : 'text-slate-500'}><span className="font-semibold">{invalid}</span> need attention</span>
      </div>
      <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead><tr><th className={th}>Row</th><th className={th}>Employee</th><th className={th}>Department</th><th className={th}>Check</th></tr></thead>
          <tbody>{rows.slice(0, 100).map(item => <tr key={item.row}>
            <td className={cx(td, 'text-slate-500 tabular-nums')}>{item.row}</td>
            <td className={td}><span className="font-medium text-navy-900">{item.values.name}</span><span className={cellNoteClass}>{item.values.employee_id}</span></td>
            <td className={td}>{item.values.department}</td>
            <td className={td}>{item.errors.length ? <span className="text-red-700">{item.errors.join(' ')}</span> : <span className="text-emerald-700">Ready</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {rows.length > 100 && <p className={hintClass}>Showing the first 100 of {rows.length} rows. All rows were checked.</p>}
      <p className={hintClass}>Every row must pass. The file is checked again on the server before anything is saved.</p>
    </>}

    {error && <Notice tone="error" className="mt-4">{error}</Notice>}
    <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5 max-sm:flex-col max-sm:items-stretch">
      <span className="text-sm text-slate-500">If any row fails, nothing is imported.</span>
      <div className="flex gap-2 max-sm:justify-end">
        <Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button disabled={busy || !rows.length || invalid > 0} onClick={importFile}>{busy ? 'Importing…' : rows.length ? `Import ${rows.length} employees` : 'Import employees'}</Button>
      </div>
    </div>
  </ReviewDialog>;
}
