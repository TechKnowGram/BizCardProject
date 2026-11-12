'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import ReviewDialog from './ReviewDialog';
import { validateEmployee, type EmployeeValues, type FieldErrors } from '../lib/validation';
import type { Employee } from '../lib/types';
import { Button, Notice, inputClass, inputErrorClass } from './ui';

const empty: EmployeeValues = { employee_id: '', name: '', designation: '', department: '', email: '', phone: '' };
type FieldKey = keyof EmployeeValues;
const inputErrorFieldClass = `${inputClass.replace('border-[#e3e8e6]', '')} ${inputErrorClass}`;

export interface EmployeeDialogProps {
  /** `null` creates a new employee; an Employee edits it. */
  employee: Employee | null;
  busy: boolean;
  apiError: string;
  onSave: (values: EmployeeValues) => void | Promise<void>;
  onClose: () => void;
}

const fields: Array<[FieldKey, string, string]> = [
  ['employee_id', 'Employee ID', 'EMP-001'], ['name', 'Full name', 'Ayesha Rahman'],
  ['designation', 'Designation', 'Software Engineer'], ['department', 'Department', 'Engineering'],
  ['email', 'Email address', 'ayesha@company.com'], ['phone', 'Phone number', '+880 1700 000000'],
];

export default function EmployeeDialog({ employee, busy, apiError, onSave, onClose }: EmployeeDialogProps) {
  const [values, setValues] = useState<EmployeeValues>(empty);
  const [errors, setErrors] = useState<FieldErrors<FieldKey>>({});
  useEffect(() => {
    setValues(employee ? {
      employee_id: employee.employee_id || '',
      name: employee.name || '',
      designation: employee.designation || '',
      department: employee.department || '',
      email: employee.email || '',
      phone: employee.phone || '',
    } : empty);
  }, [employee]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateEmployee(values);
    setErrors(invalid);
    if (!Object.keys(invalid).length) onSave(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])) as unknown as EmployeeValues);
  }

  return <ReviewDialog title={employee ? 'Edit employee' : 'Add an employee'} onClose={onClose} busy={busy}>
    <p className="mb-6 text-sm leading-6 text-slate-500">{employee ? 'Keep this employee’s card information accurate and up to date.' : 'Add one employee now. You can still use CSV import for larger teams.'}</p>
    <form onSubmit={submit} noValidate><div className="grid gap-5 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <label key={key} className={key === 'name' || key === 'email' ? 'sm:col-span-2' : ''}><span className="mb-2 block text-sm font-semibold">{label}</span><input className={errors[key] ? inputErrorFieldClass : inputClass} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'employee_id' || key === 'phone' ? 50 : key === 'email' ? 255 : 120} placeholder={placeholder} value={values[key]} onChange={event => { setValues({ ...values, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); }} />{errors[key] && <span className="mt-2 block text-xs text-red-600">{errors[key]}</span>}</label>)}</div>
      {apiError && <Notice tone="error" className="mt-5">{apiError}</Notice>}
      <div className="mt-7 flex justify-end gap-2 border-t border-slate-100 pt-5"><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}</Button></div>
    </form>
  </ReviewDialog>;
}
