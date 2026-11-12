import CountUp from './CountUp';
import { display } from './parts';

const stats = [
  { to: 12000, suffix: '+', label: 'Cards printed' },
  { to: 350, suffix: '+', label: 'Companies on board' },
  { to: 48, suffix: 'h', label: 'Average approval time' },
  { to: 100, suffix: '%', label: 'Cards verifiable by QR' },
];

export default function Stats() {
  return (
    <section className="bg-lemon px-4 py-[90px] sm:px-6">
      <div className="mx-auto max-w-[1070px]">
        <h2 className={`${display} text-center text-[2rem] leading-[1.2] lg:text-[44px] lg:leading-[54px]`}>Teams are printing smarter</h2>
        <dl className="mt-[60px] grid grid-cols-2 gap-x-6 gap-y-12 text-center lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <CountUp to={stat.to} suffix={stat.suffix} className={`${display} block text-[3rem] leading-none lg:text-[64px]`} />
                <span className="mt-3 block font-body text-lg">{stat.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
