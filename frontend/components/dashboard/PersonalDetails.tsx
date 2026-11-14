'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button, Input, Notice } from '@/components/ui';
import { useUpdateUser } from '@/components/dashboard/RolePage';
import ProfilePicture from '@/components/dashboard/ProfilePicture';
import { api } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

function Row({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <div className={`grid gap-1 px-6 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6 ${last ? '' : 'border-b border-slate-100'}`}>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 text-sm font-medium break-words text-navy-900">{children}</dd>
    </div>
  );
}

/**
 * The signed-in person's own name and email, with an Edit button. Changing the sign-in email asks for the
 * current password. After saving, the dashboard's header and menu show the new name at once.
 */
export default function PersonalDetails({ user, accountType = 'Employee' }: { user: Pick<User, 'username' | 'email' | 'has_avatar' | 'avatar_version'>; accountType?: string }) {
  const updateUser = useUpdateUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const emailChanged = email.trim().toLowerCase() !== (user.email || '').toLowerCase();

  function start() {
    setName(user.username || '');
    setEmail(user.email || '');
    setPassword('');
    setError('');
    setSaved('');
    setEditing(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      if (name.trim() !== user.username) body.username = name.trim();
      if (emailChanged) { body.email = email.trim(); body.current_password = password; }
      if (!Object.keys(body).length) { setEditing(false); return; }
      const updated = await api<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) });
      updateUser(updated);
      setSaved('Your details were updated.');
      setEditing(false);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div>
        {saved && <div className="border-b border-slate-100 px-6 py-3"><Notice tone="success">{saved}</Notice></div>}
        <div className="border-b border-slate-100 px-6 py-5"><ProfilePicture user={user} /></div>
        <dl>
          <Row label="Full name">{user.username || '—'}</Row>
          <Row label="Email">{user.email || '—'}</Row>
          <Row label="Account type" last>{accountType}</Row>
        </dl>
        <div className="flex justify-end border-t border-slate-100 px-6 py-3">
          <Button variant="secondary" onClick={start}>Edit details</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-5 px-6 py-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
          <Input required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
          <Input required type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
      </div>
      {emailChanged && (
        <label className="block max-w-sm">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Current password</span>
          <Input required type="password" maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <span className="mt-1.5 block text-xs text-slate-500">Needed to change the email you sign in with.</span>
        </label>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="quiet" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
      </div>
    </form>
  );
}
