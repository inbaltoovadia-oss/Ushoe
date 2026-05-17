/**
 * WEB DEALS AGENT
 * Fast sneaker deals filtered by user location, using gemini_3_flash for speed.
 */

import { base44 } from "@/api/base44Client";
import { getCachedWebDeals, setCachedWebDeals } from "./agentCache";
import { getLocation } from "./locationStore";

// Verified retailer search URL builders — always work, never 404
const RETAILER_SEARCH_URLS = {
  "nike":          (q, cc) => `https://www.nike.com/${cc.toLowerCase()}/w?q=${encodeURIComponent(q)}`,
  "adidas":        (q, cc) => `https://www.adidas.com/${cc.toLowerCase()}/search?q=${encodeURIComponent(q)}`,
  "foot locker":   (q)     => `https://www.footlocker.com/search?query=${encodeURIComponent(q)}`,
  "finish line":   (q)     => `https://www.finishline.com/store/search?query=${encodeURIComponent(q)}`,
  "zappos":        (q)     => `https://www.zappos.com/search?term=${encodeURIComponent(q)}`,
  "dsw":           (q)     => `https://www.dsw.com/en/us/search?searchtext=${encodeURIComponent(q)}`,
  "jd sports":     (q)     => `https://www.jdsports.com/search/?q=${encodeURIComponent(q)}`,
  "new balance":   (q, cc) => `https://www.newbalance.com/${cc.toLowerCase()}/en-${cc.toLowerCase()}/search?q=${encodeURIComponent(q)}`,
  "puma":          (q)     => `https://us.puma.com/en/us/search?q=${encodeURIComponent(q)}`,
  "asics":         (q, cc) => `https://www.asics.com/${cc.toLowerCase()}/en-${cc.toLowerCase()}/search?q=${encodeURIComponent(q)}`,
  "reebok":        (q)     => `https://www.reebok.com/us/search?q=${encodeURIComponent(q)}`,
  "converse":      (q)     => `https://www.converse.com/us/en/search?q=${encodeURIComponent(q)}`,
  "vans":          (q)     => `https://www.vans.com/en-us/search?q=${encodeURIComponent(q)}`,
  "goat":          (q)     => `https://www.goat.com/search?query=${encodeURIComponent(q)}`,
  "stockx":        (q)     => `https://stockx.com/search?s=${encodeURIComponent(q)}`,
  "under armour":  (q)     => `https://www.underarmour.com/en-us/t/shoes/?q=${encodeURIComponent(q)}`,
};

function getRetailerSearchUrl(storeName, shoeName, brand, countryCode) {
  const key = (storeName || "").toLowerCase().trim();
  const query = `${brand || ""} ${shoeName || ""}`.trim();
  const cc = (countryCode || "us").toUpperCase();

  for (const [retailer, buildUrl] of Object.entries(RETAILER_SEARCH_URLS)) {
    if (key.includes(retailer) || retailer.includes(key)) {
      return buildUrl(query, cc);
    }
  }
  // Fallback: Google search scoped to retailer site
  return `https://www.google.com/search?q=${encodeURIComponent(`buy ${query} site:${key.replace(/\s+/g, "")}.com`)}`;
}

export async function runWebDealsAgent({ city, query = "", onStep }) {
  const loc = getLocation();
  const country = loc.country || "United States";
  const countryCode = loc.countryCode || "US";
  const cacheKey = `${city}_${country}_${query}`.toLowerCase().replace(/\s+/g, "_");

  const cached = getCachedWebDeals(cacheKey);
  if (cached) return cached;

  onStep?.("🌐 Connecting to live retailer feeds…");

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Find top 6 current sneaker/shoe deals shipping to ${country} (${city}). Use real web search.

Rules:
- Retailer MUST ship to ${country}
- Min 10% discount, active sale only
- Known retailers only: Nike, Adidas, New Balance, ASICS, Puma, Foot Locker, Zappos, JD Sports, Reebok, Converse, Vans, GOAT, StockX
- Do NOT invent product URLs — only return retailer name and shoe name
${query ? `- Focus on: ${query}` : ""}

For each deal return: shoe_name, brand, deal_price (USD number), original_price (USD number), discount_pct (number), store_name, category, deal_expires (string or null), ships_to_country (must be true for ${country}).
Also return: summary (1 sentence about best deals for shoppers in ${country}).`,
    add_context_from_internet: true,
    model: "gemini_3_flash",
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        deals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              shoe_name:        { type: "string" },
              brand:            { type: "string" },
              deal_price:       { type: "number" },
              original_price:   { type: "number" },
              discount_pct:     { type: "number" },
              store_name:       { type: "string" },
              category:         { type: "string" },
              deal_expires:     { type: "string" },
              ships_to_country: { type: "boolean" },
            },
          },
        },
      },
    },
  });

  onStep?.("✅ Deals found! Building links…");

  const deals = (res.deals || [])
    .filter(d => d.ships_to_country !== false && d.deal_price && d.original_price && d.store_name && d.shoe_name)
    .map(d => ({
      ...d,
      store_url: getRetailerSearchUrl(d.store_name, d.shoe_name, d.brand, countryCode),
    }));

  const result = { summary: res.summary || "", deals };
  setCachedWebDeals(cacheKey, result);
  return result;
}