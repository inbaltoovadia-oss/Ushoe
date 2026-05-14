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
    prompt: `You are a shoe deal research agent. Search the web NOW for current prices for this exact shoe.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
BRAND: ${shoe.brand}
CATALOG PRICE: $${shoe.price}
USER LOCATION: ${city}, ${country}
${size ? `SIZE: ${size}` : ""}

RETAILERS TO CHECK (all ship to ${country}):
${retailerList}

CRITICAL INSTRUCTIONS:
1. Search each retailer's website for "${shoe.brand} ${shoe.name}" RIGHT NOW using live web data.
2. Set found_on_site: true ONLY if you actually find this exact shoe listed for sale on their site.
3. Set found_on_site: false if the shoe is not found, the retailer doesn't carry this brand, or you are not sure.
4. DO NOT include retailers where found_on_site is false — they must be omitted from results.
5. A Nike store will NEVER sell Adidas shoes and vice versa. Use common sense.

For EACH retailer where you CONFIRMED the shoe is listed for sale:
- retailer_name: exact name from the list above
- found_on_site: true (ONLY include retailers where this is true)
- deal_price: current selling price in USD (convert if needed)
- original_price: original/crossed-out price if on sale, or null
- discount_pct: discount percentage, 0 if none
- discount_value: dollar amount saved, 0 if none
- shipping_free: boolean
- coupon_code: active coupon code or null
- deal_type: "sale" | "coupon" | "clearance" | "regular"
- confidence: "high" if you found the exact product page, "medium" if found via search
- deal_confirmed: true only if price is below $${shoe.price}
- is_best_deal: true for the single best value
- is_time_limited: boolean

Also return:
- summary: one sentence about the best deal found (only for confirmed retailers)
- best_price_found: the lowest confirmed price as a number, or null
- has_active_deals: true if any confirmed price is below $${shoe.price}

IMPORTANT: Only include retailers where you found the exact product "${shoe.brand} ${shoe.name}" listed for sale. Omit all others.`,
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

  // Only keep retailers the LLM confirmed actually carry this shoe
  const confirmed = (res.retailers || []).filter(r => r.found_on_site !== false);

  const merged = confirmed.map(r => {
    const key = (r.retailer_name || "").toLowerCase();
    const dirEntry = retailerMap[key]
      || Object.values(retailerMap).find(d => key.includes(d.name.toLowerCase().split(" ")[0]));
    if (!dirEntry) return null; // no real URL → skip

    return {
      retailer_name:   r.retailer_name,
      deal_price:      r.deal_price || null,
      original_price:  r.original_price || null,
      discount_pct:    r.discount_pct || 0,
      discount_value:  r.discount_value || 0,
      shipping_free:   r.shipping_free,
      coupon_code:     r.coupon_code || null,
      deal_type:       r.deal_type || "regular",
      confidence:      r.confidence || "medium",
      deal_confirmed:  !!r.deal_confirmed,
      is_best_deal:    !!r.is_best_deal,
      is_time_limited: !!r.is_time_limited,
      ships_to_location: true,
      buy_link:        dirEntry.url,
    };
  }).filter(Boolean);

  const result = {
    summary:          res.summary || "",
    best_price_found: res.best_price_found || null,
    has_active_deals: !!res.has_active_deals,
    retailers:        merged,
  };

  setCachedDeals(shoe.id, city, result, size, color);
  return result;
}