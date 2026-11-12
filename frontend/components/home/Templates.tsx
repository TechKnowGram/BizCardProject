import { Icon } from './Iconify';
import { Shape } from './Shapes';
import { PillButton, display } from './parts';

type Look = 'classic' | 'modern' | 'minimal' | 'bd-id' | 'bd-star' | 'bd-sun';

const GREEN = '#006A4E';
const RED = '#F42A41';

const templates: { look: Look; label: string; note: string }[] = [
  { look: 'classic', label: 'Classic', note: 'Clean and formal, with a bold colour edge.' },
  { look: 'modern', label: 'Modern', note: 'Dark and bold with a bright accent.' },
  { look: 'minimal', label: 'Minimal', note: 'Quiet, airy and easy to read.' },
  { look: 'bd-id', label: 'Bangladesh ID', note: 'Green and red identity card, front only, with photo and QR.' },
  { look: 'bd-star', label: 'Star ID', note: 'Flag-green card with a bold star accent.' },
  { look: 'bd-sun', label: 'Sun ID', note: 'Warm card with a radiating sun, front only.' },
];

function StarSvg({ className, color }: { className?: string; color: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 48 : 20;
    return `${(50 + Math.cos(a) * r).toFixed(1)},${(50 + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return <svg viewBox="0 0 100 100" className={className} aria-hidden="true"><polygon points={pts} fill={color} /></svg>;
}

function SunSvg({ className, color }: { className?: string; color: string }) {
  return <svg viewBox="0 0 100 100" className={className} aria-hidden="true"><circle cx="50" cy="50" r="22" fill={color} />{Array.from({ length: 16 }, (_, i) => { const a = (i * Math.PI) / 8; return <line key={i} x1={50 + Math.cos(a) * 32} y1={50 + Math.sin(a) * 32} x2={50 + Math.cos(a) * 48} y2={50 + Math.sin(a) * 48} stroke={color} strokeWidth="5" strokeLinecap="round" />; })}</svg>;
}

// Generic identity-card designs in the Bangladesh flag palette. No official emblem or seal.
function IdCard({ look }: { look: 'bd-id' | 'bd-star' | 'bd-sun' }) {
  const base = 'relative aspect-7/4 overflow-hidden rounded-[28px] border-2 border-black bg-white';
  const person = look === 'bd-id' ? { name: 'Rahim Uddin', role: 'Senior Officer', id: 'ID 1987 4402' } : look === 'bd-star' ? { name: 'Nusrat Jahan', role: 'Field Coordinator', id: 'ID 2210 0917' } : { name: 'Tanvir Ahmed', role: 'Operations Lead', id: 'ID 3045 1288' };
  const header = look === 'bd-sun' ? RED : GREEN;
  return (
    <div className={base}>
      <div className="flex h-[24%] items-center gap-2 px-4 text-white" style={{ background: header }}>
        <span className="size-4 rounded-full" style={{ background: look === 'bd-sun' ? '#fff' : RED }} />
        <p className="font-display text-[10px] font-semibold tracking-2xl">NORTHWIND STUDIO</p>
        <span className="ml-auto font-body text-[9px] tracking-widest">IDENTITY CARD</span>
      </div>
      <span className="absolute inset-x-0 top-[24%] h-[2.5%]" style={{ background: look === 'bd-sun' ? GREEN : RED }} />
      {look === 'bd-star' && <StarSvg color={GREEN} className="absolute -right-4 bottom-1 size-28 opacity-15" />}
      {look === 'bd-sun' && <SunSvg color={RED} className="absolute -right-5 bottom-0 size-28 opacity-20" />}
      <span className="absolute top-[34%] left-4 h-[40%] w-[19%] border-2" style={{ borderColor: GREEN }} />
      <div className="absolute top-[34%] left-[29%] right-4">
        <p className="font-display text-lg leading-tight font-semibold">{person.name}</p>
        <p className="font-body text-xs text-black/65">{person.role}</p>
        <p className="mt-2 font-body text-[11px] font-semibold" style={{ color: GREEN }}>{person.id}</p>
      </div>
      <span className="absolute bottom-0 inset-x-0 h-[4%]" style={{ background: header }} />
    </div>
  );
}

// A small business card drawn with plain divs.
function TemplateCard({ look }: { look: Look }) {
  if (look === 'bd-id' || look === 'bd-star' || look === 'bd-sun') return <IdCard look={look} />;
  const base = 'relative flex aspect-7/4 flex-col justify-between overflow-hidden rounded-[28px] border-2 border-black p-6';
  if (look === 'classic') {
    return (
      <div className={`${base} bg-white`}>
        <Shape kind="burst" points={9} inner={0.55} fill="#4dffc8" className="absolute -top-14 -right-14 size-44" />
        <p className="relative font-display text-xs font-semibold tracking-2xl">NORTHWIND STUDIO</p>
        <div className="relative">
          <p className="font-display text-2xl leading-tight font-medium">Amina Rahman</p>
          <p className="mt-1 font-body text-sm text-black/60">Head of Design</p>
        </div>
      </div>
    );
  }
  if (look === 'modern') {
    return (
      <div className={`${base} bg-navy text-white`}>
        <Shape kind="flower" points={8} amp={0.14} fill="#fff700" className="absolute -right-10 -bottom-12 size-40" />
        <p className="relative font-display text-xs font-semibold tracking-2xl text-mint">NORTHWIND STUDIO</p>
        <div className="relative">
          <p className="font-display text-2xl leading-tight font-medium">Daniel Okafor</p>
          <p className="mt-1 font-body text-sm text-white/70">Sales Director</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} bg-blush`}>
      <Icon icon="ph:sparkle-fill" className="absolute top-5 right-5 size-7 text-royal" />
      <p className="relative font-display text-xs font-semibold tracking-2xl">NORTHWIND STUDIO</p>
      <div className="relative">
        <p className="font-display text-2xl leading-tight font-medium">Mei Tanaka</p>
        <p className="mt-1 font-body text-sm text-black/60">Product Engineer</p>
      </div>
    </div>
  );
}

export default function Templates() {
  return (
    <section id="templates" className="bg-white px-4 py-[110px] sm:px-6">
      <div className="mx-auto max-w-[1070px]">
        <h2 className={`${display} text-center text-[2.5rem] leading-[1.2] lg:text-[52px] lg:leading-[64px]`}>Start with a style, make it yours</h2>
        <p className="mx-auto mt-6 max-w-[560px] text-center font-body text-lg leading-[29px]">
          Pick one of the built-in looks, or describe your own and let the AI designer suggest options.
        </p>

        <div className="mt-[70px] grid gap-8 md:grid-cols-3">
          {templates.map((template) => (
            <div key={template.label} data-g="card" className="rounded-[40px] bg-mist p-6">
              <TemplateCard look={template.look} />
              <h3 className={`${display} mt-6 text-2xl`}>{template.label}</h3>
              <p className="mt-1 font-body text-[15px] leading-[23px] text-black/70">{template.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-[62px] text-center">
          <PillButton href="/register">Browse all templates</PillButton>
        </div>
      </div>
    </section>
  );
}
