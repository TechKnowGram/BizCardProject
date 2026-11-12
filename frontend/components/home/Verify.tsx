import { Icon } from './Iconify';
import { Rays, Shape } from './Shapes';
import { PillButton, display } from './parts';

// 1 = dark square, 0 = empty. Just enough to look like a QR code.
const qr = [
  1, 1, 1, 0, 1, 1, 1,
  1, 0, 1, 1, 1, 0, 1,
  1, 1, 1, 0, 1, 1, 1,
  0, 1, 0, 1, 0, 0, 0,
  1, 0, 1, 1, 1, 0, 1,
  1, 1, 0, 0, 1, 1, 0,
  1, 0, 1, 1, 0, 1, 1,
];

export default function Verify() {
  return (
    <section className="relative overflow-hidden bg-navy px-4 py-[110px] sm:px-6">
      <div className="mx-auto grid max-w-[1070px] items-center gap-16 lg:grid-cols-2">
        <div className="text-white">
          <h2 className={`${display} text-[2.5rem] leading-[1.2] lg:text-[52px] lg:leading-[64px]`}>Every card can prove it is real.</h2>
          <p className="mt-10 max-w-[505px] font-body text-lg leading-[29px]">
            Each card has its own QR code. Scan it and land on a page that shows the person&apos;s name, role and company, and whether the card is still valid.
          </p>
          <ul className="mt-8 grid gap-4 font-body text-lg">
            {['Unique code on every card', 'Instantly revoked when someone leaves', 'Only public details are ever shown'].map((point) => (
              <li key={point} className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-black"><Icon icon="lucide:check" className="size-4" /></span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-10"><PillButton href="/register" tone="mint" className="h-[56px] px-7">Create your workspace</PillButton></div>
        </div>

        <div className="relative mx-auto h-[360px] w-full max-w-[460px]">
          <Rays count={14} color="#4dffc8" width={3} className="absolute -right-8 -bottom-8 size-[200px]" />
          <Shape kind="burst" points={12} inner={0.78} fill="#fff700" className="absolute -top-6 -left-4 size-[120px]" />
          <div data-g="card" className="absolute inset-x-0 top-[40px] flex items-center gap-6 rounded-[40px] border-2 border-black bg-white p-7 text-black">
            <div className="grid shrink-0 grid-cols-7 gap-0.5 rounded-[14px] border border-black/20 bg-white p-3">
              {qr.map((filled, index) => (
                <span key={index} className={`size-3.5 ${filled ? 'bg-black' : 'bg-white'}`} />
              ))}
            </div>
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 font-display text-2xs font-semibold tracking-wider">
                <Icon icon="lucide:check" className="size-3" /> VALID CARD
              </p>
              <p className="mt-3 font-display text-2xl font-medium leading-tight">Amina Rahman</p>
              <p className="mt-1 font-body text-sm text-black/60">Head of Design, Northwind Studio</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
