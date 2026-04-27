/**
 * agentCache — localStorage-backed cache for all agent results.
 *
 * TTLs (credit-conscious):
 *   deals        → 7 days   (prices change weekly)
 *   web deals    → 7 days
 *   inventory    → 24 hours (stock changes daily)
 *   shipping     → 7 days   (policies rarely change)
 *   trends       → 14 days  (trends shift slowly)
 *   indicator    → 24 hours
 *
 * Low Credit Mode: when localStorage key "ushoe_low_credit" is set to "1",
 * TTLs are doubled and non-essential agents skip live fetches.
 */

export function isLowCreditMode() {
  try { return localStorage.getItem("ushoe_low_credit") === "1"; } catch { return false; }
}
export function setLowCreditMode(on) {
  try { localStorage.setItem("ushoe_low_credit", on ? "1" : "0"); } catch {}
}

const PREFIX = "ushoe_agent_";

const TTL = {
  deals:     7  * 24 * 60 * 60 * 1000,
  webdeals:  7  * 24 * 60 * 60 * 1000,
  stock:     24 * 60 * 60 * 1000,
  shipping:  7  * 24 * 60 * 60 * 1000,
  trends:    14 * 24 * 60 * 60 * 1000,
  indicator: 24 * 60 * 60 * 1000,
};

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
  const key = cacheKey("deals", shoeId, `${city}_${size}_${color}`);
  return readCache("deals", key);
}
export function setCachedDeals(shoeId, city, data, size = "", color = "") {
  writeCache(cacheKey("deals", shoeId, `${city}_${size}_${color}`), data);
}

// ── Stock / Inventory ──────────────────────────────────────────────────────
export function getCachedStock(shoeId, city, size = "", color = "") {
  return readCache("stock", cacheKey("stock", shoeId, `${city}_${size}_${color}`));
}
export function setCachedStock(shoeId, city, data, size = "", color = "") {
  writeCache(cacheKey("stock", shoeId, `${city}_${size}_${color}`), data);
}

// ── Web Deals ─────────────────────────────────────────────────────────────
export function getCachedWebDeals(cityQuery) {
  return readCache("webdeals", cacheKey("webdeals", "global", cityQuery));
}
export function setCachedWebDeals(cityQuery, data) {
  writeCache(cacheKey("webdeals", "global", cityQuery), data);
}

// ── Shipping ──────────────────────────────────────────────────────────────
export function getCachedShipping(shoeId, country, city) {
  return readCache("shipping", cacheKey("shipping", shoeId, `${country}_${city}`));
}
export function setCachedShipping(shoeId, country, city, data) {
  writeCache(cacheKey("shipping", shoeId, `${country}_${city}`), data);
}

// ── Trends ────────────────────────────────────────────────────────────────
export function getCachedTrends(city) {
  return readCache("trends", cacheKey("trends", "global", city));
}
export function setCachedTrends(city, data) {
  writeCache(cacheKey("trends", "global", city), data);
}

// ── Deal Indicator (per card) ─────────────────────────────────────────────
export function getCachedIndicator(shoeId, city) {
  return readCache("indicator", cacheKey("indicator", shoeId, city));
}
export function setCachedIndicator(shoeId, city, data) {
  writeCache(cacheKey("indicator", shoeId, city), data);
}