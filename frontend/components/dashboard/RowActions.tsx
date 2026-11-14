import type { ReactNode } from 'react';

const TONE = {
  blue: 'text-brand-600 hover:bg-brand-600/10 hover:border-brand-600/30',
  amber: 'text-amber-600 hover:bg-amber-100 hover:border-amber-300',
  emerald: 'text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300',
  rose: 'text-rose-600 hover:bg-rose-100 hover:border-rose-300',
} as const;

/** Small square icon button for the action column of a table row. */
export function ActionBtn({ label, tone, onClick, disabled, children }: { label: string; tone: keyof typeof TONE; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${TONE[tone]}`}
    >
      {children}
    </button>
  );
}

/** Same look as ActionBtn, but a label wrapping a hidden file input: click it to choose a file. */
export function ActionFile({ label, tone, accept, onFile, children }: { label: string; tone: keyof typeof TONE; accept: string; onFile: (file?: File) => void; children: ReactNode }) {
  return (
    <label
      title={label}
      className={`flex size-7 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white transition-colors focus-within:outline-2 focus-within:outline-brand-600 ${TONE[tone]}`}
    >
      <span className="sr-only">{label}</span>
      {children}
      <input
        className="sr-only"
        type="file"
        accept={accept}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </label>
  );
}
