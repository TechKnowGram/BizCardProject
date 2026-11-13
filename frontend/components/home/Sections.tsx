import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './Iconify';
import CardMock from './CardMock';
import Reveal from './Reveal';
import { facts, faqs, features, reasons, roles, stats, steps, templates, testimonials } from './content';
import { cx } from '../ui';

/* ---------- small shared pieces ---------- */

function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('mx-auto w-full max-w-7xl px-5 sm:px-8', className)}>{children}</div>;
}

function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div className={cx('flex items-center gap-3 text-xs font-semibold uppercase sm:text-[0.8125rem]', dark ? 'text-brand-300' : 'text-iris-500')}>
      <span className="h-0.5 w-8 bg-plum-500" />
      {children}
    </div>
  );
}

function SectionHead({ eyebrow, title, text, dark = false, center = false }: { eyebrow: string; title: string; text?: string; dark?: boolean; center?: boolean }) {
  return (
    <Reveal className={cx('max-w-3xl', center && 'mx-auto text-center [&>div:first-child]:justify-center')}>
      <Eyebrow dark={dark}>{eyebrow}</Eyebrow>
      <h2 className={cx('type-h2 mt-4 text-balance', dark ? 'text-white' : 'text-navy-900')}>{title}</h2>
      {text && <p className={cx('mt-4 text-base leading-relaxed', dark ? 'text-slate-300' : 'text-slate-600')}>{text}</p>}
    </Reveal>
  );
}

const primaryBtn = 'inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700';

