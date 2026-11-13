import SiteHeader from '../components/layout/SiteHeader';
import SiteFooter from '../components/layout/SiteFooter';
import { ClosingCta, FactStrip, Faq, Features, Hero, HowItWorks, Roles, Templates, Testimonials, Verification, WhyBizCard } from '../components/home/Sections';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <FactStrip />
        <Features />
        <HowItWorks />
        <WhyBizCard />
        <Templates />
        <Verification />
        <Roles />
        <Testimonials />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </>
  );
}
