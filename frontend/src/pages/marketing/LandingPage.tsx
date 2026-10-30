import React from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { ProblemSection } from './ProblemSection';
import { HowItWorksSection } from './HowItWorksSection';
import { FeatureShowcase } from './FeatureShowcase';
import { InteractiveProductDemo } from './InteractiveProductDemo';
import { PlansSection } from './PlansSection';
import { TrustSection } from './TrustSection';
import { DemoRolesSection } from './DemoRolesSection';
import { ContactSection } from './ContactSection';
import { Footer } from './Footer';

export const LandingPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeatureShowcase />
        <InteractiveProductDemo />
        <PlansSection />
        <TrustSection />
        <DemoRolesSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

