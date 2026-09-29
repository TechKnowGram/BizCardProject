export default function Brand({ light = false }) {
  return <div className={`flex items-center gap-3 text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
    <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 text-lg text-white shadow-sm">B.</span>
    BizCard<span className="ml-1 text-xs font-normal tracking-normal opacity-60">WORKSPACE</span>
  </div>;
}
