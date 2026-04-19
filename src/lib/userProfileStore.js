/**
 * userProfileStore — centralised user signal aggregator.
 * Combines survey data (UserProfile entity) + behavioral signals (searches, wishlist, price tracks)
 * into a single profile object used by the personalization engine.
 *
 * Shape of returned profile:
 * {
 *   preferred_brands: string[],
 *   budget_max: number,
 *   main_use: string[],
 *   style_preference: string[],
 *   gender: string,
 *   survey_completed: boolean,
 *   // behavioral (derived from history)
 *   searched_brands: string[],     // brands extracted from search queries
 *   searched_categories: string[], // categories from search history
 *   tracked_brands: string[],      // brands the user is price-tracking
 *   wishlist_brands: string[],
 *   wishlist_categories: string[],
 *   recent_queries: string[],
 *   budget_behavioral: number|null, // inferred from wishlist prices
 * }
 */

import { base44 } from "@/api/base44Client";

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

const listeners = new Set();

export function subscribeUserProfile(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function invalidateProfileCache() {
  _cache = null;
  _cacheTs = 0;
  listeners.forEach(fn => fn());
}

// Known brand keywords to extract from search queries
const BRAND_KEYWORDS = ["nike", "adidas", "jordan", "new balance", "puma", "reebok", "converse", "vans", "hoka", "asics", "saucony", "brooks", "on running", "salomon"];
const CATEGORY_KEYWORDS = ["running", "basketball", "casual", "training", "lifestyle", "walking", "hiking", "tennis", "skateboarding"];

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

export async function getUserProfile(force = false) {
  const now = Date.now();
  if (!force && _cache && now - _cacheTs < CACHE_TTL) return _cache;

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
  return _cache;
}