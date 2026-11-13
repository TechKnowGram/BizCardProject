'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import ReviewDialog from './ReviewDialog';
import { validateEmployee, type EmployeeValues, type FieldErrors } from '../lib/validation';
import type { Employee } from '../lib/types';
import { Button, Notice, cx, inputClass, inputErrorClass } from './ui';
import { fieldLabelClass } from './CompanyDashboardParts';

const empty: EmployeeValues = { employee_id: '', name: '', designation: '', department: '', email: '', phone: '' };
type FieldKey = keyof EmployeeValues;
const inputErrorFieldClass = cx(inputClass, inputErrorClass);

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

  return <ReviewDialog title={employee ? 'Edit employee' : 'Add an employee'} eyebrow="Employees" onClose={onClose} busy={busy}>
    <p className="mb-6 text-sm leading-relaxed text-slate-500">{employee ? 'These details are printed on the employee’s card.' : 'Add one person now. For larger teams, use Import CSV on the Employees page.'}</p>
    <form onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <label key={key} className={key === 'name' || key === 'email' ? 'sm:col-span-2' : ''}>
        <span className={fieldLabelClass}>{label}</span>
        <input className={errors[key] ? inputErrorFieldClass : inputClass} type={key === 'email' ? 'email' : 'text'} aria-invalid={Boolean(errors[key])} maxLength={key === 'employee_id' || key === 'phone' ? 50 : key === 'email' ? 255 : 120} placeholder={placeholder} value={values[key]} onChange={event => { setValues({ ...values, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); }} />
        {errors[key] && <span className="mt-1.5 block text-xs text-red-700">{errors[key]}</span>}
      </label>)}</div>
      {apiError && <Notice tone="error" className="mt-5">{apiError}</Notice>}
      <div className="mt-7 flex justify-end gap-2 border-t border-slate-100 pt-5"><Button variant="secondary" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}</Button></div>
    </form>
  </ReviewDialog>;
}
