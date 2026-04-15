// Simple in-memory + localStorage search cache to keep AI responses fast
const CACHE_VERSION = "v1";
const MEM_CACHE = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheKey(query) {
  return `ushoe_cache_${CACHE_VERSION}_${query.toLowerCase().trim()}`;
}

export function getCached(query) {
  const key = cacheKey(query);
  // Check memory first (fastest)
  if (MEM_CACHE.has(key)) {
    const entry = MEM_CACHE.get(key);
    if (Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
    MEM_CACHE.delete(key);
  }
  // Check localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const entry = JSON.parse(raw);
      if (Date.now() - entry.ts < CACHE_TTL_MS) {
        MEM_CACHE.set(key, entry);
        return entry.data;
      }
      localStorage.removeItem(key);
    }
  } catch {}
  return null;
}

export function setCache(query, data) {
  const key = cacheKey(query);
  const entry = { ts: Date.now(), data };
  MEM_CACHE.set(key, entry);
  try { localStorage.setItem(key, JSON.stringify(entry)); } catch {}
}

// Preloaded trending data
let trendingCache = null;
let trendingTs = 0;

export function getTrendingCache() {
  if (trendingCache && Date.now() - trendingTs < 30 * 60 * 1000) return trendingCache;
  return null;
}

export function setTrendingCache(data) {
  trendingCache = data;
  trendingTs = Date.now();
}