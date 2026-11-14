'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import UserAvatar from '@/components/ui/UserAvatar';
import { buttonClass, cx } from '@/components/ui';
import { useUpdateUser } from '@/components/dashboard/RolePage';
import { api } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import type { User } from '@/lib/types';

const MAX_BYTES = 2_000_000;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Upload, replace or remove the signed-in person's profile picture. The page updates as soon as it is saved. */
export default function ProfilePicture({ user }: { user: Pick<User, 'username' | 'has_avatar' | 'avatar_version'> }) {
  const updateUser = useUpdateUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasPicture = Boolean(user.has_avatar);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) { setError('Choose a JPG, PNG or WebP image.'); return; }
    if (file.size > MAX_BYTES) { setError('That picture is larger than 2 MB. Choose a smaller one.'); return; }
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      updateUser(await api<User>('/auth/me/avatar', { method: 'POST', body: form }));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      updateUser(await api<User>('/auth/me/avatar', { method: 'DELETE' }));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <UserAvatar name={user.username} version={user.has_avatar ? user.avatar_version ?? 0 : null} className="size-20" textClassName="text-2xl" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <label className={cx(buttonClass('secondary', 'cursor-pointer'), busy && 'pointer-events-none opacity-60')}>
            {busy ? 'Saving…' : hasPicture ? 'Change picture' : 'Upload picture'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy} onChange={choose} />
          </label>
          {hasPicture && (
            <button type="button" onClick={remove} disabled={busy} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60">
              Remove
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP, up to 2 MB. A square picture works best.</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
