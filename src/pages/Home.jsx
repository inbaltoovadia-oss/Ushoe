import { useEffect } from "react";
import HeroSection from "../components/home/HeroSection";
import TrendingSection from "../components/home/TrendingSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import { detectLocation } from "../lib/locationStore";

export default function Home() {
  useEffect(() => {
    detectLocation();
  }, []);

  return (
    <div>
      <HeroSection />
      <TrendingSection />
      <AIFinderCTA />
    </div>
  );
}