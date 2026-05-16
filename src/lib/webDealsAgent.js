/**
 * WEB DEALS AGENT
 * Discovers non-catalog shoe deals from live web sources, filtered by user location.
 * Uses retailer search URLs (never hallucinated product URLs) to avoid 404s.
 */

import { base44 } from "@/api/base44Client";
import { getCachedWebDeals, setCachedWebDeals } from "./agentCache";
import { getLocation } from "./locationStore";

// Verified retailer search URL templates — always work, never 404
const RETAILER_SEARCH_URLS = {
  "nike":          (q) => `https://www.nike.com/w?q=${encodeURIComponent(q)}&vst=${encodeURIComponent(q)}`,
  "adidas":        (q) => `https://www.adidas.com/us/search?q=${encodeURIComponent(q)}`,
  "foot locker":   (q) => `https://www.footlocker.com/search?query=${encodeURIComponent(q)}`,
  "finish line":   (q) => `https://www.finishline.com/store/search?query=${encodeURIComponent(q)}`,
  "zappos":        (q) => `https://www.zappos.com/search?term=${encodeURIComponent(q)}`,
  "dsw":           (q) => `https://www.dsw.com/en/us/search?searchtext=${encodeURIComponent(q)}`,
  "jd sports":     (q) => `https://www.jdsports.com/search/?q=${encodeURIComponent(q)}`,
  "new balance":   (q) => `https://www.newbalance.com/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  "puma":          (q) => `https://us.puma.com/en/us/search?q=${encodeURIComponent(q)}`,
  "asics":         (q) => `https://www.asics.com/us/en-us/search?q=${encodeURIComponent(q)}`,
  "reebok":        (q) => `https://www.reebok.com/us/search?q=${encodeURIComponent(q)}`,
  "under armour":  (q) => `https://www.underarmour.com/en-us/t/shoes/?q=${encodeURIComponent(q)}`,
  "converse":      (q) => `https://www.converse.com/us/en/search?q=${encodeURIComponent(q)}`,
  "vans":          (q) => `https://www.vans.com/en-us/search?q=${encodeURIComponent(q)}`,
  "goat":          (q) => `https://www.goat.com/search?query=${encodeURIComponent(q)}`,
  "stockx":        (q) => `https://stockx.com/search?s=${encodeURIComponent(q)}`,
};

function getRetailerSearchUrl(storeName, shoeName, brand) {
  const key = (storeName || "").toLowerCase().trim();
  const query = `${brand || ""} ${shoeName || ""}`.trim();

  for (const [retailer, buildUrl] of Object.entries(RETAILER_SEARCH_URLS)) {
    if (key.includes(retailer) || retailer.includes(key)) {
      return buildUrl(query);
    }
  }

  // Fallback: retailer homepage search via Google
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} site:${key.replace(/\s+/g, "")}.com`)}`;
}

export async function runWebDealsAgent({ city, query = "" }) {
  const loc = getLocation();
  const country = loc.country || "United States";
  const cacheKey = (city + country + query).toLowerCase().replace(/\s+/g, "_");

  const cached = getCachedWebDeals(cacheKey);
  if (cached) return cached;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a WEB DEALS AGENT. Search the web right now for the best current sneaker/shoe deals from major retailers that ship to ${city}, ${country}.

${query ? `Focus on: ${query}` : "Find the hottest deals across all brands and styles."}

STRICT RULES:
- Only include deals from retailers that DEFINITELY ship to ${country}
- Must be an ACTIVE sale with real discount (min 10% off)
- Only well-known retailers: Nike, Adidas, New Balance, ASICS, Puma, Foot Locker, Finish Line, DSW, Zappos, GOAT, StockX, JD Sports, Reebok, Converse, Vans, Under Armour
- Do NOT invent or guess product page URLs — only return the retailer name and shoe name, the system will build the correct URL

Return up to 8 deals. For each deal return:
- shoe_name: full product name (e.g. "Nike Air Max 90")
- brand: brand name (e.g. "Nike")
- deal_price: current sale price in USD (number)
- original_price: original retail price in USD (number)
- discount_pct: percentage off (number)
- store_name: retailer name exactly as known (e.g. "Foot Locker", "Nike", "Zappos")
- category: one of: Running, Casual, Basketball, Lifestyle, Training, Hiking
- deal_expires: "Limited time" or specific date or null
- ships_to_country: ${country} (must be true)

Also return:
- summary: 1-sentence overview of best deals available right now for shoppers in ${country}`,
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
              shoe_name:          { type: "string" },
              brand:              { type: "string" },
              deal_price:         { type: "number" },
              original_price:     { type: "number" },
              discount_pct:       { type: "number" },
              store_name:         { type: "string" },
              category:           { type: "string" },
              deal_expires:       { type: "string" },
              ships_to_country:   { type: "boolean" },
            },
          },
        },
      },
    },
  });

  const deals = (res.deals || [])
    .filter(d => d.ships_to_country !== false && d.deal_price && d.original_price && d.store_name && d.shoe_name)
    .map(d => ({
      ...d,
      // Always build a reliable search URL — never trust hallucinated product URLs
      store_url: getRetailerSearchUrl(d.store_name, d.shoe_name, d.brand),
    }));

  const result = {
    summary: res.summary || "",
    deals,
  };

  setCachedWebDeals(cacheKey, result);
  return result;
}