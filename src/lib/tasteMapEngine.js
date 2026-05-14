/**
 * tasteMapEngine — generates personalized "Community Taste Map" trends.
 *
 * Strategy:
 * 1. Analyze internal catalog (trending_score, categories, brands, features)
 * 2. Cross-reference with the user's profile signals
 * 3. Use LLM to generate 6 taste trend cards — once per day, cached in localStorage
 *
 * Refresh: once per day OR when profile fingerprint changes
 */

import { base44 } from "@/api/base44Client";
import { buildPersonaSummary } from "./personalizationEngine";

const CACHE_KEY = "ushoe_taste_map";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function profileFingerprint(profile) {
  return [
    ...(profile?.preferred_brands || []),
    ...(profile?.main_use || []),
    ...(profile?.style_preference || []),
    profile?.gender || "",
    String(profile?.budget_max || ""),
    ...(profile?.wishlist_brands || []).slice(0, 3),
    ...(profile?.searched_categories || []).slice(0, 3),
  ].join("|");
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCache(fingerprint, trends) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      fingerprint,
      trends,
      generatedAt: Date.now(),
    }));
  } catch {}
}

export function clearTasteMapCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

/**
 * Build community context from the catalog.
 * Returns a compact summary string for the LLM prompt.
 */
function buildCommunityContext(shoes) {
  // Category breakdown
  const categoryCount = {};
  const brandCount = {};
  const trendingBrands = [];
  const trendingCategories = [];

  shoes.forEach(s => {
    if (s.category) categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
    if (s.brand) brandCount[s.brand] = (brandCount[s.brand] || 0) + 1;
    if (s.is_trending) {
      if (s.brand && !trendingBrands.includes(s.brand)) trendingBrands.push(s.brand);
      if (s.category && !trendingCategories.includes(s.category)) trendingCategories.push(s.category);
    }
  });

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  const topBrands = Object.entries(brandCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
  const highScoreShoes = shoes
    .filter(s => (s.trending_score || 0) > 60)
    .slice(0, 12)
    .map(s => `${s.brand} ${s.name} (${s.category}, $${s.price}${s.colorway ? ', ' + s.colorway : ''})`);

  return [
    `Top categories in catalog: ${topCategories.join(", ")}`,
    `Top brands: ${topBrands.join(", ")}`,
    `Trending brands right now: ${trendingBrands.slice(0, 6).join(", ")}`,
    `Trending categories: ${trendingCategories.slice(0, 5).join(", ")}`,
    `High-score shoes: ${highScoreShoes.join("; ")}`,
  ].join("\n");
}

/**
 * Main entry point.
 * Returns array of 6 taste trend objects.
 */
export async function getTasteMapTrends(profile, force = false) {
  const fp = profileFingerprint(profile);
  const cached = loadCache();

  if (!force && cached && cached.fingerprint === fp) {
    const age = Date.now() - (cached.generatedAt || 0);
    if (age < CACHE_TTL_MS && cached.trends?.length > 0) {
      return cached.trends;
    }
  }

  // Fetch catalog data
  const shoes = await base44.entities.Shoe.list("-trending_score", 100);
  const communityContext = buildCommunityContext(shoes);
  const personaContext = buildPersonaSummary(profile);

  const prompt = `You are a sneaker culture trend analyst for the app uShoe.

COMMUNITY DATA (internal app catalog):
${communityContext}

USER PROFILE:
${personaContext}

Generate exactly 6 "Community Taste Map" trend cards personalized to this user.
Each trend should feel like it comes from observing what people with SIMILAR tastes are wearing/buying.

Use a variety of trend types: aesthetics, materials, silhouettes, color palettes, brand movements, use-cases.

Examples of good titles:
- "Earth-tone runners are surging"
- "Retro Nike styles dominate your taste group"
- "Chunky basketball silhouettes are cooling off"
- "People like you are switching to minimal whites"
- "Suede textures are replacing mesh in your taste group"

Return a JSON object with a "trends" array. Each item must have:
- id: unique string slug (e.g. "earth-tone-runners")
- title: short punchy trend headline (max 7 words)
- subtitle: "people with your taste" style descriptor (e.g. "Popular in your style group")
- explanation: 1-2 sentence insight about why this trend is happening, tied to the user's profile. Max 120 chars.
- direction: "rising" | "peak" | "cooling" — momentum of this trend
- momentum: number 1-100 (how strong this trend is)
- type: "aesthetic" | "brand" | "color" | "silhouette" | "material" | "use-case"
- colorAccent: a tailwind-safe hex color that visually represents this trend (e.g. "#a0522d" for earthy, "#e5e7eb" for minimal white)
- exampleShoeNames: array of 2-3 shoe names from the catalog above that represent this trend
- emoji: single emoji that best represents this trend`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        trends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              subtitle: { type: "string" },
              explanation: { type: "string" },
              direction: { type: "string" },
              momentum: { type: "number" },
              type: { type: "string" },
              colorAccent: { type: "string" },
              exampleShoeNames: { type: "array", items: { type: "string" } },
              emoji: { type: "string" },
            }
          }
        }
      }
    }
  });

  const trends = result?.trends || [];
  if (trends.length > 0) saveCache(fp, trends);
  return trends;
}