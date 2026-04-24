/**
 * WEB DEALS AGENT
 * Discovers non-catalog shoe deals from live web sources, filtered by user location.
 */

import { base44 } from "@/api/base44Client";
import { getCachedWebDeals, setCachedWebDeals } from "./agentCache";

export async function runWebDealsAgent({ city, query = "" }) {
  const cached = getCachedWebDeals(city + query);
  if (cached) return cached;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a WEB DEALS AGENT. Find the top current sneaker/shoe deals available right now online that ship to or are available in ${city}.

${query ? `Focus on: ${query}` : "Find the hottest deals across all brands and styles."}

STRICT RULES:
- Only include ACTIVE, VERIFIED deals from real retailers
- Only include deals from stores that ship to ${city} or have presence there
- No expired sales, no fake discounts
- Minimum 10% discount OR notable promotional offer
- Include deals from: Nike, Adidas, New Balance, ASICS, Puma, Foot Locker, Finish Line, DSW, Zappos, GOAT, StockX, JD Sports, etc.

Return up to 8 deals. For each:
- shoe_name: full product name
- brand: brand name
- deal_price: current sale price (USD)
- original_price: regular retail price (USD)
- discount_pct: percentage discount
- store_name: retailer name
- store_url: direct link to the deal
- category: shoe category (Running, Casual, Basketball, etc.)
- ships_to_city: true (only include if it does)
- image_hint: brief visual description for display
- deal_expires: estimated expiry or "Limited time" or null
- confidence: "high" | "medium"

Also return:
- summary: 1-sentence overview of the deals landscape right now`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        deals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              shoe_name:     { type: "string" },
              brand:         { type: "string" },
              deal_price:    { type: "number" },
              original_price:{ type: "number" },
              discount_pct:  { type: "number" },
              store_name:    { type: "string" },
              store_url:     { type: "string" },
              category:      { type: "string" },
              ships_to_city: { type: "boolean" },
              image_hint:    { type: "string" },
              deal_expires:  { type: "string" },
              confidence:    { type: "string" },
            },
          },
        },
      },
    },
  });

  const result = {
    summary: res.summary || "",
    deals: (res.deals || []).filter(d => d.ships_to_city !== false && d.deal_price && d.original_price),
  };

  setCachedWebDeals(city + query, result);
  return result;
}