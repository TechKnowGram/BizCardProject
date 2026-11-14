'use client';

import ProtectedImage from '@/components/ui/ProtectedImage';
import { cx } from '@/components/ui';

export function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export interface UserAvatarProps {
  name: string;
  /** Changes whenever the picture does; undefined or null means no picture, so the initials are shown. */
  version?: number | null;
  className?: string;
  /** Classes for the initials text, e.g. its size. */
  textClassName?: string;
}

/** A round profile picture, or the person's initials on a colour when they have none. */
export default function UserAvatar({ name, version, className, textClassName = 'text-xs' }: UserAvatarProps) {
  const hasPicture = version !== undefined && version !== null;
  return (
    <span className={cx('relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-600 to-brand-400 font-semibold text-white', textClassName, className)}>
      <span aria-hidden={hasPicture}>{initialsOf(name)}</span>
      {hasPicture && (
        <ProtectedImage path={`/auth/me/avatar?v=${version}`} alt={`${name} profile picture`} className="absolute inset-0 size-full object-cover" />
      )}
    </span>
  );
}
