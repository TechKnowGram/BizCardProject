import { cx } from '../ui';

type Look = 'classic' | 'modern' | 'minimal';

const people: Record<Look, { name: string; role: string; email: string; phone: string }> = {
  classic: { name: 'Farhana Akter', role: 'Head of Finance', email: 'farhana@northwind.co', phone: '+880 1711 204 518' },
  modern: { name: 'Tanvir Hasan', role: 'Sales Manager', email: 'tanvir@northwind.co', phone: '+880 1819 330 742' },
  minimal: { name: 'Nusrat Jahan', role: 'Product Designer', email: 'nusrat@northwind.co', phone: '+880 1552 918 064' },
};

// Static QR-like pattern; purely decorative.
const qr = '1110111101110111011100101000101111010110101101111'.split('');

function QrMark({ dark }: { dark: boolean }) {
  return (
    <span className={cx('grid w-[17%] shrink-0 grid-cols-7 gap-px rounded-sm p-[3px]', dark ? 'bg-white' : 'bg-white ring-1 ring-slate-200')}>
      {qr.map((bit, i) => (
        <span key={i} className={cx('aspect-square', bit === '1' ? 'bg-navy-900' : 'bg-transparent')} />
      ))}
    </span>
  );
}

/** A business card drawn with plain markup, used on the marketing pages. */
export default function CardMock({ look = 'classic', className }: { look?: Look; className?: string }) {
  const person = people[look];
  const dark = look === 'modern';
  return (
    <div
      className={cx(
        'relative flex aspect-7/4 w-full flex-col justify-between overflow-hidden rounded-md p-[6%] shadow-lg',
        look === 'classic' && 'border-t-[5px] border-brand-600 bg-white text-navy-900',
        look === 'modern' && 'bg-navy-900 text-white',
        look === 'minimal' && 'bg-[#f6f4ef] text-slate-800',
        className,
      )}
    >
      {look === 'modern' && <span className="absolute inset-y-0 left-0 w-[3%] bg-brand-500" />}
      <div className="flex items-center gap-2">
        <span className={cx('grid size-5 place-items-center rounded-[3px] text-[9px] font-bold', dark ? 'bg-white text-navy-900' : 'bg-navy-900 text-white')}>N</span>
        <span className={cx('text-[10px] font-semibold tracking-[0.14em]', dark ? 'text-brand-200' : 'text-slate-500')}>NORTHWIND</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] leading-tight font-semibold sm:text-base">{person.name}</p>
          <p className={cx('mt-0.5 text-[11px]', dark ? 'text-brand-200' : 'text-brand-600')}>{person.role}</p>
          <div className={cx('mt-2.5 space-y-0.5 text-[10px]', dark ? 'text-slate-300' : 'text-slate-500')}>
            <p className="truncate">{person.email}</p>
            <p>{person.phone}</p>
          </div>
        </div>
        <QrMark dark={dark} />
      </div>
    </div>
  );
}
