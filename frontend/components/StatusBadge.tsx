const colors: Record<string, string> = {
  APPROVED: 'bg-[#eef3fa] text-[#28528d] border border-[#d8e3f3]',
  ACTIVE: 'bg-[#eef3fa] text-[#28528d] border border-[#d8e3f3]',
  COMPLETED: 'bg-[#eef3fa] text-[#28528d] border border-[#d8e3f3]',
  PENDING: 'bg-[#fef9c3] text-[#854d0e] border border-amber-200',
  PROCESSING: 'bg-[#eef3fa] text-[#1a2462] border border-[#b2c7e7]',
  PRE_APPROVED: 'bg-[#eef3fa] text-[#1a2462] border border-[#b2c7e7]',
  REJECTED: 'bg-[#fee2e2] text-[#991b1b] border border-rose-200',
  FAILED: 'bg-[#fee2e2] text-[#991b1b] border border-rose-200',
  REVOKED: 'bg-[#fee2e2] text-[#991b1b] border border-rose-200',
  INACTIVE: 'bg-slate-100 text-slate-700 border border-slate-200',
  SUSPENDED: 'bg-slate-100 text-slate-700 border border-slate-200',
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
    ? 'bg-[#2d62a8]'
    : isPending
    ? 'bg-[#d97706]'
    : isWarn
    ? 'bg-[#e20917]'
    : isInfo
    ? 'bg-[#3a70b8]'
    : 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-display text-3xs font-bold uppercase tracking-wider ${
        colors[value] || 'bg-slate-100 text-slate-700 border border-slate-200'
      }`}
    >
      <span className={`size-1.5 rounded-full ${dotColor}`} />
      {value}
    </span>
  );
}
