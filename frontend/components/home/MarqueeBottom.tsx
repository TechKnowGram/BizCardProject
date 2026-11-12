import Marquee from './Marquee';
import { words } from './content';

export default function MarqueeBottom() {
  return (
    <>
      <Marquee items={words.bottom} className="bg-lilac py-[18px] text-black" />
    </>
  );
}
