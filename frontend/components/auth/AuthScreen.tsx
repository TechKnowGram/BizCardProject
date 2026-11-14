'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import Brand from '@/components/ui/Brand';
import CardMock from '@/components/home/CardMock';
import { FieldLabel, Notice, cx } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { isValidEmail, validateAuth } from '@/lib/validation';
import type { FieldErrors } from '@/lib/validation';

export interface AuthScreenProps {
  register?: boolean;
  initialType?: 'COMPANY' | 'EMPLOYEE';
}

type FieldKey = 'username' | 'company_name' | 'email' | 'password' | 'confirm';
type FormValues = Record<FieldKey, string>;

const submitBase = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';
const submitButtonClass = cx(submitBase, 'w-full');
const submitLinkClass = cx(submitBase, 'mt-3');
const inputBase = 'min-h-11 w-full rounded-lg border bg-white py-2.5 pl-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-600 focus:ring-3 focus:ring-brand-50 focus:outline-none';
const stepCircle = 'relative grid size-7 flex-none place-items-center rounded-full border border-brand-200 bg-brand-50 text-xs font-semibold text-brand-700';
const stepLine = "after:absolute after:top-8 after:left-1/2 after:h-8 after:w-px after:bg-slate-200 after:content-['']";

const sidePoints: Array<[string, string]> = [
  ['Keep one staff list', 'Add people by hand or import a CSV.'],
  ['Agree on a design once', 'Templates follow your colours, fonts and logo.'],
  ['Approve, then print', 'Approved cards come out as vector PDFs with a QR check.'],
];

