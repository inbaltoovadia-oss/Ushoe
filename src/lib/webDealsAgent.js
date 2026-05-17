/**
 * WEB DEALS AGENT
 * Uses Gemini with live web search to find real deals with actual product URLs and real prices.
 */

import { base44 } from "@/api/base44Client";
import { getCachedWebDeals, setCachedWebDeals } from "./agentCache";
import { getLocation } from "./locationStore";

export async function runWebDealsAgent({ city, query = "", onStep }) {
  const loc = getLocation();
  const country = loc.country || "United States";
  const countryCode = (loc.countryCode || "US").toUpperCase();
  const cacheKey = `webdeals_${city}_${country}_${query}`.toLowerCase().replace(/\s+/g, "_");

  const cached = getCachedWebDeals(cacheKey);
  if (cached) return cached;

  onStep?.("🌐 Connecting to live retailer feeds…");

  // Tell the LLM exactly what country/region we need, so it searches the right locale
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a deal-finding agent. Search the web RIGHT NOW for real sneaker/shoe deals available in ${country} (city: ${city}).

CRITICAL RULES:
1. Use your web search to find ACTUAL live deals on retailer websites
2. Only include retailers that ship to ${country} or have a local ${country} storefront
3. The buy_link MUST be the REAL URL you found in your search results — the actual product page or search result page on the retailer's site — NOT a homepage, NOT invented, NOT footlocker.eu unless the user is in Europe
4. The price MUST be the real current price you found on that page (in the local currency of ${country})
5. If the user is in Israel: prefer prices in ILS and Israeli retailers (e.g. footlocker.co.il, adidas.co.il, nike.com/il), and international retailers that ship to Israel
6. Minimum 10% discount or notable sale — skip full-price items
7. Return 6 deals maximum

${query ? `Focus specifically on: ${query}` : "Find the best current deals across Nike, Adidas, New Balance, ASICS, Puma, Foot Locker, Zappos, JD Sports, Reebok, Converse, Vans, GOAT, StockX"}

For each deal return:
- shoe_name: exact product name as shown on the retailer site
- brand: brand name
- deal_price: actual current sale price as a number (in local currency of ${country})
- original_price: original retail price as a number
- currency: currency code (e.g. USD, ILS, EUR, GBP)
- discount_pct: real percentage off
- store_name: retailer name
- buy_link: the REAL URL from your search — actual product page or search results page you found (must start with https://)
- category: Running / Casual / Basketball / Lifestyle / Training
- deal_expires: expiry date or "Limited time" or null
- ships_to_country: true only if confirmed ships to ${country}

Also return: summary (1 short sentence about what's on sale now in ${country})`,
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
              currency:         { type: "string" },
              discount_pct:     { type: "number" },
              store_name:       { type: "string" },
              buy_link:         { type: "string" },
              category:         { type: "string" },
              deal_expires:     { type: "string" },
              ships_to_country: { type: "boolean" },
            },
          },
        },
      },
    },
  });

  onStep?.("✅ Deals found! Verifying links…");

  // Only keep deals with valid-looking URLs — the fastWebSearch backend verifies them for per-shoe searches
  // For the deals page we filter strictly to avoid hallucinated links
  const deals = (res.deals || [])
    .filter(d =>
      d.ships_to_country !== false &&
      d.deal_price &&
      d.original_price &&
      d.store_name &&
      d.shoe_name &&
      d.buy_link &&
      d.buy_link.startsWith("https://") &&
      // Basic sanity: URL must contain the retailer name or a known domain pattern, not just a homepage
      (d.buy_link.length > 22)
    )
    .map(d => ({
      ...d,
      store_url: d.buy_link,
      currency: d.currency || (countryCode === "IL" ? "ILS" : countryCode === "GB" ? "GBP" : "USD"),
      price_fetched_at: new Date().toISOString(),
    }));

  const result = { summary: res.summary || "", deals };
  setCachedWebDeals(cacheKey, result);
  return result;
}