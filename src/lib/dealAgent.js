/**
 * DEAL SEARCH AGENT
 * Responsible for: live pricing, discounts, promotions, coupons, sales.
 * Runs via InvokeLLM with internet access — simulates a backend agent.
 * Returns normalized deal objects with confidence levels.
 */

import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals } from "./agentCache";

export async function runDealAgent({ shoe, city, size = null, color = null }) {
  const cacheKey = `${city}_${size || ""}_${color || ""}`;
  const cached = getCachedDeals(shoe.id, city, size, color);
  if (cached) return cached;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a DEAL SEARCH AGENT for shoes. Search live retailer websites RIGHT NOW for the best current prices and active promotions.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
CATALOG PRICE: $${shoe.price}
USER LOCATION: ${city}, ${shoe._country || ""}
${size ? `SIZE NEEDED: ${size}` : ""}
${color ? `COLOR: ${color}` : ""}

TASK: Find up to 6 VERIFIED, ACTIVE deals from official brand sites and major retailers that SHIP TO OR OPERATE IN the user's country/city.

STRICT RULES:
- CRITICAL: Only include retailers that ACTUALLY ship to ${city} and the user's country. Do NOT include US-only retailers for users outside the US, or region-locked stores.
- Only include deals you can CONFIRM are active right now from official sources
- Exclude expired promotions or stores that don't serve ${city}
- Attach a confidence level: "high" (official site confirmed), "medium" (retailer confirmed), "low" (estimate)
- If a deal is better than catalog price, flag it as deal_confirmed: true
- Return buy_link as a real retailer URL (product page or search page)
- Set ships_to_location: false for any retailer that does NOT ship to the user's location

For each retailer return:
- retailer_name: string
- deal_price: number (current price in USD)
- original_price: number (if on sale)
- discount_pct: number (0 if no discount)
- discount_value: number (dollar savings)
- shipping_free: boolean
- shipping_cost: number (0 if free, null if unknown)
- estimated_delivery: string (e.g. "2-3 days")
- coupon_code: string or null
- deal_type: "sale" | "coupon" | "clearance" | "regular"
- confidence: "high" | "medium" | "low"
- deal_confirmed: boolean
- ships_to_location: boolean
- buy_link: string
- is_best_deal: boolean (mark only ONE as true)
- is_time_limited: boolean

Also return:
- summary: one sentence about the best deal found
- best_price_found: number (the lowest confirmed price)
- has_active_deals: boolean (true if any deal_price < catalog price OR coupon exists)`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        best_price_found: { type: "number" },
        has_active_deals: { type: "boolean" },
        retailers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              retailer_name:      { type: "string" },
              deal_price:         { type: "number" },
              original_price:     { type: "number" },
              discount_pct:       { type: "number" },
              discount_value:     { type: "number" },
              shipping_free:      { type: "boolean" },
              shipping_cost:      { type: "number" },
              estimated_delivery: { type: "string" },
              coupon_code:        { type: "string" },
              deal_type:          { type: "string" },
              confidence:         { type: "string" },
              deal_confirmed:     { type: "boolean" },
              ships_to_location:  { type: "boolean" },
              buy_link:           { type: "string" },
              is_best_deal:       { type: "boolean" },
              is_time_limited:    { type: "boolean" },
            },
          },
        },
      },
    },
  });

  const result = {
    summary: res.summary || "",
    best_price_found: res.best_price_found || null,
    has_active_deals: !!res.has_active_deals,
    retailers: (res.retailers || []).filter(r => r.ships_to_location !== false),
  };

  setCachedDeals(shoe.id, city, result, size, color);
  return result;
}