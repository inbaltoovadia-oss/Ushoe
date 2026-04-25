import { useEffect, useState, useCallback } from "react";
import HeroSection from "../components/home/HeroSection";
import AIFinderCTA from "../components/home/AIFinderCTA";
import DealsSection from "../components/home/DealsSection";
import PersonalizedSection from "../components/home/PersonalizedSection";
import SponsoredSection from "../components/home/SponsoredSection";
import AIRecommendations from "../components/home/AIRecommendations";
import AIPickOfTheDaySection from "../components/home/AIPickOfTheDaySection";
import TrendingNearYouSection from "../components/home/TrendingNearYouSection";
import { detectLocation } from "../lib/locationStore";
import { preloadTrending } from "../lib/preloader";
import PullToRefresh from "../components/PullToRefresh";
import RecentlyViewed from "../components/RecentlyViewed";
import TrendingTrendsSection from "../components/home/TrendingTrendsSection";

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
      <RecentlyViewed />
      <TrendingTrendsSection />
      <AIPickOfTheDaySection />
      <TrendingNearYouSection />
      <AIRecommendations />
      <SponsoredSection refreshKey={sponsoredRefreshKey} />
      <PersonalizedSection />
      <DealsSection />
      <AIFinderCTA />
    </PullToRefresh>
  );
}