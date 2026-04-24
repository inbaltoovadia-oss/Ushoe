/**
 * agentCache — in-memory + sessionStorage cache for Deal & Inventory agent results.
 * Keyed by shoe ID + location + size/color. TTL: 10 min.
 */

const CACHE_TTL = 10 * 60 * 1000;
const PREFIX = "ushoe_agent_";

function cacheKey(type, shoeId, extra = "") {
  return `${PREFIX}${type}_${shoeId}_${extra}`;
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
    sessionStorage.removeItem(key);
  } catch (_) {}
  return null;
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
}

export function getCachedDeals(shoeId, city, size = "", color = "") {
  return readCache(cacheKey("deals", shoeId, `${city}_${size}_${color}`));
}

export function setCachedDeals(shoeId, city, data, size = "", color = "") {
  writeCache(cacheKey("deals", shoeId, `${city}_${size}_${color}`), data);
}

export function getCachedStock(shoeId, city, size = "", color = "") {
  return readCache(cacheKey("stock", shoeId, `${city}_${size}_${color}`));
}

export function setCachedStock(shoeId, city, data, size = "", color = "") {
  writeCache(cacheKey("stock", shoeId, `${city}_${size}_${color}`), data);
}

export function getCachedWebDeals(city) {
  return readCache(cacheKey("webdeals", "global", city));
}

export function setCachedWebDeals(city, data) {
  writeCache(cacheKey("webdeals", "global", city), data);
}

// Quick-check indicator cache (lightweight per-card)
export function getCachedIndicator(shoeId, city) {
  return readCache(cacheKey("indicator", shoeId, city));
}

export function setCachedIndicator(shoeId, city, data) {
  writeCache(cacheKey("indicator", shoeId, data ? "hit" : "miss"), data);
  writeCache(cacheKey("indicator", shoeId, city), data);
}