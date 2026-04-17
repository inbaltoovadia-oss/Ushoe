import { useEffect, useState } from "react";
import HeroSection from "../components/home/HeroSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import DealsSection from "../components/home/DealsSection";
import ForYouSection from "../components/home/ForYouSection";
import SponsoredSection from "../components/home/SponsoredSection";
import AIRecommendations from "../components/home/AIRecommendations";
import { detectLocation } from "../lib/locationStore";

export default function Home() {
  const [sponsoredRefreshKey, setSponsoredRefreshKey] = useState(0);

  useEffect(() => {
    detectLocation();
  }, []);

  return (
    <div>
      <HeroSection />
      <AIRecommendations />
      <SponsoredSection refreshKey={sponsoredRefreshKey} />
      <ForYouSection />
      <DealsSection />
      <AIFinderCTA />
    </div>
  );
}