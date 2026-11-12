import { Icon } from './Iconify';
import { PhotoShape, photo, photos } from './Shapes';
import { display } from './parts';

const quotes = [
  { name: 'Amina Rahman', role: 'Head of Design, Northwind', photo: photos.womanBlazer, bg: 'bg-blush', text: 'We ordered cards for forty people in one afternoon. No back and forth with a printer, and everything matched our brand.' },
  { name: 'Daniel Okafor', role: 'Sales Director, Brightline', photo: photos.manBeard, bg: 'bg-lemon', text: 'The QR check is brilliant. Clients scan the card and instantly see I really work here. It builds trust right away.' },
  { name: 'Mei Tanaka', role: 'Operations, Kite & Co', photo: photos.womanBraids, bg: 'bg-mint', text: 'Importing our team from a CSV took a minute, and the approval flow means nothing gets printed by mistake.' },
];

export default function Testimonials() {
  return (
    <section className="bg-white px-4 py-[110px] sm:px-6">
      <div className="mx-auto max-w-[1070px]">
        <h2 className={`${display} text-center text-[2.5rem] leading-[1.2] lg:text-[52px] lg:leading-[64px]`}>Loved by busy teams</h2>

        <div className="mt-[70px] grid gap-6 md:grid-cols-3">
          {quotes.map((quote) => (
            <figure key={quote.name} data-g="card" className={`flex flex-col rounded-[40px] border-2 border-black p-8 ${quote.bg}`}>
              <Icon icon="ph:quotes-fill" className="size-9" />
              <blockquote className="mt-5 flex-1 font-body text-lg leading-[28px]">{quote.text}</blockquote>
              <figcaption className="mt-8 flex items-center gap-4">
                <PhotoShape kind="flower" points={8} amp={0.1} src={photo(quote.photo, 200)} alt={quote.name} border="#000" className="size-14 shrink-0" />
                <span>
                  <span className="block font-display text-base font-medium">{quote.name}</span>
                  <span className="block font-body text-sm text-black/60">{quote.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
