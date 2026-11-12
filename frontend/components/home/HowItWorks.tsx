import { Icon } from './Iconify';
import { Shape } from './Shapes';
import { display } from './parts';

const steps = [
  { number: '01', icon: 'lucide:building-2', title: 'Register your company', text: 'Sign up with your work details. Our team reviews every company before it goes live.', shape: { kind: 'burst', fill: '#4dffc8', points: 10, inner: 0.7 } },
  { number: '02', icon: 'lucide:users', title: 'Add your people', text: 'Type employees in one by one, or drop in a CSV and import the whole team in a minute.', shape: { kind: 'blob', fill: '#fff700', points: 3, inner: 0.7 } },
  { number: '03', icon: 'lucide:palette', title: 'Pick a design', text: 'Choose a template or describe a look to the AI designer, then select the employees.', shape: { kind: 'flower', fill: '#ffd0dc', points: 7, inner: 0.7 } },
  { number: '04', icon: 'lucide:file-down', title: 'Download the PDFs', text: 'Once approved, every card is generated for you with a QR code that proves it is real.', shape: { kind: 'burst', fill: '#4a1ff2', points: 8, inner: 0.55 } },
] as const;

export default function HowItWorks() {
  return (
    <section id="how" className="bg-lilac px-4 py-[110px] sm:px-6">
      <div className="mx-auto max-w-[1070px]">
        <h2 className={`${display} mx-auto max-w-[760px] text-center text-[2.5rem] leading-[1.2] lg:text-[52px] lg:leading-[64px]`}>
          From sign-up to printed cards in four steps
        </h2>
        <p className="mx-auto mt-6 max-w-[520px] text-center font-body text-lg leading-[29px]">
          No design tools, no emailing files around. Everything happens in one place.
        </p>

        <ol className="mt-[70px] grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.number} data-g="card" className="rounded-[40px] bg-white p-8">
              <div className="relative grid size-[96px] place-items-center">
                <Shape kind={step.shape.kind} points={step.shape.points} inner={step.shape.inner} amp={0.14} fill={step.shape.fill} className="absolute inset-0" />
                <Icon icon={step.icon} className={`relative size-8 ${step.shape.fill === '#4a1ff2' ? 'text-white' : 'text-black'}`} />
              </div>
              <p className="mt-7 font-display text-sm font-medium text-black/40">{step.number}</p>
              <h3 className={`${display} mt-1 text-2xl leading-[1.25]`}>{step.title}</h3>
              <p className="mt-3 font-body text-[15px] leading-[23px]">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
