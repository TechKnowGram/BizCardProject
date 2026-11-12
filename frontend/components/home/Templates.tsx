import { Icon } from './Iconify';
import { Shape } from './Shapes';
import { PillButton, display } from './parts';

type Look = 'classic' | 'modern' | 'minimal';

const templates: { look: Look; label: string; note: string }[] = [
  { look: 'classic', label: 'Classic', note: 'Clean and formal, with a bold colour edge.' },
  { look: 'modern', label: 'Modern', note: 'Dark and bold with a bright accent.' },
  { look: 'minimal', label: 'Minimal', note: 'Quiet, airy and easy to read.' },
];

// A small business card drawn with plain divs.
function TemplateCard({ look }: { look: Look }) {
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
