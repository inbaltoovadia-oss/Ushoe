import { useEffect, useState, useCallback } from "react";
import HeroSection from "../components/home/HeroSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import DealsSection from "../components/home/DealsSection";
import PersonalizedSection from "../components/home/PersonalizedSection";
import SponsoredSection from "../components/home/SponsoredSection";

import { detectLocation } from "../lib/locationStore";
import { preloadTrending } from "../lib/preloader";
import PullToRefresh from "../components/PullToRefresh";
import RecentlyViewed from "../components/RecentlyViewed";
import TrendingTrendsSection from "../components/home/TrendingTrendsSection";
import DailyPicksSection from "../components/home/DailyPicksSection";
import CommunityPicksSection from "../components/home/CommunityPicksSection";

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
      {/* Instant content first — no AI calls needed */}
      <RecentlyViewed />
      <DailyPicksSection />
      <DealsSection />
      <PersonalizedSection />
      <CommunityPicksSection />
      <SponsoredSection refreshKey={sponsoredRefreshKey} />
      <TrendingTrendsSection />
      <AIFinderCTA />
    </PullToRefresh>
  );
}