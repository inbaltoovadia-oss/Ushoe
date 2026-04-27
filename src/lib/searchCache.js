/**
 * searchCache — in-memory + localStorage cache for AI search results.
 * Also deduplicates in-flight requests so identical concurrent searches
 * don't each fire a separate LLM call.
 */
const CACHE_VERSION = "v2";
const MEM_CACHE = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// In-flight deduplication: maps cache key → Promise
const IN_FLIGHT = new Map();

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
  // Resolve any waiting in-flight listeners
  IN_FLIGHT.delete(key);
}

/**
 * dedupeRequest — wraps an async factory so that if the same key is already
 * in-flight, the second caller awaits the same Promise instead of launching a new one.
 *
 * Usage:
 *   const result = await dedupeRequest(query, () => expensiveLLMCall(query));
 */
export function dedupeRequest(query, factory) {
  const key = cacheKey(query);

  // Return from cache immediately if available
  const cached = getCached(query);
  if (cached) return Promise.resolve(cached);

  // If already in-flight, return the same promise
  if (IN_FLIGHT.has(key)) return IN_FLIGHT.get(key);

  // Launch and track
  const promise = factory().then(result => {
    IN_FLIGHT.delete(key);
    return result;
  }).catch(err => {
    IN_FLIGHT.delete(key);
    throw err;
  });

  IN_FLIGHT.set(key, promise);
  return promise;
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