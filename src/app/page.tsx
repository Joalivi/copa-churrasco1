import { PageContainer } from "@/components/layout/page-container";
import HeroSection from "@/components/landing/hero-section";
import BrasilBanner from "@/components/landing/brasil-banner";
import CountdownTimer from "@/components/landing/countdown-timer";
import EventDetails from "@/components/landing/event-details";
import FeatureCards from "@/components/landing/feature-cards";

export default function Home() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <HeroSection />
        <BrasilBanner />
        <CountdownTimer />
        <EventDetails />
        <FeatureCards />

        <footer className="text-center text-xs text-zinc-400 pb-4">
          Churras da Copa 2026 &mdash; Caldas/MG
        </footer>
      </div>
    </PageContainer>
  );
}
