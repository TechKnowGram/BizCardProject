'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Brand from './Brand';
import CardPreview from './CardPreview';
import { api } from '../lib/api';
import { validateAuth } from '../lib/validation';

export default function AuthScreen({ register = false }) {
  const router = useRouter();
  const [values, setValues] = useState({ username: '', company_name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const invalid = validateAuth(values, register);
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) return;
    setBusy(true);
    try {
      if (register) {
        await api('/auth/register', { method: 'POST', body: JSON.stringify({ username: values.username.trim(), company_name: values.company_name.trim(), email: values.email.trim(), password: values.password }) });
        setCreated(true);
      } else {
        const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: values.email.trim(), password: values.password }) });
        sessionStorage.setItem('bizcard_token', data.access_token); router.replace('/dashboard');
      }
    } catch (requestError) { setError(requestError.status === 401 ? 'That email and password do not match. Please try again.' : requestError.message); }
    finally { setBusy(false); }
  }

  const fields = [
    ...(register ? [['username', 'Your name', 'Alex Morgan'], ['company_name', 'Company name', 'Studio North']] : []),
    ['email', 'Gmail address', register ? 'yourname@gmail.com' : 'yourname@gmail.com'],
    ['password', 'Password', register ? 'Create a strong password' : 'Enter your password'],
    ...(register ? [['confirm', 'Confirm password', 'Enter your password again']] : []),
  ];
  const passwordRules = [[values.password.length >= 8, '8+ characters'], [/[A-Z]/.test(values.password), 'Uppercase'], [/[a-z]/.test(values.password), 'Lowercase'], [/[0-9]/.test(values.password), 'Number'], [/[^A-Za-z0-9\s]/.test(values.password), 'Special']];

  return <main className="auth-page">
    <section className="auth-story"><div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" /><Brand light /><div className="relative z-10 my-auto py-14"><span className="story-label">THOUGHTFUL CARDS. LASTING CONNECTIONS.</span><h1 className="mt-7 max-w-lg text-5xl leading-[1.08] font-medium tracking-[-.055em] xl:text-6xl">Make every<br />introduction<br /><span className="text-lime-300">feel like you.</span></h1><p className="mt-7 max-w-sm text-sm leading-7 text-slate-300">One refined workspace for your people, your brand, and every first impression.</p><div className="auth-preview mt-12 max-w-sm"><CardPreview style="modern" name="Alex Morgan" company="STUDIO NORTH" /></div><div className="mt-12 flex gap-8 text-xs text-slate-400"><span><strong className="block text-lg text-white">3</strong>signature styles</span><span><strong className="block text-lg text-white">1-click</strong>approval flow</span><span><strong className="block text-lg text-white">PDF</strong>ready cards</span></div></div><p className="relative z-10 text-xs text-slate-400">Designed for teams. Made for real connections.</p></section>
    <section className="auth-form-side"><div className="mb-8 lg:hidden"><Brand /></div><div className="auth-card my-auto w-full max-w-md self-center">
      <p className="eyebrow">{register ? 'START YOUR WORKSPACE' : 'WELCOME TO BIZCARD'}</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.04em]">{created ? 'You’re on the list.' : register ? 'Bring your team together.' : 'Good to see you again.'}</h2>
      <p className="mt-4 text-sm leading-6 text-slate-500">{created ? 'Your company has been submitted for review. Sign in to check its approval status.' : register ? 'Create your company account. We’ll review it before you start creating cards.' : 'Sign in to your workspace and pick up where you left off.'}</p>
      {created ? <Link className="btn-primary mt-8 inline-flex" href="/login">Continue to sign in →</Link> : <form noValidate onSubmit={submit} className="mt-8 space-y-5">
        {fields.map(([key, label, placeholder]) => <div key={key}><label htmlFor={key} className="mb-2 block text-sm font-semibold">{label}</label><div className="relative"><input id={key} name={key} type={key === 'email' ? 'email' : ['password', 'confirm'].includes(key) ? (show ? 'text' : 'password') : 'text'} autoComplete={key === 'password' ? (register ? 'new-password' : 'current-password') : key === 'confirm' ? 'new-password' : key === 'email' ? 'email' : key === 'username' ? 'name' : 'organization'} maxLength={key === 'username' ? 50 : key === 'company_name' ? 150 : key === 'email' ? 255 : 128} className={`input ${errors[key] ? 'input-error' : ''} ${key === 'password' ? 'pr-16' : ''}`} placeholder={placeholder} value={values[key]} aria-invalid={Boolean(errors[key])} onChange={event => { setValues({ ...values, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); }} />{key === 'password' && <button type="button" className="absolute inset-y-0 right-4 text-xs font-semibold text-slate-500" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>}</div>{errors[key] && <p className="mt-2 text-xs text-red-600">{errors[key]}</p>}{register && key === 'password' && <div className="password-rules">{passwordRules.map(([ok, text]) => <span key={text} className={ok ? 'valid' : ''}>{ok ? '✓' : '○'} {text}</span>)}</div>}</div>)}
        {error && <p role="alert" className="notice-error">{error}</p>}<button className="btn-primary premium-submit w-full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create company account →' : 'Sign in to workspace →'}</button>
      </form>}
      {!created && <p className="mt-7 text-center text-sm text-slate-500">{register ? 'Already have a workspace?' : 'New to BizCard?'} <Link href={register ? '/login' : '/register'} className="font-semibold text-indigo-700">{register ? 'Sign in' : 'Register your company'}</Link></p>}
    </div><p className="mt-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} BizCard · A better first impression.</p></section>
  </main>;
}
