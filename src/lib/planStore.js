// Central plan store — persisted to localStorage, scoped per user
const PLAN_KEY_PREFIX = "ushoe_plan_";
const LEGACY_PLAN_KEY = "ushoe_plan";
const DAILY_SEARCH_KEY_PREFIX = "ushoe_search_count_";
const DAILY_DATE_KEY_PREFIX = "ushoe_search_date_";

const listeners = new Set();
const notify = () => listeners.forEach(fn => fn(getPlan()));

// Current user email — set on login
let _userEmail = null;

export function initPlanStore(email) {
  _userEmail = email || null;
  // Migrate legacy plan key if present and no user-scoped key exists yet
  if (_userEmail) {
    const userKey = PLAN_KEY_PREFIX + _userEmail;
    if (!localStorage.getItem(userKey)) {
      const legacy = localStorage.getItem(LEGACY_PLAN_KEY);
      if (legacy) localStorage.setItem(userKey, legacy);
    }
  }
  notify();
}

function planKey() {
  return _userEmail ? PLAN_KEY_PREFIX + _userEmail : LEGACY_PLAN_KEY;
}

function searchCountKey() {
  return _userEmail
    ? DAILY_SEARCH_KEY_PREFIX + _userEmail
    : "ushoe_search_count";
}

function searchDateKey() {
  return _userEmail
    ? DAILY_DATE_KEY_PREFIX + _userEmail
    : "ushoe_search_date";
}

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
  return localStorage.getItem(planKey()) || "free";
}

export function setPlan(planId) {
  localStorage.setItem(planKey(), planId);
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

// Daily AI search counter (per-user)
function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export function getSearchesUsedToday() {
  const today = getTodayStr();
  const dateKey = searchDateKey();
  const countKey = searchCountKey();
  if (localStorage.getItem(dateKey) !== today) {
    localStorage.setItem(dateKey, today);
    localStorage.setItem(countKey, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(countKey) || "0", 10);
}

export function incrementSearchCount() {
  const today = getTodayStr();
  const dateKey = searchDateKey();
  const countKey = searchCountKey();
  if (localStorage.getItem(dateKey) !== today) {
    localStorage.setItem(dateKey, today);
    localStorage.setItem(countKey, "0");
  }
  const next = getSearchesUsedToday() + 1;
  localStorage.setItem(countKey, String(next));
  return next;
}

export function canSearch() {
  const limits = getLimits();
  if (limits.aiSearchesPerDay === Infinity) return true;
  return getSearchesUsedToday() < limits.aiSearchesPerDay;
}