/** Small display helpers shared by the platform admin pages. */

/** "12 Nov 2026" */
export function shortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "12 Nov 2026, 3:40 PM" */
export function dateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** How long something has been waiting: "Today", "1 day", "12 days". */
export function waitingFor(value?: string | null): string {
  if (!value) return '—';
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return '—';
  const days = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  return days === 1 ? '1 day' : `${days} days`;
}

/** "Just now", "5 min ago", "3 hours ago", "Yesterday", then a short date. */
export function relativeTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (hours < 48) return 'Yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** COMPANY_APPROVED -> "Company approved" */
export function sentenceCase(value?: string | null): string {
  if (!value) return '';
  const text = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "৳1,250" */
export function money(value?: number | null): string {
  return `৳${(value ?? 0).toLocaleString()}`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

export const roleLabel: Record<string, string> = {
  SYSTEM_ADMIN: 'Platform admin',
  COMPANY_ADMIN: 'Company admin',
  EMPLOYEE: 'Employee',
};

export const payerLabel: Record<string, string> = {
  COMPANY: 'Company',
  INDIVIDUAL: 'Employee',
};
