import Marquee from './Marquee';
import { words } from './content';

export default function MarqueeTop() {
  return (
    <>
      <Marquee items={words.top} className="bg-black py-[18px] text-white" />
    </>
  );
}
