/**
 * DEAL SEARCH AGENT
 * Uses gemini_3_flash (the only model that supports add_context_from_internet)
 * to do real live web searches for the best current prices.
 */

import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals } from "./agentCache";
import { getRetailersForCountry } from "./retailerDirectory";

export async function runDealAgent({ shoe, city, size = null, color = null, countryCode = "" }) {
  const cached = getCachedDeals(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";
  const retailers = getRetailersForCountry(code, shoe.name, shoe.brand);
  const retailerList = retailers.map(r => `- ${r.name}: ${r.url}`).join("\n");

  const res = await base44.integrations.Core.InvokeLLM({
    model: "gemini_3_flash",
    add_context_from_internet: true,
    prompt: `You are a shoe deal finder. Search the web RIGHT NOW for the best current prices for this shoe.

SHOE: "${shoe.brand} ${shoe.name}"${shoe.colorway ? ` colorway: ${shoe.colorway}` : ""}
CATALOG PRICE: $${shoe.price}
USER LOCATION: ${city}, ${country}
${size ? `SIZE: US ${size}` : ""}

Search these verified multi-brand resellers for LIVE prices:
${retailerList}

Also search: "${shoe.brand} ${shoe.name} best price 2025" and "${shoe.brand} ${shoe.name} sale discount"

For each retailer where you find this shoe listed with a real price, return:
- retailer_name: store name
- deal_price: current price in USD (number)
- original_price: crossed-out/was price if on sale, null otherwise
- discount_pct: percentage off (0 if no sale)
- shipping_free: true/false
- coupon_code: any active promo code found, or null
- deal_type: "sale" | "clearance" | "coupon" | "regular"
- confidence: "high" if you found the exact product page, "medium" if via search result snippet
- deal_confirmed: true if price < $${shoe.price}
- is_best_deal: true for the single cheapest option found
- buy_link: the direct URL to buy this shoe

Also return:
- summary: one sentence naming the best deal found with price and retailer
- best_price_found: the lowest price number found (or null)
- has_active_deals: true if any price is below $${shoe.price}

RULES:
- Only include retailers with REAL prices you actually found via web search
- Do NOT guess or estimate prices — only confirmed prices from real listings
- Do NOT include brand-owned stores (no Nike.com, no Adidas.com)`,
    response_json_schema: {
      type: "object",
      properties: {
        summary:          { type: "string" },
        best_price_found: { type: "number" },
        has_active_deals: { type: "boolean" },
        retailers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              retailer_name:   { type: "string" },
              deal_price:      { type: "number" },
              original_price:  { type: "number" },
              discount_pct:    { type: "number" },
              shipping_free:   { type: "boolean" },
              coupon_code:     { type: "string" },
              deal_type:       { type: "string" },
              confidence:      { type: "string" },
              deal_confirmed:  { type: "boolean" },
              is_best_deal:    { type: "boolean" },
              buy_link:        { type: "string" },
            },
          },
        },
      },
    },
  });

  // Build retailer URL map for fallback link resolution
  const retailerMap = {};
  retailers.forEach(r => { retailerMap[r.name.toLowerCase()] = r; });

  const merged = (res.retailers || []).map(r => {
    const key = (r.retailer_name || "").toLowerCase();
    const dirEntry = Object.values(retailerMap).find(d =>
      key.includes(d.name.toLowerCase().split(" ")[0]) || d.name.toLowerCase().includes(key.split(" ")[0])
    );
    return {
      retailer_name:   r.retailer_name,
      deal_price:      r.deal_price || null,
      original_price:  r.original_price || null,
      discount_pct:    r.discount_pct || 0,
      discount_value:  r.deal_price && shoe.price ? Math.max(0, shoe.price - r.deal_price) : 0,
      shipping_free:   !!r.shipping_free,
      coupon_code:     r.coupon_code || null,
      deal_type:       r.deal_type || "regular",
      confidence:      r.confidence || "medium",
      deal_confirmed:  !!r.deal_confirmed,
      is_best_deal:    !!r.is_best_deal,
      is_time_limited: false,
      ships_to_location: true,
      buy_link:        r.buy_link || dirEntry?.url || null,
    };
  }).filter(r => r.retailer_name && r.deal_price);

  const result = {
    summary:          res.summary || "",
    best_price_found: res.best_price_found || null,
    has_active_deals: !!res.has_active_deals,
    retailers:        merged,
  };

  setCachedDeals(shoe.id, city, result, size, color);
  return result;
}