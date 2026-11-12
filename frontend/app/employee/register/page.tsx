'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function EmployeeRegisterPage() {
  const router = useRouter();
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/employee/register', { method: 'POST', body: JSON.stringify(values) });
      router.replace('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-form-side">
        <div className="auth-card my-auto w-full max-w-md self-center">
          <div className="mb-6 flex rounded-full bg-slate-100 p-1">
            <Link
              href="/register"
              className="flex-1 rounded-full py-2 text-center text-xs font-semibold text-slate-600 transition hover:text-black"
            >
              🏢 Company workspace
            </Link>
            <span className="flex-1 rounded-full bg-navy py-2 text-center text-xs font-semibold text-white shadow-xs">
              👤 Employee account
            </span>
          </div>
          <span className="section-chip">EMPLOYEE ACCOUNT</span>
          <h2>Build your professional card.</h2>
          <p className="auth-lead">Create your account, join an approved company once, then create cards whenever you need them.</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <label className="field-label">
              Your name
              <input
                className="input mt-2"
                required
                value={values.username}
                onChange={e => setValues({ ...values, username: e.target.value })}
              />
            </label>
            <label className="field-label">
              Email
              <input
                className="input mt-2"
                required
                type="email"
                value={values.email}
                onChange={e => setValues({ ...values, email: e.target.value })}
              />
            </label>
            <label className="field-label">
              Password
              <input
                className="input mt-2"
                required
                type="password"
                value={values.password}
                onChange={e => setValues({ ...values, password: e.target.value })}
              />
            </label>
            {error && <p className="notice-error">{error}</p>}
            <button className="btn-primary premium-submit w-full" disabled={busy}>
              {busy ? 'Creating…' : 'Create employee account'}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            Already have an account? <Link className="font-bold text-violet-700" href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
