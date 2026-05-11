import { useEffect, useState, useCallback } from "react";
import HeroSection from "../components/home/HeroSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import DealsSection from "../components/home/DealsSection";
import PersonalizedSection from "../components/home/PersonalizedSection";
import SponsoredSection from "../components/home/SponsoredSection";

import { detectLocation, getLocation } from "../lib/locationStore";
import { preloadTrending } from "../lib/preloader";
import PullToRefresh from "../components/PullToRefresh";
import RecentlyViewed from "../components/RecentlyViewed";
import TrendingTrendsSection from "../components/home/TrendingTrendsSection";
import DailyPicksSection from "../components/home/DailyPicksSection";
import CommunityPicksSection from "../components/home/CommunityPicksSection";
import UseMyLocationButton from "../components/UseMyLocationButton";

export default function Home() {
  const [sponsoredRefreshKey, setSponsoredRefreshKey] = useState(0);

  useEffect(() => {
    // Only silently re-detect if already granted before (avoids surprise prompt)
    if (getLocation().detected) detectLocation();
    preloadTrending();
  }, []);

  const handleRefresh = useCallback(async () => {
    await preloadTrending();
    setSponsoredRefreshKey(k => k + 1);
  }, []);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <HeroSection />
      {/* Location bar */}
      <div className="px-4 sm:px-6 max-w-7xl mx-auto py-2">
        <UseMyLocationButton />
      </div>
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