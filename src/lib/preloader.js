// Preloads trending shoes into memory cache on app startup
// so the home page feels instant
import { base44 } from "@/api/base44Client";
import { setTrendingCache, getTrendingCache } from "./searchCache";

let preloadPromise = null;

export function preloadTrending() {
  if (getTrendingCache()) return Promise.resolve(getTrendingCache());
  if (preloadPromise) return preloadPromise;

  preloadPromise = base44.entities.Shoe.list("-trending_score", 80)
    .then(shoes => {
      setTrendingCache(shoes);
      preloadPromise = null;
      return shoes;
    })
    .catch(() => { preloadPromise = null; });

  return preloadPromise;
}