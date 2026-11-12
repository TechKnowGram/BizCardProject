import { Rays, photos } from './Shapes';
import { display, PillButton, RequestCard } from './parts';
export default function ManageRequests() {
  return (
    <>
      <section id="requests" className="bg-navy px-4 py-24 sm:px-6 lg:py-[150px]">
        <div className="mx-auto grid max-w-[1070px] items-center gap-16 lg:grid-cols-2">
          <div className="relative mx-auto h-[520px] w-full max-w-[490px]">
            <Rays count={14} color="#4dffc8" width={3} className="absolute top-[300px] left-[270px] size-[150px]" />
            <RequestCard className="top-[10px] left-0" handle="@AminaRahman" avatar={photos.womanBlazer} badge="×25" badgeFill="#4dffc8" text="Cards for the new design team in Dhaka" />
            <RequestCard className="top-[100px] left-[175px]" handle="@DanielOkafor" avatar={photos.manBeard} badge="×10" badgeFill="#fff700" text="Welcome-pack cards for our 10 new hires" />
            <RequestCard className="top-[235px] left-[40px]" handle="@MeiTanaka" avatar={photos.womanBraids} badge="×50" badgeFill="#ffd0dc" text="Event cards for the sales summit next month" />
          </div>
          <div className="text-white">
            <h2 className={`${display} text-[2.5rem] leading-[1.2] lg:text-[52px] lg:leading-[64px]`}>Manage requests in minutes.</h2>
            <p className="mt-10 max-w-[505px] font-body text-lg leading-[29px]">
              Take in card requests from every team or define your own one-click orders. Approve or decline as you see fit, you&apos;re in control.
            </p>
            <div className="mt-10"><PillButton href="/register" tone="mint" className="h-[56px] px-7">Create your workspace</PillButton></div>
          </div>
        </div>
      </section>

    </>
  );
}
