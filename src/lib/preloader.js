// Preloads trending shoes into memory cache on app startup
// so the home page feels instant
import { getShoesCatalog } from "./shoeCache";
import { setTrendingCache, getTrendingCache } from "./searchCache";

export function preloadTrending() {
  if (getTrendingCache()) return Promise.resolve(getTrendingCache());
  return getShoesCatalog(80)
    .then(shoes => {
      setTrendingCache(shoes);
      return shoes;
    })
    .catch(() => {});
}