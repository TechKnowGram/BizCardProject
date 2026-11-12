import { Icon } from './Iconify';
import { PhotoShape, Shape, photo, photos } from './Shapes';
import { display, ClaimForm } from './parts';
import SiteHeader from '../layout/SiteHeader';

export default function Hero() {
  return (
      <header className="relative overflow-hidden bg-lilac px-4 pt-6 sm:px-6">
        <SiteHeader />
        <div className="mx-auto grid max-w-[1070px] items-center gap-12 pt-14 pb-24 lg:grid-cols-[1fr_440px] lg:pt-[70px] lg:pb-[148px]">
          <div>
            <h1 className="font-display text-[2.75rem] leading-[1.2] font-medium tracking-[-0.01em] lg:text-[60px] lg:leading-[78px]">
              Print business cards for your team!
              <span className="relative ml-2 inline-block -rotate-[8deg] rounded-[50%] bg-lemon px-4 py-1.5 align-middle font-display text-base leading-none font-medium">Approved fast.</span>
            </h1>
            <p className="mt-9 max-w-[470px] font-body text-lg leading-[29px]">
              Use BizCard to manage your people, pick a design and get approved, print-ready business cards in a few clicks.
            </p>
            <div className="mt-9"><ClaimForm buttonLabel="Create your workspace" /></div>
          </div>
          {/* stacked product cards */}
          <div className="relative mx-auto hidden h-[490px] w-[440px] lg:block">
            <Shape kind="burst" points={8} inner={0.45} fill="#4a1ff2" className="absolute top-[250px] left-[200px] size-[190px]" />
            <Icon icon="ph:sparkle" className="absolute top-[40px] left-[36px] size-[48px] text-black" />
            <Icon icon="ph:sparkle-fill" className="absolute top-[22px] left-[90px] size-7 text-lemon" />
            <div data-g="card" className="absolute top-[165px] left-0 flex h-[324px] w-[242px] flex-col justify-end rounded-[40px] border-2 border-black bg-[#ecebc8] p-5">
              <p className="font-body text-base leading-6">Order cards for the new sales team?</p>
              <span className="mt-4 flex items-center gap-1"><span className="rounded-full border border-black px-4 py-2 font-display text-xs">Make request</span><span className="grid size-9 place-items-center rounded-full border border-black"><Icon icon="lucide:arrow-right" className="size-4" /></span></span>
            </div>
            <div data-g="card" className="absolute top-[83px] left-[97px] flex h-[323px] w-[246px] flex-col justify-end rounded-[40px] border-2 border-black bg-linear-to-b from-[#fdf1fb] to-[#e8d4fb] p-5">
              <p className="font-body text-base leading-6">Follow your brand kit on every card?</p>
              <span className="mt-4 flex items-center gap-1"><span className="rounded-full border border-black px-4 py-2 font-display text-xs">Make request</span><span className="grid size-9 place-items-center rounded-full border border-black"><Icon icon="lucide:arrow-right" className="size-4" /></span></span>
            </div>
            <div data-g="card" className="absolute top-0 left-[193px] h-[322px] w-[247px] rounded-[40px] border-2 border-black bg-white px-5 pt-[70px]">
              <PhotoShape kind="flower" points={8} amp={0.1} src={photo(photos.womanSmile, 300)} alt="Team member" className="mx-auto size-[88px]" />
              <p className="mt-6 text-center font-body text-base leading-[26px]">Cards for your next team event?</p>
              <span className="mx-auto mt-5 flex w-fit items-center gap-1"><span className="rounded-full border border-black px-4 py-2 font-display text-xs">Make request</span><span className="grid size-9 place-items-center rounded-full border border-black"><Icon icon="lucide:arrow-right" className="size-4" /></span></span>
            </div>
          </div>
        </div>
      </header>
  );
}
