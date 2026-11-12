import { display, PillButton, SmallCard } from './parts';
export default function Featured() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy px-4 py-[110px] sm:px-6">
        <svg viewBox="0 0 1400 300" className="absolute top-[280px] left-0 w-full" fill="none" aria-hidden="true"><path d="M0 150 C120 110 220 60 420 70 C700 90 1000 40 1400 20" stroke="white" strokeOpacity=".7" strokeWidth="1" /></svg>
        <h2 className={`${display} relative text-center text-[2.5rem] text-white lg:text-[52px]`}>Featured teams</h2>
        <div className="relative mt-[88px] flex gap-[26px] overflow-x-auto pb-2 [scrollbar-width:none] lg:justify-center lg:overflow-visible">
          <SmallCard tone="mint" name="Amina Rahman" />
          <SmallCard tone="lemon" name="Daniel Okafor" />
          <SmallCard tone="blush" name="Mei Tanaka" />
          <SmallCard tone="royal" name="Jonas Weber" />
        </div>
        <div className="relative mt-[80px] text-center"><PillButton href="/register" tone="mint">Get started for free</PillButton></div>
      </section>

    </>
  );
}