/* ---------- hero ---------- */

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 pt-32 pb-40 sm:pt-36 lg:pt-40 lg:pb-48">
      {/* faint grid, fades out towards the bottom */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      <div aria-hidden="true" className="absolute top-0 right-0 -z-10 h-[520px] w-[620px] bg-[radial-gradient(closest-side,rgba(50,103,176,.35),transparent)]" />

      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
        <Reveal>
          <Eyebrow dark>Business cards for companies</Eyebrow>
          <h1 className="type-display mt-5 max-w-[20ch] text-white">
            Cards for your whole team, approved and ready to print.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Keep your staff list in one place, agree on a design once, and send approved PDFs straight to your printer. Each card carries a QR code that proves it is genuine.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/register/company" className={primaryBtn}>
              Register your company <Icon icon="lucide:arrow-right" className="size-4" />
            </Link>
            <Link href="/employee/register" className="inline-flex items-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              I&apos;m an employee
            </Link>
          </div>
        </Reveal>

        <Reveal delay={150} className="relative mx-auto w-full max-w-[500px] [perspective:1600px]">
          {/* back of the card, lying behind */}
          <CardMock side="back" className="absolute top-0 right-0 w-[74%] [transform:rotate(7deg)_translateY(-6%)]" />
          {/* front of the card */}
          <CardMock look="classic" className="relative mt-[22%] w-[90%] [transform:rotateX(8deg)_rotateY(-10deg)_rotate(-3deg)]" />
          <div className="absolute top-[4%] left-0 z-10 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl sm:-left-4">
            <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon icon="lucide:check" className="size-5" /></span>
            <span>
              <span className="block text-sm font-semibold text-navy-900">Approved · 12 cards</span>
              <span className="block text-xs text-slate-500">PDFs ready to download</span>
            </span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- fact strip overlapping the hero ---------- */

export function FactStrip() {
  return (
    <section className="relative z-10 -mt-24 pb-4">
      <Container>
        <Reveal>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm lg:grid-cols-5">
            {facts.map((fact, i) => (
              <div key={fact.label} className={cx('bg-white px-4 py-6 text-center sm:p-8', i === 0 && 'col-span-2 lg:col-span-1')}>
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <span className="type-stat block font-semibold whitespace-nowrap text-navy-900">{fact.value}</span>
                  <span className="mt-2 block text-sm font-medium text-slate-500">{fact.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}

/* ---------- features ---------- */

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 bg-slate-50 py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHead eyebrow="What it does" title="Everything a company needs to issue business cards" text="BizCard replaces the email chains, spreadsheets and back-and-forth with a printer. These are the four jobs it does." />
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {features.map((f, i) => (
            <Reveal delay={i * 80} key={f.title} className="group bg-white p-7 transition-colors hover:bg-brand-50/40">
              <span className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                <Icon icon={f.icon} className="size-5" />
              </span>
              <h3 className="mt-6 text-lg leading-snug font-semibold text-navy-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- steps ---------- */

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="How it works" title="From sign-up to printed cards in four steps" />
          <Link href="/register/company" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Start with step one <Icon icon="lucide:arrow-right" className="size-4" />
          </Link>
        </div>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Reveal as="li" delay={i * 80} key={step.title} className="border-t-2 border-slate-200 pt-6 first:border-brand-600">
              <span className="text-sm font-semibold text-brand-600">Step {i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold text-navy-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}

/* ---------- navy band ---------- */

export function WhyBizCard() {
  return (
    <section className="bg-navy-950 py-16 text-white sm:py-20 lg:py-24">
      <Container>
        <SectionHead dark eyebrow="Why BizCard" title="Built for companies, not one-off print jobs" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r, i) => (
            <Reveal delay={i * 80} key={r.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <Icon icon={r.icon} className="size-7 text-brand-300" />
              <h3 className="mt-4 text-lg font-semibold text-white">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{r.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- templates ---------- */

export function Templates() {
  return (
    <section id="templates" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHead eyebrow="Your design" title="Bring your own design, or let AI make one" text="There are no stock templates to settle for. Your card uses your brand, and every employee gets the same look." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {templates.map((t, i) => (
            <Reveal as="article" delay={i * 80} key={t.look} className="group rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg">
              <div className="rounded-lg bg-slate-100 p-6 sm:p-8">
                <CardMock look={t.look} />
              </div>
              <h3 className="mt-5 font-semibold text-navy-900 group-hover:text-brand-600">{t.label}</h3>
              <p className="mt-1 text-sm text-slate-600">{t.note}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- verification ---------- */

export function Verification() {
  return (
    <section id="verify" className="scroll-mt-24 bg-slate-50 py-16 sm:py-20 lg:py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="QR verification" title="Anyone can check a card is real" text="Each card gets its own code. Scanning it opens a short public page with the details printed on the card and its current status." />
          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            {['A unique code for every card', 'Shows as inactive once a card is withdrawn', 'Never shows private emails or phone numbers'].map((point) => (
              <li key={point} className="flex items-center gap-3">
                <Icon icon="lucide:circle-check" className="size-5 shrink-0 text-brand-600" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-xs text-slate-500">
            <Icon icon="lucide:lock" className="size-3.5" /> bizcard / verify / 8F2K-41QD
          </div>
          <div className="p-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Icon icon="lucide:badge-check" className="size-3.5" /> Active card
            </span>
            <p className="mt-4 text-xl font-semibold text-navy-900">Farhana Akter</p>
            <p className="text-sm text-slate-500">Head of Finance · Northwind</p>
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm">
              {[['Employee ID', 'NW-0142'], ['Issued', '04 Nov 2026']].map(([k, v]) => (
                <div key={k} className="bg-slate-50 px-4 py-3">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 font-medium text-navy-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------- roles ---------- */

export function Roles() {
  return (
    <section id="roles" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHead eyebrow="Who uses it" title="Three roles, each with its own workspace" />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {roles.map((role, i) => (
            <Reveal delay={i * 80} key={role.title} className="rounded-xl border border-slate-200 p-7">
              <h3 className="text-lg font-semibold text-navy-900">{role.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{role.text}</p>
              <ul className="mt-5 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-700">
                {role.points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-brand-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- results and testimonials (sample data lives in content.ts) ---------- */

export function Testimonials() {
  return (
    <section id="customers" className="scroll-mt-24 bg-navy-950 py-16 text-white sm:py-20 lg:py-24">
      <Container>
        <SectionHead dark eyebrow="Customers" title="What teams say after switching" />

        <dl className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-navy-950 px-5 py-7 text-center">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block text-3xl font-semibold text-white">{s.value}</span>
                <span className="mt-2 block text-sm text-slate-400">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure key={t.name} className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-7">
              <Icon icon="lucide:quote" className="size-6 text-brand-300" />
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-200">{t.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t.name}</span>
                  <span className="block text-xs text-slate-400">{t.role}, {t.company}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- FAQ ---------- */

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-slate-50 py-16 sm:py-20 lg:py-24">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <SectionHead eyebrow="Questions" title="Common questions" text="Can't find what you're looking for? Sign in and message the platform team from your workspace." />
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {faqs.map((item, i) => (
            <details key={item.question} open={i === 0} className="group px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-semibold text-navy-900 [&::-webkit-details-marker]:hidden">
                {item.question}
                <Icon icon="lucide:plus" className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-45" />
              </summary>
              <p className="-mt-1 pb-5 text-sm leading-relaxed text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ---------- closing call to action ---------- */

export function ClosingCta() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div aria-hidden="true" className="absolute -right-24 -bottom-32 size-80 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to set up your company?</h2>
            <p className="mt-3 max-w-xl text-slate-300">Registration takes a few minutes. Once we&apos;ve checked your details you can add staff and order cards straight away.</p>
          </div>
          <div className="relative mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            <Link href="/register/company" className={primaryBtn}>Register your company</Link>
            <Link href="/login" className="inline-flex items-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Sign in</Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
