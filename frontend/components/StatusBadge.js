const colors = {
  APPROVED: 'bg-emerald-50 text-emerald-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  PROCESSING: 'bg-blue-50 text-blue-700',
  REJECTED: 'bg-red-50 text-red-700',
  FAILED: 'bg-red-50 text-red-700',
  SUSPENDED: 'bg-slate-100 text-slate-700',
};

export default function StatusBadge({ value }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value] || 'bg-slate-100 text-slate-700'}`}>{value}</span>;
}
