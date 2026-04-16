import { useEffect } from "react";
import HeroSection from "../components/home/HeroSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import DealsSection from "../components/home/DealsSection";
import ForYouSection from "../components/home/ForYouSection";
import { detectLocation } from "../lib/locationStore";

export default function Home() {
  useEffect(() => {
    detectLocation();
  }, []);

  return (
    <div>
      <HeroSection />
      <ForYouSection />
      <DealsSection />
      <AIFinderCTA />
    </div>
  );
}