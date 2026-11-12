import { PhotoShape, photo, photos } from './Shapes';
import { display, PillButton, Squiggle, TiltedRow } from './parts';
export default function FeatureCards() {
  return (
    <>
      <section className="bg-linear-to-b from-lilac to-white px-4 pt-[100px] pb-[110px] sm:px-6">
        <div className="mx-auto grid max-w-[1070px] items-start gap-[27px] md:grid-cols-2">
          <div data-g="card" className="relative overflow-hidden rounded-[40px] bg-white px-8 pt-[90px] pb-10 text-center lg:rounded-[64px]">
            <h3 className={`${display} text-[2rem] leading-[1.2] lg:text-[44px] lg:leading-[54px]`}>Manage your request inbox</h3>
            <p className="mx-auto mt-[50px] max-w-[430px] font-body text-[15px] leading-[23px]">
              Card requests often get lost in the noise. Collect &amp; manage them while keeping every department on the same brand and bringing in new ideas.
            </p>
            <div className="relative mx-auto mt-10 h-[290px] w-full max-w-[440px] text-left">
              <Squiggle className="absolute -inset-x-8 top-0 w-[calc(100%+4rem)]" />
              <div className="absolute top-3 left-[62px] h-[250px] w-[395px] rounded-[10px] bg-mist" />
              <TiltedRow icon="ri:tiktok-fill" handle="amina.rahman" text="Can we get cards with the new logo by Friday?" className="top-[10px] left-[-10px] -rotate-[8deg] bg-blush" />
              <TiltedRow icon="mdi:instagram" handle="daniel.okafor" text="OMG the matte finish is my favourite! Can we use it for sales?" className="top-[130px] left-[160px] rotate-[8deg] bg-lemon" />
            </div>
          </div>
          <div data-g="card" className="relative overflow-hidden rounded-[40px] bg-white px-8 pt-[90px] pb-10 text-center lg:rounded-[64px]">
            <h3 className={`${display} text-[2rem] leading-[1.2] lg:text-[44px] lg:leading-[54px]`}>Set your design. You&apos;re in control.</h3>
            <p className="mx-auto mt-[50px] max-w-[430px] font-body text-[15px] leading-[23px]">
              Not the right look? Pick another template or describe a new one to the AI designer. Tweak colours and fonts until everyone is happy.
            </p>
            <div className="relative mx-auto mt-14 h-[250px] w-[300px]">
              <Squiggle className="absolute -inset-x-32 top-6 w-[calc(100%+16rem)]" />
              <PhotoShape kind="burst" points={12} inner={0.78} src={photo(photos.manLong)} alt="Team member" className="absolute bottom-0 left-0 size-[150px]" />
              <PhotoShape kind="oval" src={photo(photos.womanLaughing)} alt="Team member" className="absolute right-0 bottom-0 size-[190px] -rotate-[20deg]" />
              <span className="absolute top-[62px] left-[36px] grid h-[52px] w-[142px] place-items-center rounded-full bg-blush font-display text-xl font-semibold">Qty?</span>
              <span className="absolute top-0 left-[140px] grid h-[52px] w-[142px] place-items-center rounded-full bg-navy font-display text-xl font-semibold text-lemon">Matte?</span>
            </div>
          </div>
        </div>
        <div className="mt-[62px] text-center"><PillButton href="/register">Create your workspace</PillButton></div>
      </section>

    </>
  );
}
