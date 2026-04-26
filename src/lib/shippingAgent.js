/**
 * SHIPPING & REGION VALIDATION AGENT
 * Verifies whether a shoe can be purchased and shipped to the user's region.
 * Cache TTL: 7 days (via agentCache) — shipping policies rarely change.
 */

import { base44 } from "@/api/base44Client";
import { getCachedShipping, setCachedShipping } from "./agentCache";

export async function runShippingAgent({ shoe, country, city, retailers = [] }) {
  const cached = getCachedShipping(shoe.id, country, city);
  if (cached) return cached;

  const retailerList = retailers.length > 0
    ? retailers.map(r => r.retailer_name || r.name).filter(Boolean).join(", ")
    : "Nike.com, Adidas.com, Foot Locker, Finish Line, DICK'S Sporting Goods, Zappos, StockX, GOAT, Amazon";

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a SHIPPING & REGION VALIDATION AGENT for shoes.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
USER COUNTRY: ${country}
USER CITY: ${city}
RETAILERS TO CHECK: ${retailerList}

For each retailer determine:
1. Does this retailer ship to ${country}/${city}?
2. Any regional restrictions or geo-blocks?
3. Realistic estimated delivery window?

RULES:
- Only report what you can verify from official retailer shipping policies
- If unsure, mark ships_to_region as null
- Do NOT fabricate shipping policies
- Flag any region-locked items clearly

Return for each retailer:
- retailer_name, ships_to_region (boolean|null), region_restricted (boolean),
  estimated_delivery (string|null), pickup_available (boolean), checkout_possible (boolean), restriction_reason (string|null)

Also return:
- any_ships: boolean
- best_shipping_retailer: string
- overall_purchasable: boolean
- summary: one sentence about purchasing availability in ${city}, ${country}`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        any_ships:               { type: "boolean" },
        best_shipping_retailer:  { type: "string" },
        overall_purchasable:     { type: "boolean" },
        summary:                 { type: "string" },
        retailers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              retailer_name:      { type: "string" },
              ships_to_region:    { type: "boolean" },
              region_restricted:  { type: "boolean" },
              estimated_delivery: { type: "string" },
              pickup_available:   { type: "boolean" },
              checkout_possible:  { type: "boolean" },
              restriction_reason: { type: "string" },
            },
          },
        },
      },
    },
  });

  const result = {
    any_ships:              !!res.any_ships,
    best_shipping_retailer: res.best_shipping_retailer || null,
    overall_purchasable:    res.overall_purchasable !== false,
    summary:                res.summary || "",
    retailers:              res.retailers || [],
  };

  setCachedShipping(shoe.id, country, city, result);
  return result;
}

/**
 * Merges shipping validation into a retailers array.
 */
export function mergeShippingValidation(retailers, shippingResult) {
  if (!shippingResult?.retailers?.length) return retailers;

  const shippingMap = {};
  for (const s of shippingResult.retailers) {
    shippingMap[(s.retailer_name || "").toLowerCase()] = s;
  }

  return retailers
    .map(r => {
      const key = (r.name || r.retailer_name || "").toLowerCase();
      const shipping = shippingMap[key];
      if (!shipping) return { ...r, shipping_validated: false };
      if (shipping.region_restricted) return null;
      return {
        ...r,
        ships_to_region:    shipping.ships_to_region,
        region_restricted:  false,
        estimated_delivery: r.estimated_delivery || shipping.estimated_delivery,
        pickup_available:   shipping.pickup_available,
        checkout_possible:  shipping.checkout_possible,
        shipping_validated: true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.ships_to_region === true ? 0 : 1) - (b.ships_to_region === true ? 0 : 1));
}