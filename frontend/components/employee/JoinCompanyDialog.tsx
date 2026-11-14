'use client';

import type { FormEvent } from 'react';
import ReviewDialog from '@/components/ui/ReviewDialog';
import { Button, FieldLabel, cx, inputClass, inputErrorClass } from '@/components/ui';
import type { Row } from '@/components/employee/shared';

export interface JoinForm {
  official_email: string;
  employee_id: string;
  payer: string;
}

export interface JoinCompanyDialogProps {
  company: Row;
  form: JoinForm;
  errors: Record<string, string | undefined>;
  busy: boolean;
  apiError: string;
  onFormChange: (form: JoinForm) => void;
  onErrorsChange: (errors: Record<string, string | undefined>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function JoinCompanyDialog({ company, form, errors, busy, apiError, onFormChange, onErrorsChange, onClose, onSubmit }: JoinCompanyDialogProps) {
  return (
    <ReviewDialog title={`Join ${company.name}`} eyebrow="Company membership" busy={busy} onClose={onClose}>
      <p className="mb-6 text-sm leading-relaxed text-slate-600">
        Enter the work email and employee ID you use at <span className="font-medium text-slate-800">{company.name}</span>. If they match the
        company&apos;s staff list, your membership starts right away. Otherwise the company admin reviews your request.
      </p>

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <FieldLabel htmlFor="join-email">
            Work email <span className="text-red-600">*</span>
          </FieldLabel>
          <input
            id="join-email"
            className={cx(inputClass, errors.official_email && inputErrorClass)}
            type="email"
            placeholder="name@company.com"
            value={form.official_email}
            disabled={busy}
            aria-invalid={Boolean(errors.official_email)}
            onChange={(e) => {
              onFormChange({ ...form, official_email: e.target.value });
              onErrorsChange({ ...errors, official_email: undefined });
            }}
          />
          {errors.official_email && <p className="mt-1.5 text-xs text-red-600">{errors.official_email}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="join-id">
            Employee ID <span className="text-red-600">*</span>
          </FieldLabel>
          <input
            id="join-id"
            className={cx(inputClass, errors.employee_id && inputErrorClass)}
            type="text"
            placeholder="e.g. EMP-001"
            value={form.employee_id}
            disabled={busy}
            aria-invalid={Boolean(errors.employee_id)}
            onChange={(e) => {
              onFormChange({ ...form, employee_id: e.target.value });
              onErrorsChange({ ...errors, employee_id: undefined });
            }}
          />
          {errors.employee_id && <p className="mt-1.5 text-xs text-red-600">{errors.employee_id}</p>}
        </div>

        <div>
          <FieldLabel htmlFor="join-payer">Who pays for your cards</FieldLabel>
          <select id="join-payer" className={inputClass} value={form.payer} disabled={busy} onChange={(e) => onFormChange({ ...form, payer: e.target.value })}>
            <option value="COMPANY">The company</option>
            <option value="INDIVIDUAL">I pay myself</option>
          </select>
        </div>

        {apiError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </form>
    </ReviewDialog>
  );
}
