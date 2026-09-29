'use client';

import { useEffect, useState } from 'react';
import ReviewDialog from './ReviewDialog';
import { validateEmployee } from '../lib/validation';

const empty = { employee_id: '', name: '', designation: '', department: '', email: '', phone: '' };

export default function EmployeeDialog({ employee, busy, apiError, onSave, onClose }) {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  useEffect(() => { setValues(employee ? { ...empty, ...employee } : empty); }, [employee]);

  function submit(event) {
    event.preventDefault();
    const invalid = validateEmployee(values);
    setErrors(invalid);
    if (!Object.keys(invalid).length) onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])));
  }

  const fields = [
    ['employee_id', 'Employee ID', 'EMP-001'], ['name', 'Full name', 'Ayesha Rahman'],
    ['designation', 'Designation', 'Software Engineer'], ['department', 'Department', 'Engineering'],
    ['email', 'Email address', 'ayesha@company.com'], ['phone', 'Phone number', '+880 1700 000000'],
  ];
  return <ReviewDialog title={employee ? 'Edit employee' : 'Add an employee'} onClose={onClose} busy={busy}>
    <p className="mb-6 text-sm leading-6 text-slate-500">{employee ? 'Keep this employee’s card information accurate and up to date.' : 'Add one employee now. You can still use CSV import for larger teams.'}</p>
    <form onSubmit={submit} noValidate><div className="grid gap-5 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <label key={key} className={key === 'name' || key === 'email' ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-semibold">{label}</span><input className={`input ${errors[key] ? 'input-error' : ''}`} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'employee_id' || key === 'phone' ? 50 : key === 'email' ? 255 : 120} placeholder={placeholder} value={values[key]} onChange={event => { setValues({ ...values, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); }} />{errors[key] && <span className="mt-2 block text-xs text-red-600">{errors[key]}</span>}</label>)}</div>
      {apiError && <p role="alert" className="notice-error mt-5">{apiError}</p>}
      <div className="mt-7 flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}</button></div>
    </form>
  </ReviewDialog>;
}
