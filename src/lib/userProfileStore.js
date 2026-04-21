/**
 * userProfileStore — centralised user signal aggregator.
 * Combines survey data (UserProfile entity) + behavioral signals (searches, wishlist, price tracks)
 * into a single profile object used by the personalization engine.
 *
 * Caching strategy:
 *  - In-memory cache (5 min TTL) for within-session speed.
 *  - sessionStorage cache (per user) so page reloads don't re-fetch everything.
 */

import { base44 } from "@/api/base44Client";

const SESSION_KEY_PREFIX = "ushoe_profile_";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

let _cache = null;
let _cacheTs = 0;
let _userEmail = null;

const listeners = new Set();

export function initUserProfileStore(email) {
  if (_userEmail !== email) {
    // Different user — clear in-memory cache so we re-fetch
    _userEmail = email || null;
    _cache = null;
    _cacheTs = 0;
  }
}

export function subscribeUserProfile(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function invalidateProfileCache() {
  _cache = null;
  _cacheTs = 0;
  if (_userEmail) {
    try { sessionStorage.removeItem(SESSION_KEY_PREFIX + _userEmail); } catch (_) {}
  }
  listeners.forEach(fn => fn());
}

// Known brand / category keywords
const BRAND_KEYWORDS = ["nike", "adidas", "jordan", "new balance", "puma", "reebok", "converse", "vans", "hoka", "asics", "saucony", "brooks", "on running", "salomon"];
const CATEGORY_KEYWORDS = ["running", "basketball", "casual", "training", "lifestyle", "walking", "hiking", "tennis", "skateboarding", "cleats", "sandals", "flip flops", "slides", "golf", "crocs"];

function extractBrands(queries) {
  const found = new Set();
  queries.forEach(q => {
    const lower = q.toLowerCase();
    BRAND_KEYWORDS.forEach(b => { if (lower.includes(b)) found.add(capitalise(b)); });
  });
  return Array.from(found);
}

function extractCategories(queries) {
  const found = new Set();
  queries.forEach(q => {
    const lower = q.toLowerCase();
    CATEGORY_KEYWORDS.forEach(c => { if (lower.includes(c)) found.add(capitalise(c)); });
  });
  return Array.from(found);
}

function capitalise(str) {
  return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function readSessionCache() {
  if (!_userEmail) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + _userEmail);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return { data, ts };
  } catch (_) {}
  return null;
}

function writeSessionCache(data) {
  if (!_userEmail) return;
  try {
    sessionStorage.setItem(
      SESSION_KEY_PREFIX + _userEmail,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch (_) {}
}

export async function getUserProfile(force = false) {
  const now = Date.now();

  // 1. In-memory cache
  if (!force && _cache && now - _cacheTs < CACHE_TTL) return _cache;

  // 2. sessionStorage cache (survives page reload)
  if (!force) {
    const session = readSessionCache();
    if (session) {
      _cache = session.data;
      _cacheTs = session.ts;
      return _cache;
    }
  }

  // 3. Fetch from API
  const [profiles, searchHistory, wishlistItems, priceTracks] = await Promise.all([
    base44.entities.UserProfile.list("-created_date", 1),
    base44.entities.SearchHistory.list("-created_date", 30),
    base44.entities.WishlistItem.list("-created_date", 50),
    base44.entities.PriceTrack.list("-created_date", 30),
  ]);

  const survey = profiles[0] || {};
  const queries = searchHistory.map(s => s.query);
  const wishlistPrices = wishlistItems.map(w => w.shoe_price).filter(Boolean);
  const avgWishlistPrice = wishlistPrices.length
    ? Math.round(wishlistPrices.reduce((a, b) => a + b, 0) / wishlistPrices.length)
    : null;

  _cache = {
    // Survey data
    preferred_brands: survey.preferred_brands || [],
    budget_max: survey.budget_max || null,
    main_use: survey.main_use || [],
    style_preference: survey.style_preference || [],
    gender: survey.gender || null,
    survey_completed: !!survey.survey_completed,

    // Behavioral signals
    recent_queries: queries,
    searched_brands: extractBrands(queries),
    searched_categories: extractCategories(queries),
    tracked_brands: [...new Set(priceTracks.map(t => t.shoe_brand).filter(Boolean))],
    wishlist_brands: [...new Set(wishlistItems.map(w => w.shoe_brand).filter(Boolean))],
    wishlist_categories: [],
    budget_behavioral: avgWishlistPrice,
  };

  _cacheTs = now;
  writeSessionCache(_cache);
  return _cache;
}