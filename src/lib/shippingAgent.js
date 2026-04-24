/**
 * SHIPPING & REGION VALIDATION AGENT
 * Verifies whether a shoe can actually be purchased in the user's region.
 * Checks: shipping eligibility, region restrictions, local pickup, currency support.
 * Results are cached for 10 minutes.
 */

import { base44 } from "@/api/base44Client";

const CACHE_TTL = 10 * 60 * 1000;
const PREFIX = "ushoe_shipping_";

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
    sessionStorage.removeItem(key);
  } catch (_) {}
  return null;
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
}

export function getCachedShipping(shoeId, country, city) {
  return readCache(`${PREFIX}${shoeId}_${country}_${city}`);
}

export function setCachedShipping(shoeId, country, city, data) {
  writeCache(`${PREFIX}${shoeId}_${country}_${city}`, data);
}

/**
 * Validates shipping & purchase eligibility for a shoe in the user's region.
 * Returns per-retailer shipping status merged into the deal/stock results.
 */
export async function runShippingAgent({ shoe, country, city, retailers = [] }) {
  const cached = getCachedShipping(shoe.id, country, city);
  if (cached) return cached;

  const retailerList = retailers.length > 0
    ? retailers.map(r => r.retailer_name || r.name).join(", ")
    : "Nike.com, Adidas.com, Foot Locker, Finish Line, DICK'S Sporting Goods, Zappos, StockX, GOAT, Amazon";

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a SHIPPING & REGION VALIDATION AGENT for shoes. Your job is to verify whether the following shoe can realistically be purchased and shipped to the user's location.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
USER COUNTRY: ${country}
USER CITY: ${city}
RETAILERS TO CHECK: ${retailerList}

TASK: For each retailer, determine:
1. Does this retailer ship to ${country}/${city}?
2. Are there any regional restrictions or geo-blocks?
3. What currency/payment options are available?
4. Is local pickup available near ${city}?
5. What is the realistic estimated delivery window?

STRICT RULES:
- Only report what you can verify from official retailer shipping policies
- If unsure, mark ships_to_region as null (unknown)
- Do NOT fabricate shipping policies
- Flag any region-locked or restricted items clearly
- Prioritize retailers that actually serve ${country}

Return for each retailer:
- retailer_name: string
- ships_to_region: boolean or null (null = unknown)
- region_restricted: boolean (true if product is geo-blocked)
- supports_local_currency: boolean
- estimated_delivery: string or null
- pickup_available: boolean
- checkout_possible: boolean (overall: can user realistically buy?)
- restriction_reason: string or null (why it's blocked if region_restricted)

Also return:
- any_ships: boolean (does ANY retailer ship to this region?)
- best_shipping_retailer: string (name of retailer with best shipping to this region)
- overall_purchasable: boolean (can the user buy this shoe at all?)
- summary: one sentence about purchasing availability in ${city}, ${country}`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        any_ships: { type: "boolean" },
        best_shipping_retailer: { type: "string" },
        overall_purchasable: { type: "boolean" },
        summary: { type: "string" },
        retailers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              retailer_name:           { type: "string" },
              ships_to_region:         { type: "boolean" },
              region_restricted:       { type: "boolean" },
              supports_local_currency: { type: "boolean" },
              estimated_delivery:      { type: "string" },
              pickup_available:        { type: "boolean" },
              checkout_possible:       { type: "boolean" },
              restriction_reason:      { type: "string" },
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
 * Filters out region-blocked retailers and annotates each with shipping status.
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
      if (shipping.region_restricted) return null; // hide region-blocked
      return {
        ...r,
        ships_to_region:         shipping.ships_to_region,
        region_restricted:       false,
        supports_local_currency: shipping.supports_local_currency,
        estimated_delivery:      r.estimated_delivery || shipping.estimated_delivery,
        pickup_available:        shipping.pickup_available,
        checkout_possible:       shipping.checkout_possible,
        shipping_validated:      true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Prioritize verified shippable retailers
      const aOk = a.ships_to_region === true ? 0 : 1;
      const bOk = b.ships_to_region === true ? 0 : 1;
      return aOk - bOk;
    });
}