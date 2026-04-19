/**
 * personalizationEngine — deterministic shoe scoring.
 *
 * Scores each shoe 0–100 based on:
 *   - Survey: brand loyalty, category match, budget, gender (high weight)
 *   - Behavior: searched brands/categories, wishlist brands, price-tracked brands
 *   - Trend: shoe's trending_score from the DB (updated daily by refreshTrends)
 *
 * Exported:
 *   scoreShoe(shoe, profile) → number
 *   rankShoes(shoes, profile, opts) → shoes sorted by score, with _score and _matchReasons attached
 *   buildExplanation(profile) → string for display
 */

const WEIGHTS = {
  // Survey
  surveyBrand: 35,
  surveyCategory: 30,
  surveyBudget: 15,
  surveyGender: 10,
  // Behavior
  behaviorBrand: 20,    // searched or wishlisted brand
  behaviorCategory: 15, // searched category
  behaviorTracked: 25,  // actively tracking price (strong intent signal)
  // Trend
  trending: 20,         // is_trending flag
  trendScore: 10,       // normalised trending_score value
};

export function scoreShoe(shoe, profile) {
  if (!profile) return (shoe.trending_score || 0) * 0.1;

  let score = 0;
  const reasons = [];

  // --- Survey signals ---
  if (profile.preferred_brands?.length && profile.preferred_brands.includes(shoe.brand)) {
    score += WEIGHTS.surveyBrand;
    reasons.push(`favorite brand`);
  }
  if (profile.main_use?.length && profile.main_use.includes(shoe.category)) {
    score += WEIGHTS.surveyCategory;
    reasons.push(`matches your use`);
  }
  const budget = profile.budget_max || profile.budget_behavioral;
  if (budget && shoe.price <= budget) {
    score += WEIGHTS.surveyBudget;
  } else if (budget && shoe.price > budget * 1.2) {
    score -= 10; // over budget penalty
  }
  if (profile.gender && (shoe.gender === profile.gender || shoe.gender === "Unisex" || !shoe.gender)) {
    score += WEIGHTS.surveyGender;
  }

  // --- Behavioral signals ---
  if (profile.wishlist_brands?.includes(shoe.brand) || profile.searched_brands?.includes(shoe.brand)) {
    score += WEIGHTS.behaviorBrand;
    reasons.push(`brand you like`);
  }
  if (profile.searched_categories?.includes(shoe.category)) {
    score += WEIGHTS.behaviorCategory;
    reasons.push(`category you search`);
  }
  if (profile.tracked_brands?.includes(shoe.brand)) {
    score += WEIGHTS.behaviorTracked;
    reasons.push(`brand you track`);
  }

  // --- Trend signals ---
  if (shoe.is_trending) {
    score += WEIGHTS.trending;
    reasons.push(`trending`);
  }
  if (shoe.trending_score) {
    // Normalise 0–100 range → 0–trendScore weight
    score += Math.min(WEIGHTS.trendScore, (shoe.trending_score / 100) * WEIGHTS.trendScore);
  }

  return { score, reasons };
}

/**
 * opts.excludeIds — shoe IDs to skip (e.g. already wishlisted)
 * opts.limit      — max results (default 50)
 * opts.minScore   — minimum score threshold (default 0)
 */
export function rankShoes(shoes, profile, opts = {}) {
  const { excludeIds = [], limit = 50 } = opts;

  return shoes
    .filter(s => !excludeIds.includes(s.id))
    .map(s => {
      const result = scoreShoe(s, profile);
      const score = typeof result === "number" ? result : result.score;
      const reasons = typeof result === "object" ? result.reasons : [];
      return { ...s, _score: score, _matchReasons: reasons };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/**
 * Builds a human-readable explanation for the "For You" section header.
 */
export function buildExplanation(profile) {
  if (!profile) return "The hottest shoes right now";

  const parts = [];
  if (profile.preferred_brands?.length) {
    parts.push(profile.preferred_brands.slice(0, 2).join(" & "));
  }
  if (profile.main_use?.length) {
    parts.push(profile.main_use.slice(0, 2).join(", ").toLowerCase());
  }
  if (profile.budget_max) {
    parts.push(`budget up to $${profile.budget_max}`);
  } else if (profile.budget_behavioral) {
    parts.push(`~$${profile.budget_behavioral} avg spend`);
  }

  if (parts.length === 0) {
    return profile.recent_queries?.length
      ? `Based on your recent searches`
      : "The hottest shoes right now";
  }
  return `Matched to: ${parts.join(" · ")}`;
}

/**
 * Returns a persona summary string used in AI prompts.
 */
export function buildPersonaSummary(profile) {
  if (!profile) return "Unknown user — use trending data only.";

  const lines = [];
  if (profile.gender) lines.push(`Gender: ${profile.gender}`);
  if (profile.preferred_brands?.length) lines.push(`Favourite brands: ${profile.preferred_brands.join(", ")}`);
  if (profile.main_use?.length) lines.push(`Primary use: ${profile.main_use.join(", ")}`);
  if (profile.style_preference?.length) lines.push(`Style: ${profile.style_preference.join(", ")}`);
  if (profile.budget_max) lines.push(`Survey budget: $${profile.budget_max}`);
  if (profile.budget_behavioral) lines.push(`Avg wishlist price: $${profile.budget_behavioral}`);
  if (profile.searched_brands?.length) lines.push(`Searched brands: ${profile.searched_brands.join(", ")}`);
  if (profile.searched_categories?.length) lines.push(`Searched categories: ${profile.searched_categories.join(", ")}`);
  if (profile.wishlist_brands?.length) lines.push(`Wishlisted brands: ${profile.wishlist_brands.join(", ")}`);
  if (profile.tracked_brands?.length) lines.push(`Price-tracking: ${profile.tracked_brands.join(", ")}`);
  if (profile.recent_queries?.length) lines.push(`Recent searches: ${profile.recent_queries.slice(0, 5).join(", ")}`);

  return lines.length ? lines.join("\n") : "No profile signals yet.";
}