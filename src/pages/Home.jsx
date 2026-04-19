import { useEffect, useState, useCallback } from "react";
import HeroSection from "../components/home/HeroSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import DealsSection from "../components/home/DealsSection";
import ForYouSection from "../components/home/ForYouSection";
import SponsoredSection from "../components/home/SponsoredSection";
import AIRecommendations from "../components/home/AIRecommendations";
import { detectLocation } from "../lib/locationStore";
import { preloadTrending } from "../lib/preloader";
import PullToRefresh from "../components/PullToRefresh";

export default function Home() {
  const [sponsoredRefreshKey, setSponsoredRefreshKey] = useState(0);

  useEffect(() => {
    detectLocation();
    preloadTrending();
  }, []);

  const handleRefresh = useCallback(async () => {
    await preloadTrending();
    setSponsoredRefreshKey(k => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <HeroSection />
      <AIRecommendations />
      <SponsoredSection refreshKey={sponsoredRefreshKey} />
      <ForYouSection />
      <DealsSection />
      <AIFinderCTA />
    </PullToRefresh>
  );
}