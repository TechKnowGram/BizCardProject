'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import Brand, { sectionChipClass } from '@/components/Brand';
import CardPreview from '@/components/CardPreview';
import { Shape } from '@/components/home/Shapes';
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

const submitBase = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#2d62a8] px-6 py-2.5 font-medium text-white transition duration-200 ease-out hover:bg-[#28528d] shadow-sm disabled:cursor-not-allowed disabled:opacity-50';
const submitButtonClass = cx(submitBase, 'w-full');
const submitLinkClass = cx(submitBase, 'mt-2.5');
const inputBase = 'min-h-11 w-full rounded-lg border border-slate-300 bg-white py-3 pl-4 text-sm transition duration-150 focus:border-[#2d62a8] focus:ring-4 focus:ring-[#eef3fa] focus:outline-none';
const stepCircle = 'grid size-7.5 flex-none place-items-center rounded-full border border-[#2d62a8] text-3xs font-bold text-[#2d62a8] bg-[#eef3fa]';
const stepLine = "after:absolute after:mt-16 after:h-9 after:w-px after:bg-[#e2e8f0] after:content-['']";

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
    ['1', 'Application submitted', 'Your company details are safely recorded.'],
    ['2', 'Administrator review', 'Complete your profile while approval is pending.'],
    ['3', 'Workspace unlocks', 'Add employees and create verified cards.'],
  ];

  const successStepsEmployee: Array<[string, string, string]> = [
    ['1', 'Account created', 'Your employee card identity is ready.'],
    ['2', 'Join company', 'Request membership with an approved company to access branding.'],
    ['3', 'Create cards', 'Create polished, verified visiting cards whenever you need.'],
  ];

  const successSteps = accountType === 'COMPANY' ? successStepsCompany : successStepsEmployee;

  return (
    <main className="grid min-h-screen grid-cols-2 bg-[#f4f7fb] max-md:grid-cols-1 font-body">
      <section className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#080d26] px-15 py-10.5 text-white max-md:hidden border-r border-[#1a2462]">
        <div className="absolute -top-24 -left-20 -z-1 size-96 rounded-full bg-[#101845]/60 blur-3xl" />
        <div className="absolute right-[-40px] bottom-[18%] -z-1 size-80 rounded-full bg-[#2d62a8]/10 blur-3xl" />
        <Link href="/" aria-label="Back to BizCard home"><Brand light /></Link>
        <div className="relative z-2 my-auto py-10.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1a2462] bg-[#101845] px-3.5 py-1.5 text-2xs font-semibold tracking-wider text-slate-200">
            <span className="size-1.5 rounded-full bg-[#e20917]" />
            THOUGHTFUL CARDS. LASTING CONNECTIONS.
          </span>
          <h1 className="mt-6 max-w-148 text-5xl leading-[1.15] font-semibold tracking-tight lg:text-6xl text-white">
            Make every<br />introduction<br /><span className="text-[#60a5fa] font-semibold">feel like you.</span>
          </h1>
          <p className="mt-6 max-w-105 text-base leading-relaxed text-slate-300">
            One energetic enterprise workspace for your team, your brand, and every customer impression.
          </p>
          <div className="mt-9.5 max-w-95 -rotate-4 drop-shadow-2xl transition-transform duration-300 ease-out hover:-translate-y-1 hover:-rotate-2">
            <CardPreview style="modern" name="Alex Morgan" company="STUDIO NORTH" />
          </div>
          <div className="mt-8.5 flex gap-8.5 text-2xs text-slate-400 [&_strong]:mb-0.5 [&_strong]:block [&_strong]:text-lg [&_strong]:text-white">
            <span><strong>3</strong>signature styles</span>
            <span><strong>1-click</strong>approval flow</span>
            <span><strong>300 DPI</strong>vector print</span>
          </div>
        </div>
        <p className="relative z-2 text-2xs text-slate-400">Designed for teams. Made for real connections.</p>
      </section>

      <section className="flex min-h-screen flex-col px-14 py-7.5 max-md:p-5.5">
        <div className="mb-8 lg:hidden"><Link href="/"><Brand /></Link></div>
        <div className="my-auto w-full max-w-md self-center rounded-2xl border border-slate-200/80 bg-white p-9 shadow-sm max-md:px-6 max-md:py-7.5">
          {register && (
            <div className="mb-6 flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => { setAccountType('COMPANY'); setErrors({}); setError(''); }}
                className={cx(
                  'flex-1 rounded-md py-2 text-center text-xs font-semibold transition-all duration-200',
                  accountType === 'COMPANY'
                    ? 'bg-[#2d62a8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-black'
                )}
              >
                🏢 Company workspace
              </button>
              <button
                type="button"
                onClick={() => { setAccountType('EMPLOYEE'); setErrors({}); setError(''); }}
                className={cx(
                  'flex-1 rounded-md py-2 text-center text-xs font-semibold transition-all duration-200',
                  accountType === 'EMPLOYEE'
                    ? 'bg-[#2d62a8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-black'
                )}
              >
                👤 Employee account
              </button>
            </div>
          )}

          <span className={sectionChipClass}>
            {register ? (accountType === 'COMPANY' ? 'COMPANY WORKSPACE' : 'EMPLOYEE ACCOUNT') : 'WELCOME BACK'}
          </span>
          <h2 className="mt-4 text-4xl leading-tight font-medium tracking-tight">
            {created
              ? 'You’re all set.'
              : register
              ? accountType === 'COMPANY'
                ? 'Bring your team together.'
                : 'Build your card identity.'
              : 'Good to see you again.'}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#7c8a90]">
            {created
              ? accountType === 'COMPANY'
                ? 'Your company has been submitted for review. Here is what happens next.'
                : 'Your employee account has been created. You can now sign in.'
              : register
              ? accountType === 'COMPANY'
                ? 'Create your company account. We’ll review it before you start creating cards.'
                : 'Create an employee account, request company membership, and create cards.'
              : 'Sign in to your workspace and pick up where you left off.'}
          </p>

          {created ? (
            <div className="mt-6.5 grid gap-0">
              {successSteps.map(([number, title, copy], index) => (
                <div key={number} className="flex min-h-16 gap-3">
                  <span className={cx(stepCircle, index < 2 && stepLine)}>{number}</span>
                  <p>
                    <strong className="block text-xs text-[#433b4c]">{title}</strong>
                    <small className="mt-1 block text-3xs leading-normal text-[#7c8a90]">{copy}</small>
                  </p>
                </div>
              ))}
              <Link className={submitLinkClass} href="/login">Continue to sign in ↗</Link>
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
                      className={cx(inputBase, key === 'password' ? 'pr-16' : 'pr-4', errors[key] ? 'border-[#dc6060]' : 'border-black/60')}
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
                        className="absolute inset-y-0 right-4 text-xs font-semibold text-royal"
                        aria-label={show ? 'Hide password' : 'Show password'}
                        onClick={() => setShow(!show)}
                      >
                        {show ? 'Hide' : 'Show'}
                      </button>
                    )}
                  </div>
                  {errors[key] && <p className="mt-2 text-xs text-red-600">{errors[key]}</p>}
                  {key === 'password' && capsLock && <p className="mt-1.5 text-3xs font-bold text-[#a66c00]">Caps Lock is on</p>}
                  {register && accountType === 'COMPANY' && key === 'email' && (
                    <p className="mt-1.5 text-3xs text-[#7c8a90]">Use a valid address ending in @gmail.com.</p>
                  )}
                  {register && accountType === 'COMPANY' && key === 'password' && (
                    <>
                      <div className="relative mt-3 h-1 rounded-full bg-[#eee9f1]">
                        <i
                          className="block h-full rounded-[inherit] bg-[linear-gradient(90deg,#ef6a69,#efb43b,#43ae7e)] transition-[width] duration-250 ease-in-out"
                          style={{ width: `${passwordScore * 20}%` }}
                        />
                        <span className="absolute top-2.5 right-0 text-3xs font-bold text-[#908997]">
                          {passwordScore < 3 ? 'Weak' : passwordScore < 5 ? 'Almost there' : 'Strong password'}
                        </span>
                      </div>
                      <div className="mt-5.5 flex flex-wrap gap-1.5">
                        {passwordRules.map(([ok, text]) => (
                          <span
                            key={text}
                            className={cx(
                              'rounded-full border px-2 py-1 text-2xs transition-all duration-200',
                              ok ? 'border-[#bce6d2] bg-[#effaf5] text-[#247354]' : 'border-[#e6e7ee] text-[#7c8a90]'
                            )}
                          >
                            {ok ? '✓' : '○'} {text}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
              {error && <Notice tone="error">{error}</Notice>}
              <button className={submitButtonClass} disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : register
                  ? accountType === 'COMPANY'
                    ? 'Create company account ↗'
                    : 'Create employee account ↗'
                  : 'Sign in to workspace ↗'}
              </button>
            </form>
          )}

          {!created && (
            <div className="mt-7 text-center space-y-2 text-sm text-slate-500">
              <p>
                {register ? 'Already have an account?' : 'New to BizCard?'} {' '}
                <Link href={register ? '/login' : '/register'} className="font-semibold text-[#2d62a8] hover:underline">
                  {register ? 'Sign in' : 'Create an account'}
                </Link>
              </p>
            </div>
          )}
        </div>
        <p className="mt-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} BizCard · A better first impression.</p>
      </section>
    </main>
  );
}
