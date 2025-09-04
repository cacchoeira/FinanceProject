import { Hero } from '../components/marketing/Hero';
import { Features } from '../components/marketing/Features';
import { Pricing } from '../components/marketing/Pricing';
import { PublicHeader } from '../components/layout/PublicHeader';

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <Hero />
      <Features />
      <Pricing />
    </div>
  );
}