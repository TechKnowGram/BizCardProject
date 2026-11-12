const colors: Record<string, string> = {
  APPROVED: 'bg-mint text-black',
  COMPLETED: 'bg-mint text-black',
  PENDING: 'bg-lemon text-black',
  PROCESSING: 'bg-lilac text-royal',
  REJECTED: 'bg-blush text-black',
  FAILED: 'bg-blush text-black',
  SUSPENDED: 'bg-slate-100 text-slate-700',
};

export interface StatusBadgeProps {
  value: string;
}

export default function StatusBadge({ value }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-full px-3 py-1 font-display text-xs font-medium ${colors[value] || 'bg-slate-100 text-slate-700'}`}>{value}</span>;
}
