/**
 * agentCache — localStorage-backed cache for all agent results.
 *
 * TTLs:
 *   deals        → 3 hours
 *   webdeals     → 3 hours
 *   stock        → 2 hours
 *   shipping     → 24 hours
 *   trends       → 14 days
 *   indicator    → 2 hours
 *   nearby       → 6 hours  (store locations don't change often)
 *
 * Low Credit Mode: when localStorage key "ushoe_low_credit" is set to "1",
 * TTLs are doubled and non-essential agents skip live fetches.
 *
 * City normalization: cities within the same metro area share a cache key
 * by stripping common suffixes, punctuation, and lowercasing.
 */

export function isLowCreditMode() {
  try { return localStorage.getItem("ushoe_low_credit") === "1"; } catch { return false; }
}
export function setLowCreditMode(on) {
  try { localStorage.setItem("ushoe_low_credit", on ? "1" : "0"); } catch {}
}

const PREFIX = "ushoe_agent_";

const TTL = {
  deals:     3  * 60 * 60 * 1000,
  webdeals:  3  * 60 * 60 * 1000,
  stock:     2  * 60 * 60 * 1000,
  shipping:  24 * 60 * 60 * 1000,
  trends:    14 * 24 * 60 * 60 * 1000,
  indicator: 2  * 60 * 60 * 1000,
  nearby:    6  * 60 * 60 * 1000,   // 6 hours — store locations are stable
};

/**
 * Normalize a city string so nearby/equivalent locations share the same key.
 * e.g. "Tel-Aviv", "Tel Aviv", "TLV", "tel aviv-jaffa" → "telaviv"
 */
export function normalizeCity(city = "") {
  return city
    .toLowerCase()
    .replace(/\s*-\s*/g, "")       // remove hyphens and surrounding spaces
    .replace(/[^a-z0-9\u0080-\uFFFF]/g, "") // strip punctuation/spaces
    .replace(/(city|metro|downtown|district|area|county|province|state)$/, "") // strip generic suffixes
    .trim();
}

function cacheKey(type, id, extra = "") {
  return `${PREFIX}${type}_${id}_${extra}`;
}

function readCache(type, key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    const ttl = (TTL[type] || TTL.stock) * (isLowCreditMode() ? 2 : 1);
    if (Date.now() - ts < ttl) return data;
    localStorage.removeItem(key);
  } catch (_) {}
  return null;
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {
    // Storage full — purge old ushoe keys and retry
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch (_2) {}
  }
}

// ── Deals ──────────────────────────────────────────────────────────────────
export function getCachedDeals(shoeId, city, size = "", color = "") {
  const key = cacheKey("deals", shoeId, `${normalizeCity(city)}_${size}_${color}`);
  return readCache("deals", key);
}
export function setCachedDeals(shoeId, city, data, size = "", color = "") {
  writeCache(cacheKey("deals", shoeId, `${normalizeCity(city)}_${size}_${color}`), data);
}

// ── Stock / Inventory ──────────────────────────────────────────────────────
export function getCachedStock(shoeId, city, size = "", color = "") {
  return readCache("stock", cacheKey("stock", shoeId, `${normalizeCity(city)}_${size}_${color}`));
}
export function setCachedStock(shoeId, city, data, size = "", color = "") {
  writeCache(cacheKey("stock", shoeId, `${normalizeCity(city)}_${size}_${color}`), data);
}

// ── Web Deals ─────────────────────────────────────────────────────────────
export function getCachedWebDeals(cityQuery) {
  return readCache("webdeals", cacheKey("webdeals", "global", cityQuery));
}
export function setCachedWebDeals(cityQuery, data) {
  writeCache(cacheKey("webdeals", "global", cityQuery), data);
}

// ── Nearby Stores ─────────────────────────────────────────────────────────
export function getCachedNearby(shoeId, city, size = "") {
  return readCache("nearby", cacheKey("nearby", shoeId, `${normalizeCity(city)}_${size}`));
}
export function setCachedNearby(shoeId, city, data, size = "") {
  writeCache(cacheKey("nearby", shoeId, `${normalizeCity(city)}_${size}`), data);
}

// ── Shipping ──────────────────────────────────────────────────────────────
export function getCachedShipping(shoeId, country, city) {
  return readCache("shipping", cacheKey("shipping", shoeId, `${country}_${normalizeCity(city)}`));
}
export function setCachedShipping(shoeId, country, city, data) {
  writeCache(cacheKey("shipping", shoeId, `${country}_${normalizeCity(city)}`), data);
}

// ── Trends ────────────────────────────────────────────────────────────────
export function getCachedTrends(city) {
  return readCache("trends", cacheKey("trends", "global", normalizeCity(city)));
}
export function setCachedTrends(city, data) {
  writeCache(cacheKey("trends", "global", normalizeCity(city)), data);
}

// ── Clear All ────────────────────────────────────────────────────────────
export function clearAllAgentCache() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch (_) {}
}

// ── Deal Indicator (per card) ─────────────────────────────────────────────
export function getCachedIndicator(shoeId, city) {
  return readCache("indicator", cacheKey("indicator", shoeId, city));
}
export function setCachedIndicator(shoeId, city, data) {
  writeCache(cacheKey("indicator", shoeId, city), data);
}