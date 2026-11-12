import AnimatedPage from '../components/home/AnimatedPage';
import Hero from '../components/home/Hero';
import MarqueeTop from '../components/home/MarqueeTop';
import ManageRequests from '../components/home/ManageRequests';
import FeatureCards from '../components/home/FeatureCards';
import NewIdeas from '../components/home/NewIdeas';
import MarqueeBottom from '../components/home/MarqueeBottom';
import Featured from '../components/home/Featured';
import BigOrdersPrivacy from '../components/home/BigOrdersPrivacy';
import FaqSection from '../components/home/FaqSection';
import FinalCta from '../components/home/FinalCta';
import HowItWorks from '../components/home/HowItWorks';
import Stats from '../components/home/Stats';
import Templates from '../components/home/Templates';
import Verify from '../components/home/Verify';
import Testimonials from '../components/home/Testimonials';
import SiteFooter from '../components/layout/SiteFooter';

export default function HomePage() {
  return (
    <AnimatedPage className="bg-white font-body text-black">
      <Hero />
      <MarqueeTop />
      <HowItWorks />
      <ManageRequests />
      <FeatureCards />
      <Stats />
      <NewIdeas />
      <MarqueeBottom />
      <Templates />
      <Featured />
      <Verify />
      <BigOrdersPrivacy />
      <Testimonials />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </AnimatedPage>
  );
}
