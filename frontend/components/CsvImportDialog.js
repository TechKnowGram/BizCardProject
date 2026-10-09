'use client';

import { useState } from 'react';
import ReviewDialog from './ReviewDialog';
import Icon from './Icon';
import { api } from '../lib/api';
import { employeeHeaders, parseEmployeeCsv } from '../lib/csv';

export default function CsvImportDialog({ employees, onClose, onComplete }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  async function inspect(candidate) {
    if (!candidate || busy) return;
    setError(''); setRows([]); setFile(null);
    if (!candidate.name.toLowerCase().endsWith('.csv')) { setError('Choose a .csv file.'); return; }
    if (candidate.size > 5 * 1024 * 1024) { setError('CSV files must be 5 MB or smaller.'); return; }
    try { const parsed = parseEmployeeCsv(await candidate.text(), employees.map(item => item.employee_id)); setRows(parsed); setFile(candidate); }
    catch (failure) { setError(failure.message); }
  }
  async function importFile() {
    if (busy || !file || rows.some(item => item.errors.length)) return;
    setBusy(true); setError('');
    try { const body = new FormData(); body.append('file', file); const result = await api('/employees/import', { method: 'POST', body }); await onComplete(result.imported); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const invalid = rows.filter(item => item.errors.length).length;
  return <ReviewDialog title="Bring your team together" eyebrow="EMPLOYEE CSV IMPORT" busy={busy} onClose={onClose}>
    <label className={`csv-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); inspect(event.dataTransfer.files[0]); }}><Icon name="upload" size={32} /><strong>{file ? file.name : 'Drop your employee CSV here'}</strong><span>or choose a file · up to 5 MB</span><input disabled={busy} type="file" accept=".csv" onChange={event => inspect(event.target.files[0])} /><small>Required: {employeeHeaders.join(', ')}</small></label>
    {rows.length > 0 && <><div className="csv-summary"><span><b>{rows.length - invalid}</b> ready to import</span><span className={invalid ? 'invalid' : ''}><b>{invalid}</b> rows need attention</span></div><div className="csv-preview"><table className="data-table"><thead><tr><th>Row</th><th>Employee</th><th>Department</th><th>Validation</th></tr></thead><tbody>{rows.slice(0, 100).map(item => <tr key={item.row}><td>{item.row}</td><td><strong>{item.values.name}</strong><small>{item.values.employee_id}</small></td><td>{item.values.department}</td><td>{item.errors.length ? <span className="csv-error">{item.errors.join(' ')}</span> : 'Ready'}</td></tr>)}</tbody></table></div>{rows.length > 100 && <p className="field-hint">Showing the first 100 of {rows.length} rows. All rows were checked.</p>}<p className="field-hint">All rows must pass. The server revalidates the file before saving anything.</p></>}
    {error && <p role="alert" className="notice-error mt-4">{error}</p>}
    <div className="wizard-actions"><span>No partial imports</span><button className="btn-primary" disabled={busy || !rows.length || invalid > 0} onClick={importFile}>{busy ? 'Importing…' : `Import ${rows.length || ''} employees`} <Icon name="arrow" /></button></div>
  </ReviewDialog>;
}
