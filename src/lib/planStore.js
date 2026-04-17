// Central plan store — persisted to localStorage
const PLAN_KEY = "ushoe_plan";
const DAILY_SEARCH_KEY = "ushoe_search_count";
const DAILY_DATE_KEY = "ushoe_search_date";

const listeners = new Set();
const notify = () => listeners.forEach(fn => fn(getPlan()));

export const PLAN_LIMITS = {
  free: {
    aiSearchesPerDay: 5,
    wishlistMax: 10,
    compareMax: 2,
    webResults: false,
    advancedFilters: false,
    priceAlerts: false,
    outfitMatcher: false,
    fitPredictor: false,
  },
  pro: {
    aiSearchesPerDay: Infinity,
    wishlistMax: Infinity,
    compareMax: 4,
    webResults: true,
    advancedFilters: true,
    priceAlerts: true,
    outfitMatcher: true,
    fitPredictor: true,
  },
  brand: {
    aiSearchesPerDay: Infinity,
    wishlistMax: Infinity,
    compareMax: 4,
    webResults: true,
    advancedFilters: true,
    priceAlerts: true,
    outfitMatcher: true,
    fitPredictor: true,
    sponsoredListings: true,
  },
};

export function getPlan() {
  return localStorage.getItem(PLAN_KEY) || "free";
}

export function setPlan(planId) {
  localStorage.setItem(PLAN_KEY, planId);
  notify();
}

export function subscribePlan(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLimits() {
  return PLAN_LIMITS[getPlan()] || PLAN_LIMITS.free;
}

export function canUse(feature) {
  return !!getLimits()[feature];
}

// Daily AI search counter
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export function getSearchesUsedToday() {
  const today = getTodayStr();
  if (localStorage.getItem(DAILY_DATE_KEY) !== today) {
    localStorage.setItem(DAILY_DATE_KEY, today);
    localStorage.setItem(DAILY_SEARCH_KEY, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(DAILY_SEARCH_KEY) || "0", 10);
}

export function incrementSearchCount() {
  const today = getTodayStr();
  if (localStorage.getItem(DAILY_DATE_KEY) !== today) {
    localStorage.setItem(DAILY_DATE_KEY, today);
    localStorage.setItem(DAILY_SEARCH_KEY, "0");
  }
  const next = getSearchesUsedToday() + 1;
  localStorage.setItem(DAILY_SEARCH_KEY, String(next));
  return next;
}

export function canSearch() {
  const limits = getLimits();
  if (limits.aiSearchesPerDay === Infinity) return true;
  return getSearchesUsedToday() < limits.aiSearchesPerDay;
}