export default function AuthScreen({ register = false, initialType = 'COMPANY' }: AuthScreenProps) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'COMPANY' | 'EMPLOYEE'>(initialType);
  const [values, setValues] = useState<FormValues>({ username: '', company_name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (register && accountType === 'EMPLOYEE') {
      const errs: FieldErrors = {};
      if (!values.username.trim()) errs.username = 'Enter your name.';
      if (!isValidEmail(values.email)) errs.email = 'Enter a valid email address.';
      if (!values.password) errs.password = 'Enter your password.';
      else if (values.password.length < 6) errs.password = 'Password must be at least 6 characters.';
      setErrors(errs);
      setError('');
      if (Object.keys(errs).length) return;
      setBusy(true);
      try {
        await api('/auth/employee/register', {
          method: 'POST',
          body: JSON.stringify({
            username: values.username.trim(),
            email: values.email.trim(),
            password: values.password,
          }),
        });
        setCreated(true);
      } catch (requestError) {
        const failure = requestError as ApiError;
        setError(failure.message || 'Registration failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    const invalid = validateAuth(values, register);
    setErrors(invalid);
    setError('');
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      if (register) {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            username: values.username.trim(),
            company_name: values.company_name.trim(),
            email: values.email.trim(),
            password: values.password,
          }),
        });
        setCreated(true);
      } else {
        const data = await api<{ access_token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: values.email.trim(), password: values.password }),
        });
        sessionStorage.setItem('bizcard_token', data.access_token);
        router.replace('/dashboard');
      }
    } catch (requestError) {
      const failure = requestError as ApiError;
      setError(failure.status === 401 ? 'That email and password do not match. Please try again.' : failure.message);
    } finally {
      setBusy(false);
    }
  }

  const fields: Array<[FieldKey, string, string]> = [
    ...(register
      ? accountType === 'COMPANY'
        ? [['username', 'Your name', 'Alex Morgan'], ['company_name', 'Company name', 'Studio North']] as Array<[FieldKey, string, string]>
        : [['username', 'Your name', 'Alex Morgan']] as Array<[FieldKey, string, string]>
      : []),
    [
      'email',
      accountType === 'COMPANY' && register ? 'Gmail address' : 'Email address',
      accountType === 'COMPANY' && register ? 'yourname@gmail.com' : 'yourname@company.com',
    ],
    ['password', 'Password', register ? 'Create a password' : 'Enter your password'],
    ...(register && accountType === 'COMPANY'
      ? [['confirm', 'Confirm password', 'Enter your password again']] as Array<[FieldKey, string, string]>
      : []),
  ];

  const passwordRules: Array<[boolean, string]> = [
    [values.password.length >= 8, '8+ characters'],
    [/[A-Z]/.test(values.password), 'Uppercase'],
    [/[a-z]/.test(values.password), 'Lowercase'],
    [/[0-9]/.test(values.password), 'Number'],
    [/[^A-Za-z0-9\s]/.test(values.password), 'Special'],
  ];
  const passwordScore = passwordRules.filter(([valid]) => valid).length;

  const successStepsCompany: Array<[string, string, string]> = [
    ['1', 'Application submitted', 'We have your company details.'],
    ['2', 'Administrator review', 'You can fill in your company profile while you wait.'],
    ['3', 'Workspace unlocks', 'Add your staff and start ordering cards.'],
  ];

  const successStepsEmployee: Array<[string, string, string]> = [
    ['1', 'Account created', 'You can sign in now.'],
    ['2', 'Join company', 'Ask to join your company from your workspace.'],
    ['3', 'Create cards', 'Once your company accepts you, request your card.'],
  ];

  const successSteps = accountType === 'COMPANY' ? successStepsCompany : successStepsEmployee;


  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative isolate hidden min-h-screen flex-col overflow-hidden bg-navy-950 px-12 py-10 text-white lg:flex xl:px-16">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" />
        <div aria-hidden="true" className="absolute -right-32 -bottom-32 -z-10 size-[420px] rounded-full bg-brand-600/25 blur-3xl" />
        <Link href="/" aria-label="Back to BizCard home" className="self-start"><Brand light /></Link>

        <div className="my-auto max-w-md py-10">
          <p className="flex items-center gap-3 text-xs font-semibold tracking-wider text-brand-300 uppercase">
            <span className="h-0.5 w-8 bg-plum-500" />
            {register ? 'Get started' : 'Sign in'}
          </p>
          <h1 className="mt-5 text-4xl leading-[1.15] font-bold text-white xl:text-[2.75rem]">
            Business cards for your whole company, in one place.
          </h1>
          <ul className="mt-9 space-y-5">
            {sidePoints.map(([title, text]) => (
              <li key={title} className="flex gap-3.5">
                <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-brand-600/20 text-xs text-brand-200">✓</span>
                <span>
                  <strong className="block text-sm font-semibold text-white">{title}</strong>
                  <span className="mt-0.5 block text-sm text-slate-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-11 max-w-sm -rotate-2 shadow-2xl">
            <CardMock look="classic" />
          </div>
        </div>

        <p className="text-xs text-slate-500">© {new Date().getFullYear()} BizCard</p>
      </section>

      <section className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:invisible" aria-label="BizCard home"><Brand /></Link>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-brand-600">← Back to home</Link>
        </div>

        <div className="my-auto w-full max-w-md self-center py-10">
          {register && !created && (
            <div className="mb-8 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Account type">
              {([['COMPANY', 'Company'], ['EMPLOYEE', 'Employee']] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={accountType === type}
                  onClick={() => { setAccountType(type); setErrors({}); setError(''); }}
                  className={cx(
                    'rounded-md py-2 text-sm font-semibold transition-colors',
                    accountType === type ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-navy-900'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <h2 className="text-3xl leading-tight font-bold text-navy-900">
            {created
              ? 'You’re all set'
              : register
              ? accountType === 'COMPANY'
                ? 'Register your company'
                : 'Create an employee account'
              : 'Sign in to BizCard'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {created
              ? accountType === 'COMPANY'
                ? 'Your company has been sent for review. Here is what happens next.'
                : 'Your employee account has been created. You can now sign in.'
              : register
              ? accountType === 'COMPANY'
                ? 'We review every company before its workspace opens.'
                : 'Sign up, ask to join your company, then request your card.'
              : 'Welcome back. Enter your details to open your workspace.'}
          </p>

          {created ? (
            <div className="mt-8 grid gap-0 rounded-xl border border-slate-200 bg-white p-6">
              {successSteps.map(([number, title, copy], index) => (
                <div key={number} className="flex min-h-16 gap-3.5">
                  <span className={cx(stepCircle, index < 2 && stepLine)}>{number}</span>
                  <p>
                    <strong className="block text-sm font-semibold text-navy-900">{title}</strong>
                    <small className="mt-0.5 block text-xs leading-normal text-slate-500">{copy}</small>
                  </p>
                </div>
              ))}
              <Link className={submitLinkClass} href="/login">Continue to sign in</Link>
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="mt-8 space-y-5">
              {fields.map(([key, label, placeholder]) => (
                <div key={key}>
                  <FieldLabel htmlFor={key}>{label}</FieldLabel>
                  <div className="relative">
                    <input
                      id={key}
                      name={key}
                      type={key === 'email' ? 'email' : ['password', 'confirm'].includes(key) ? (show ? 'text' : 'password') : 'text'}
                      autoComplete={key === 'password' ? (register ? 'new-password' : 'current-password') : key === 'confirm' ? 'new-password' : key === 'email' ? 'email' : key === 'username' ? 'name' : 'organization'}
                      maxLength={key === 'username' ? 50 : key === 'company_name' ? 150 : key === 'email' ? 255 : 128}
                      className={cx(inputBase, key === 'password' ? 'pr-16' : 'pr-3.5', errors[key] ? 'border-red-500' : 'border-slate-300')}
                      placeholder={placeholder}
                      value={values[key]}
                      aria-invalid={Boolean(errors[key])}
                      onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => key === 'password' && setCapsLock(event.getModifierState('CapsLock'))}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setValues({ ...values, [key]: event.target.value });
                        setErrors({ ...errors, [key]: undefined });
                      }}
                    />
                    {key === 'password' && (
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
                        aria-label={show ? 'Hide password' : 'Show password'}
                        onClick={() => setShow(!show)}
                      >
                        {show ? 'Hide' : 'Show'}
                      </button>
                    )}
                  </div>
                  {errors[key] && <p className="mt-1.5 text-xs text-red-600">{errors[key]}</p>}
                  {key === 'password' && capsLock && <p className="mt-1.5 text-xs font-medium text-amber-700">Caps Lock is on</p>}
                  {register && accountType === 'COMPANY' && key === 'email' && (
                    <p className="mt-1.5 text-xs text-slate-500">Use an address ending in @gmail.com.</p>
                  )}
                  {register && accountType === 'COMPANY' && key === 'password' && (
                    <div className="mt-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <i
                            className={cx('block h-full transition-[width] duration-200', passwordScore < 3 ? 'bg-red-500' : passwordScore < 5 ? 'bg-amber-500' : 'bg-emerald-500')}
                            style={{ width: `${passwordScore * 20}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                          {passwordScore < 3 ? 'Weak' : passwordScore < 5 ? 'Almost there' : 'Strong'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {passwordRules.map(([ok, text]) => (
                          <span
                            key={text}
                            className={cx(
                              'rounded-md border px-2 py-0.5 text-xs transition-colors',
                              ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'
                            )}
                          >
                            {ok ? '✓ ' : ''}{text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {error && <Notice tone="error">{error}</Notice>}
              <button className={submitButtonClass} disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : register
                  ? accountType === 'COMPANY'
                    ? 'Register company'
                    : 'Create account'
                  : 'Sign in'}
              </button>
            </form>
          )}

          {!created && (
            <p className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
              {register ? 'Already have an account?' : 'New to BizCard?'}{' '}
              <Link href={register ? '/login' : '/register'} className="font-semibold text-brand-600 hover:text-brand-700">
                {register ? 'Sign in' : 'Create an account'}
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
