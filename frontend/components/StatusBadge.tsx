const tones: Record<string, [string, string]> = {
  // [badge colours, dot colour]
  APPROVED: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  ACTIVE: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  COMPLETED: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  PAID: ['bg-emerald-50 text-emerald-700 ring-emerald-200', 'bg-emerald-500'],
  PENDING: ['bg-amber-50 text-amber-800 ring-amber-200', 'bg-amber-500'],
  PROCESSING: ['bg-brand-50 text-brand-700 ring-brand-100', 'bg-brand-600'],
  PRE_APPROVED: ['bg-brand-50 text-brand-700 ring-brand-100', 'bg-brand-600'],
  REJECTED: ['bg-red-50 text-red-700 ring-red-200', 'bg-red-500'],
  FAILED: ['bg-red-50 text-red-700 ring-red-200', 'bg-red-500'],
  REVOKED: ['bg-red-50 text-red-700 ring-red-200', 'bg-red-500'],
  SUSPENDED: ['bg-slate-100 text-slate-700 ring-slate-200', 'bg-slate-400'],
  INACTIVE: ['bg-slate-100 text-slate-700 ring-slate-200', 'bg-slate-400'],
  DEACTIVATED: ['bg-slate-100 text-slate-700 ring-slate-200', 'bg-slate-400'],
  SHARED: ['bg-brand-50 text-brand-700 ring-brand-100', 'bg-brand-600'],
  PRIVATE: ['bg-slate-100 text-slate-700 ring-slate-200', 'bg-slate-400'],
};

const fallback: [string, string] = ['bg-slate-100 text-slate-700 ring-slate-200', 'bg-slate-400'];

export interface StatusBadgeProps {
  /** Missing values render nothing rather than crashing the page. */
  value?: string | null;
}

/** Turns e.g. PRE_APPROVED into "Pre approved". */
function readable(value: string) {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function StatusBadge({ value }: StatusBadgeProps) {
  if (!value) return null;
  const [tone, dot] = tones[value] ?? fallback;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${tone}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {readable(value)}
    </span>
  );
}
