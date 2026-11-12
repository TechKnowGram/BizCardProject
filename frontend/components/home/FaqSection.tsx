import Link from 'next/link';
import { Icon } from './Iconify';
import Faq from './Faq';
import { display } from './parts';
import { faqs } from './content';

export default function FaqSection() {
  return (
    <>
      <section id="faq" className="bg-black px-4 py-[110px] sm:px-6">
        <h2 className={`${display} text-center text-[2.5rem] text-white lg:text-[52px]`}>Have a question?</h2>
        <div className="mt-8 text-center">
          <Link href="/register" className="inline-flex h-[50px] items-center gap-2 rounded-full bg-white px-6 font-display text-sm text-black">
            View all FAQ&apos;s <Icon icon="lucide:arrow-right" className="size-5" />
          </Link>
        </div>
        <Faq items={faqs} />
      </section>

    </>
  );
}
