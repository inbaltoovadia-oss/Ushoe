/**
 * DEAL SEARCH AGENT
 * Uses real retailer directory for URLs, LLM for pricing/deal intelligence.
 */

import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals } from "./agentCache";
import { getRetailersForCountry } from "./retailerDirectory";

export async function runDealAgent({ shoe, city, size = null, color = null }) {
  const cached = getCachedDeals(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "";
  const retailers = getRetailersForCountry(country, shoe.name, shoe.brand);
  const retailerList = retailers.map(r => `- ${r.name} (${r.domain})`).join("\n");

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a shoe deal research agent. Search for current prices and active deals for this shoe.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
CATALOG PRICE: $${shoe.price}
USER LOCATION: ${city}, ${country}
${size ? `SIZE: ${size}` : ""}

THESE ARE THE ONLY RETAILERS TO CHECK (they all serve ${country}):
${retailerList}

For each retailer, search their website NOW and return:
- retailer_name: exact name from the list above
- deal_price: current selling price in local currency (convert to USD if needed), or null if not found
- original_price: original price if on sale, or null
- discount_pct: discount percentage, 0 if none
- discount_value: dollar amount saved, 0 if none
- shipping_free: boolean
- coupon_code: active coupon code or null
- deal_type: "sale" | "coupon" | "clearance" | "regular"
- confidence: "high" if you found actual price on site, "medium" if approximate, "low" if unsure
- deal_confirmed: true only if you verified a lower price than catalog price
- is_best_deal: true for the single best value
- is_time_limited: boolean

Also return:
- summary: one sentence about the best deal found
- best_price_found: the lowest confirmed price as a number, or null
- has_active_deals: true if any confirmed price is below $${shoe.price}`,
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
              coupon_code:        { type: "string" },
              deal_type:          { type: "string" },
              confidence:         { type: "string" },
              deal_confirmed:     { type: "boolean" },
              is_best_deal:       { type: "boolean" },
              is_time_limited:    { type: "boolean" },
            },
          },
        },
      },
    },
  });

  // Merge LLM price data with real URLs from directory
  const retailerMap = {};
  retailers.forEach(r => { retailerMap[r.name.toLowerCase()] = r; });

  const merged = (res.retailers || []).map(r => {
    const key = (r.retailer_name || "").toLowerCase();
    // Find the closest matching retailer in our directory
    const dirEntry = retailerMap[key]
      || Object.values(retailerMap).find(d => key.includes(d.name.toLowerCase().split(" ")[0]));

    return {
      retailer_name:  r.retailer_name,
      deal_price:     r.deal_price || null,
      original_price: r.original_price || null,
      discount_pct:   r.discount_pct || 0,
      discount_value: r.discount_value || 0,
      shipping_free:  r.shipping_free,
      coupon_code:    r.coupon_code || null,
      deal_type:      r.deal_type || "regular",
      confidence:     r.confidence || "low",
      deal_confirmed: !!r.deal_confirmed,
      is_best_deal:   !!r.is_best_deal,
      is_time_limited:!!r.is_time_limited,
      ships_to_location: true, // all from directory ship to country
      buy_link:       dirEntry?.url || null,
    };
  });

  // Add any directory retailers the LLM didn't mention (with null price)
  const mentionedNames = new Set(merged.map(r => r.retailer_name?.toLowerCase()));
  retailers.forEach(r => {
    if (!mentionedNames.has(r.name.toLowerCase())) {
      merged.push({
        retailer_name:  r.name,
        deal_price:     null,
        confidence:     "low",
        deal_confirmed: false,
        is_best_deal:   false,
        ships_to_location: true,
        buy_link:       r.url,
      });
    }
  });

  const result = {
    summary: res.summary || "",
    best_price_found: res.best_price_found || null,
    has_active_deals: !!res.has_active_deals,
    retailers: merged.filter(r => r.buy_link), // only include retailers we have real URLs for
  };

  setCachedDeals(shoe.id, city, result, size, color);
  return result;
}