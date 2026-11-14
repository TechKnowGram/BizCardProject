import { Icon } from '@/components/home/Iconify';
import { cx } from '@/components/ui';

type Look = 'classic' | 'modern' | 'minimal';

const people: Record<Look, { name: string; role: string; email: string; phone: string; web: string; address: string }> = {
  classic: { name: 'Farhana Akter', role: 'Head of Finance', email: 'farhana.akter@northwind.co', phone: '+880 1711 204 518', web: 'northwind.co', address: 'Gulshan 2, Dhaka 1212' },
  modern: { name: 'Tanvir Hasan', role: 'Sales Manager', email: 'tanvir.hasan@northwind.co', phone: '+880 1819 330 742', web: 'northwind.co', address: 'Banani, Dhaka 1213' },
  minimal: { name: 'Nusrat Jahan', role: 'Product Designer', email: 'nusrat.jahan@northwind.co', phone: '+880 1552 918 064', web: 'northwind.co', address: 'Dhanmondi, Dhaka 1209' },
};

/* ---------- a believable 21×21 QR code (decorative) ---------- */

const QR_SIZE = 21;
const qrCells: boolean[][] = (() => {
  // Deterministic pseudo-random fill so server and client render the same code.
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const grid = Array.from({ length: QR_SIZE }, () => Array.from({ length: QR_SIZE }, () => rand() > 0.52));
  const finder = (r0: number, c0: number) => {
    for (let r = -1; r <= 7; r += 1) for (let c = -1; c <= 7; c += 1) {
      const rr = r0 + r; const cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= QR_SIZE || cc >= QR_SIZE) continue;
      const ring = r === -1 || c === -1 || r === 7 || c === 7;
      const outer = r === 0 || c === 0 || r === 6 || c === 6;
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      grid[rr][cc] = !ring && (outer || core);
    }
  };
  finder(0, 0); finder(0, QR_SIZE - 7); finder(QR_SIZE - 7, 0);
  for (let i = 8; i < QR_SIZE - 8; i += 1) { grid[6][i] = i % 2 === 0; grid[i][6] = i % 2 === 0; }
  return grid;
})();

export function QrCode({ className, color = '#0f172a' }: { className?: string; color?: string }) {
  return (
    <svg viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`} className={className} aria-hidden="true" shapeRendering="crispEdges">
      <rect x="-1" y="-1" width={QR_SIZE + 2} height={QR_SIZE + 2} fill="#ffffff" />
      {qrCells.flatMap((row, r) => row.map((on, c) => (on ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill={color} /> : null)))}
    </svg>
  );
}

/* ---------- company mark ---------- */

function NorthwindMark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-[0.45em]">
      <svg viewBox="0 0 24 24" className="size-[1.6em]" aria-hidden="true">
        <rect width="24" height="24" rx="5" fill={light ? '#ffffff' : '#101845'} />
        <path d="M7 17V7l10 10V7" fill="none" stroke={light ? '#101845' : '#ffffff'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-none">
        <span className={cx('block text-[0.95em] font-bold tracking-[0.08em]', light ? 'text-white' : 'text-navy-900')}>NORTHWIND</span>
        <span className={cx('mt-[0.2em] block text-[0.55em] tracking-[0.18em]', light ? 'text-brand-200' : 'text-slate-500')}>TRADING LTD.</span>
      </span>
    </span>
  );
}

/** Layered shadow that reads like card stock lying on a surface. */
const paperShadow = 'shadow-[0_1px_1px_rgba(8,13,38,.08),0_8px_16px_-6px_rgba(8,13,38,.25),0_28px_48px_-18px_rgba(8,13,38,.45)]';

/**
 * A business card drawn with markup, sized by its width (all text scales with it via container units).
 * Used on the marketing pages only; real templates render through CardPreview.
 */
export default function CardMock({ look = 'classic', side = 'front', className }: { look?: Look; side?: 'front' | 'back'; className?: string }) {
  const p = people[look];
  const dark = look === 'modern';

  if (side === 'back') {
    return (
      <div className={cx('relative aspect-7/4 w-full overflow-hidden rounded-[0.6rem] bg-navy-900 [container-type:inline-size]', paperShadow, className)}>
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(50,103,176,.35),transparent_60%)]" />
        <div className="relative grid h-full place-items-center text-[4.2cqw]">
          <NorthwindMark light />
        </div>
        <p className="absolute inset-x-0 bottom-[8%] text-center text-[2.4cqw] tracking-[0.2em] text-brand-200">NORTHWIND.CO</p>
      </div>
    );
  }

  const ink = dark ? 'text-white' : look === 'minimal' ? 'text-slate-800' : 'text-navy-900';
  const muted = dark ? 'text-slate-300' : 'text-slate-500';
  const accent = dark ? 'text-brand-200' : 'text-brand-600';

  const rows = [
    { icon: 'lucide:phone', text: p.phone },
    { icon: 'lucide:mail', text: p.email },
    { icon: 'lucide:globe', text: p.web },
    { icon: 'lucide:map-pin', text: p.address },
  ];

  return (
    <div
      className={cx(
        'relative aspect-7/4 w-full overflow-hidden rounded-[0.6rem] [container-type:inline-size]',
        look === 'classic' && 'bg-white',
        look === 'modern' && 'bg-navy-900',
        look === 'minimal' && 'bg-[#f6f4ef]',
        paperShadow,
        className,
      )}
    >
      {/* faint paper grain */}
      <div aria-hidden="true" className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(15,23,42,.05)_1px,transparent_1px)] [background-size:3px_3px]" />
      {look === 'classic' && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2.2%] bg-brand-600" />}
      {look === 'modern' && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2.2%] bg-brand-400" />}

      <div className="relative flex h-full flex-col justify-between px-[8%] py-[7%] text-[3.6cqw]">
        <div className="flex items-start justify-between">
          <span className={cx('text-[3.4cqw]', ink)}><NorthwindMark light={dark} /></span>
        </div>

        <div className="flex items-end justify-between gap-[4%]">
          <div className="min-w-0">
            <p className={cx('truncate text-[6.4cqw] leading-tight font-semibold tracking-tight', ink)}>{p.name}</p>
            <p className={cx('mt-[1%] text-[3.4cqw] font-medium', accent)}>{p.role}</p>
            <span className={cx('my-[4%] block h-px w-[14cqw]', dark ? 'bg-white/25' : 'bg-slate-300')} />
            <ul className={cx('space-y-[0.9cqw] text-[2.75cqw]', muted)}>
              {rows.map((r) => (
                <li key={r.icon} className="flex items-center gap-[1.6cqw] whitespace-nowrap">
                  <Icon icon={r.icon} className={cx('size-[2.9cqw] shrink-0', accent)} />
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="w-[21%] shrink-0 text-center">
            <div className="rounded-[0.6cqw] bg-white p-[1.2cqw] shadow-[0_0_0_1px_rgba(15,23,42,.08)]">
              <QrCode className="block w-full" />
            </div>
            <span className={cx('mt-[1.2cqw] block text-[1.9cqw] tracking-[0.14em]', muted)}>SCAN TO VERIFY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
