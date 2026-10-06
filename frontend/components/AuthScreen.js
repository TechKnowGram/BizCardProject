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
  const [capsLock, setCapsLock] = useState(false);
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
    } catch (requestError) {
      setError(requestError.status === 401 ? 'That email and password do not match. Please try again.' : requestError.message);
    } finally { setBusy(false); }
  }

  const fields = [
    ...(register ? [['username', 'Your name', 'Alex Morgan'], ['company_name', 'Company name', 'Studio North']] : []),
    ['email', 'Gmail address', 'yourname@gmail.com'],
    ['password', 'Password', register ? 'Create a strong password' : 'Enter your password'],
    ...(register ? [['confirm', 'Confirm password', 'Enter your password again']] : []),
  ];
  const passwordRules = [[values.password.length >= 8, '8+ characters'], [/[A-Z]/.test(values.password), 'Uppercase'], [/[a-z]/.test(values.password), 'Lowercase'], [/[0-9]/.test(values.password), 'Number'], [/[^A-Za-z0-9\s]/.test(values.password), 'Special']];
  const passwordScore = passwordRules.filter(([valid]) => valid).length;

  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" /><div className="auth-shape auth-shape-one">✦</div><div className="auth-shape auth-shape-two">⌁</div>
      <Link href="/" aria-label="Back to BizCard home"><Brand light /></Link>
      <div className="auth-story-copy">
        <span className="story-label">THOUGHTFUL CARDS. LASTING CONNECTIONS.</span>
        <h1>Make every<br />introduction<br /><em>feel like you.</em></h1>
        <p>One energetic workspace for your people, your brand and every first impression.</p>
        <div className="auth-preview"><CardPreview style="modern" name="Alex Morgan" company="STUDIO NORTH" /></div>
        <div className="auth-stats"><span><strong>3</strong>signature styles</span><span><strong>1-click</strong>approval flow</span><span><strong>PDF</strong>ready cards</span></div>
      </div>
      <p className="auth-footnote">Designed for teams. Made for real connections.</p>
    </section>

    <section className="auth-form-side"><div className="mb-8 lg:hidden"><Link href="/"><Brand /></Link></div><div className="auth-card my-auto w-full max-w-md self-center">
      <span className="section-chip">{register ? 'START YOUR WORKSPACE' : 'WELCOME BACK'}</span>
      <h2>{created ? 'You’re on the list.' : register ? 'Bring your team together.' : 'Good to see you again.'}</h2>
      <p className="auth-lead">{created ? 'Your company has been submitted for review. Here is what happens next.' : register ? 'Create your company account. We’ll review it before you start creating cards.' : 'Sign in to your workspace and pick up where you left off.'}</p>
      {created ? <div className="registration-success"><div><span>1</span><p><strong>Application submitted</strong><small>Your company details are safely recorded.</small></p></div><div><span>2</span><p><strong>Administrator review</strong><small>Complete your profile while approval is pending.</small></p></div><div><span>3</span><p><strong>Workspace unlocks</strong><small>Add employees and create verified cards.</small></p></div><Link className="btn-primary premium-submit" href="/login">Continue to sign in ↗</Link></div> : <form noValidate onSubmit={submit} className="mt-8 space-y-5">
        {fields.map(([key, label, placeholder]) => <div key={key}><label htmlFor={key} className="field-label">{label}</label><div className="relative"><input id={key} name={key} type={key === 'email' ? 'email' : ['password', 'confirm'].includes(key) ? (show ? 'text' : 'password') : 'text'} autoComplete={key === 'password' ? (register ? 'new-password' : 'current-password') : key === 'confirm' ? 'new-password' : key === 'email' ? 'email' : key === 'username' ? 'name' : 'organization'} maxLength={key === 'username' ? 50 : key === 'company_name' ? 150 : key === 'email' ? 255 : 128} className={`input ${errors[key] ? 'input-error' : ''} ${key === 'password' ? 'pr-16' : ''}`} placeholder={placeholder} value={values[key]} aria-invalid={Boolean(errors[key])} onKeyUp={event => key === 'password' && setCapsLock(event.getModifierState('CapsLock'))} onChange={event => { setValues({ ...values, [key]: event.target.value }); setErrors({ ...errors, [key]: undefined }); }} />{key === 'password' && <button type="button" className="absolute inset-y-0 right-4 text-xs font-semibold text-violet-700" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>}</div>{errors[key] && <p className="mt-2 text-xs text-red-600">{errors[key]}</p>}{key === 'password' && capsLock && <p className="caps-warning">Caps Lock is on</p>}{register && key === 'email' && <p className="field-hint">Use a valid address ending in @gmail.com.</p>}{register && key === 'password' && <><div className="password-strength"><i style={{ width: `${passwordScore * 20}%` }} /><span>{passwordScore < 3 ? 'Weak' : passwordScore < 5 ? 'Almost there' : 'Strong password'}</span></div><div className="password-rules">{passwordRules.map(([ok, text]) => <span key={text} className={ok ? 'valid' : ''}>{ok ? '✓' : '○'} {text}</span>)}</div></>}</div>)}
        {error && <p role="alert" className="notice-error">{error}</p>}<button className="btn-primary premium-submit w-full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create company account ↗' : 'Sign in to workspace ↗'}</button>
      </form>}
      {!created && <p className="mt-7 text-center text-sm text-slate-500">{register ? 'Already have a workspace?' : 'New to BizCard?'} <Link href={register ? '/login' : '/register'} className="font-bold text-violet-700">{register ? 'Sign in' : 'Register your company'}</Link></p>}
    </div><p className="mt-10 text-center text-xs text-slate-400">© {new Date().getFullYear()} BizCard · A better first impression.</p></section>
  </main>;
}
