const colors: Record<string, string> = {
  APPROVED: 'bg-mint text-black',
  ACTIVE: 'bg-mint text-black',
  COMPLETED: 'bg-mint text-black',
  PENDING: 'bg-lemon text-black',
  PROCESSING: 'bg-lilac text-royal',
  PRE_APPROVED: 'bg-lilac text-royal',
  REJECTED: 'bg-blush text-black',
  FAILED: 'bg-blush text-black',
  REVOKED: 'bg-blush text-black',
  INACTIVE: 'bg-slate-100 text-slate-700',
  SUSPENDED: 'bg-slate-100 text-slate-700',
};

export interface StatusBadgeProps {
  value: string;
}

export default function StatusBadge({ value }: StatusBadgeProps) {
  const isGood = ['APPROVED', 'ACTIVE', 'COMPLETED'].includes(value);
  const isPending = value === 'PENDING';
  const isWarn = ['REJECTED', 'FAILED', 'REVOKED'].includes(value);
  const isInfo = ['PROCESSING', 'PRE_APPROVED'].includes(value);

  const dotColor = isGood
    ? 'bg-emerald-700'
    : isPending
    ? 'bg-amber-700'
    : isWarn
    ? 'bg-rose-700'
    : isInfo
    ? 'bg-royal'
    : 'bg-slate-500';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-semibold tracking-wide ${
        colors[value] || 'bg-slate-100 text-slate-700'
      }`}
    >
      <span className={`size-1.5 rounded-full ${dotColor}`} />
      {value}
    </span>
  );
}
