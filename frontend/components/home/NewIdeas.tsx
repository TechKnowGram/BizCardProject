import { Icon } from './Iconify';
import { PhotoShape, Rays, Shape, photo, photos } from './Shapes';
import { display, PillButton } from './parts';
export default function NewIdeas() {
  return (
    <>
      <section className="relative overflow-hidden bg-white px-4 pb-24 sm:px-6">
        <div className="relative mx-auto grid size-[140px] place-items-center">
          <Shape kind="burst" points={16} inner={0.72} fill="#fff700" className="absolute inset-0" />
          <Icon icon="pixelarticons:human-handsup" className="relative size-14" />
        </div>
        <div className="mx-auto mt-[90px] grid max-w-[1070px] items-center gap-12 lg:grid-cols-2">
          <div className="text-navy">
            <h2 className={`${display} text-[2.5rem] leading-[1.3] lg:text-[48px] lg:leading-[63px]`}>New designs, new ideas!</h2>
            <p className="mt-12 max-w-[500px] font-body text-lg leading-[30px]">
              Get fresh card designs from the AI designer and engage your clients from the very first handshake.
            </p>
            <div className="mt-12"><PillButton href="/register" className="h-[50px]">Get started for free</PillButton></div>
          </div>
          <div data-g="parallax" className="relative mx-auto h-[520px] w-full max-w-[430px]">
            <svg viewBox="0 0 100 200" className="absolute top-2 left-[150px] h-[510px] w-[110px]" fill="none" aria-hidden="true"><path d="M30 5 C60 30 5 70 40 100 C80 140 50 170 70 195 M60 5 C90 40 40 80 80 120" stroke="#ffd0dc" strokeWidth="3" strokeLinecap="round" /></svg>
            <Shape kind="flower" points={8} amp={0.14} fill="#10242f" stroke="#000" className="absolute top-0 left-[20px] size-[180px]" />
            <Shape kind="flower" points={8} amp={0.12} fill="#fff" stroke="#000" className="absolute top-[100px] left-[285px] size-[135px]" />
            <span className="absolute top-[170px] left-[110px] h-[22px] w-[30px] rounded-[50%] border border-black bg-white" />
            <span className="absolute top-[195px] left-[110px] h-[12px] w-[18px] rounded-[50%] border border-black bg-white" />
            <span className="absolute top-[225px] left-[290px] h-[26px] w-[28px] rounded-[50%] border border-black bg-white" />
            <PhotoShape kind="oval" src={photo(photos.womanCurly, 700)} alt="Smiling team member" className="absolute top-[170px] left-[70px] size-[300px] rotate-[24deg]" />
            <Rays count={12} color="#fff700" width={3} className="absolute top-[300px] left-[-10px] size-[190px]" />
          </div>
        </div>
      </section>

    </>
  );
}
