import RiceWareNav from '@/components/RiceWareNav';
import HeroSection from '@/components/HeroSection';
import ProblemSection from '@/components/ProblemSection';
import WhyHuskSection from '@/components/WhyHuskSection';
import ProductSection from '@/components/ProductSection';
import ProcessSection from '@/components/ProcessSection';
import ImpactSection from '@/components/ImpactSection';
import TeamSection from '@/components/TeamSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import FaqSection from '@/components/FaqSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-ground flex flex-col font-body w-full">
      <RiceWareNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <WhyHuskSection />
        <ProductSection />
        <ProcessSection />
        <ImpactSection />
        <TeamSection />
        <TestimonialsSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}
