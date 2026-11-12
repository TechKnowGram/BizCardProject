const styles = {
  APPROVED: { bg: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', dot: 'bg-emerald-500' },
  ACTIVE: { bg: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', dot: 'bg-emerald-500' },
  COMPLETED: { bg: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', dot: 'bg-emerald-500' },
  PRE_APPROVED: { bg: 'bg-teal-50 text-teal-800 ring-teal-600/20', dot: 'bg-teal-500' },
  PENDING: { bg: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  PROCESSING: { bg: 'bg-blue-50 text-blue-800 ring-blue-600/20', dot: 'bg-blue-500' },
  REJECTED: { bg: 'bg-red-50 text-red-800 ring-red-600/20', dot: 'bg-red-500' },
  REVOKED: { bg: 'bg-red-50 text-red-800 ring-red-600/20', dot: 'bg-red-500' },
  FAILED: { bg: 'bg-red-50 text-red-800 ring-red-600/20', dot: 'bg-red-500' },
  SUSPENDED: { bg: 'bg-slate-100 text-slate-700 ring-slate-400/20', dot: 'bg-slate-400' },
  INACTIVE: { bg: 'bg-slate-100 text-slate-700 ring-slate-400/20', dot: 'bg-slate-400' },
};

export default function StatusBadge({ value }) {
  const current = styles[value] || { bg: 'bg-slate-100 text-slate-700 ring-slate-400/20', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${current.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      <span>{value}</span>
    </span>
  );
}
