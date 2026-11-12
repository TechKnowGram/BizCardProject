import { Icon } from './Iconify';
import { PhotoShape, Shape, photo, photos } from './Shapes';
import { display, PillButton, Squiggle } from './parts';
export default function BigOrdersPrivacy() {
  return (
    <>
      <section id="features" className="bg-mist px-4 pt-[110px] pb-[110px] sm:px-6">
        <div className="mx-auto grid max-w-[1070px] items-start gap-[27px] md:grid-cols-2">
          <div data-g="card" className="relative overflow-hidden rounded-[40px] bg-white px-8 pt-[90px] pb-[90px] text-center lg:rounded-[64px]">
            <h3 className={`${display} text-[2rem] leading-[1.2] lg:text-[44px] lg:leading-[54px]`}>Raise bigger orders</h3>
            <div className="relative mx-auto mt-[60px] h-[240px] w-[250px]">
              <Squiggle className="absolute -inset-x-20 top-4 w-[calc(100%+10rem)]" />
              <Shape kind="flower" points={5} amp={0.28} fill="#4a1ff2" className="absolute inset-0 size-[240px]" />
              <PhotoShape kind="oval" amp={0.1} src={photo(photos.manSmile, 200)} alt="Colleague" border="#000" className="absolute top-[52px] left-[88px] size-[80px]" />
              <PhotoShape kind="oval" amp={0.1} src={photo(photos.womanHat, 200)} alt="Colleague" border="#000" className="absolute top-[110px] left-[26px] size-[66px]" />
              <PhotoShape kind="oval" amp={0.1} src={photo(photos.womanBraids, 200)} alt="Colleague" border="#000" className="absolute top-[150px] left-[116px] size-[84px]" />
              {[['50', '#fff700', 'bottom-[-6px] left-[2px]'], ['250', '#4dffc8', 'top-[128px] right-[-30px]'], ['1K', '#6b60e8', 'top-[2px] left-[148px]']].map(([label, fill, pos]) => (
                <span key={label} className={`absolute grid size-[70px] place-items-center ${pos}`}>
                  <Shape kind="burst" points={12} inner={0.8} fill={fill} className="absolute inset-0" />
                  <span className={`relative font-display text-lg font-semibold ${label === '1K' ? 'text-white' : ''}`}>{label}</span>
                </span>
              ))}
            </div>
            <p className="mx-auto mt-[70px] max-w-[420px] font-body text-lg leading-[29px]">
              <b className="font-semibold">Many teams</b> and <b className="font-semibold">one company order</b> means everyone can work together to place bigger, cheaper requests. Collaborate across departments and bring your brand to life.
            </p>
          </div>
          <div data-g="card" className="relative overflow-hidden rounded-[40px] bg-white px-8 pt-[90px] pb-[90px] text-center lg:rounded-[64px]">
            <h3 className={`${display} text-[2rem] leading-[1.2] lg:text-[44px] lg:leading-[54px]`}>Protect your privacy</h3>
            <div className="relative mx-auto mt-[60px] h-[240px] w-[340px]">
              <Squiggle className="absolute -inset-x-24 top-4 w-[calc(100%+12rem)]" />
              <Shape kind="burst" points={8} inner={0.55} fill="#fff700" className="absolute top-[40px] right-[-8px] size-[150px]" />
              <Shape kind="burst" points={8} inner={0.45} fill="#4dffc8" className="absolute top-[70px] left-[-14px] size-[130px]" />
              <Shape kind="flower" points={3} amp={0.2} fill="#4a1ff2" className="absolute top-0 left-[60px] size-[230px]" />
              <div className="absolute top-[92px] left-0 flex h-[72px] w-[300px] items-center gap-3 rounded-[10px] border border-black bg-white px-5 shadow-[6px_0_0_#000]">
                <Icon icon="lucide:eye-off" className="size-4" />
                <span className="font-body text-[11px] font-medium">Hide phone numbers on cards</span>
                <Icon icon="lucide:circle-help" className="size-3" />
                <span className="ml-auto flex h-5 w-8 items-center justify-end rounded-full bg-black px-[3px]"><span className="size-[14px] rounded-full bg-white" /></span>
              </div>
            </div>
            <p className="mx-auto mt-[70px] max-w-[420px] font-body text-lg leading-[29px]">
              Privacy settings protect you and your team. Employee details stay inside your company and verification pages show only what is printed on the card.
            </p>
          </div>
        </div>
        <div className="mt-[62px] text-center"><PillButton href="#faq" className="h-[50px]">Explore how it works</PillButton></div>
      </section>

    </>
  );
}
