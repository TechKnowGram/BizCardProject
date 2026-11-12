import { Icon } from './Iconify';
import { display, ClaimForm } from './parts';
export default function FinalCta() {
  return (
    <>
      <section className="bg-white px-4 py-[130px] text-center sm:px-6">
        <div className="relative mx-auto w-fit max-w-full">
          <Icon icon="ph:sparkle" className="absolute top-[-14px] -left-14 size-11" />
          <Icon icon="ph:sparkle-fill" className="absolute top-[-34px] -left-5 size-8 text-royal" />
          <h2 className={`${display} text-[2rem] sm:text-[3rem] lg:text-[52px]`}>Start ordering cards today</h2>
        </div>
        <div className="mt-14 flex justify-center"><ClaimForm buttonLabel="Create your workspace" /></div>
      </section>
    </>
  );
}
