/**
 * INVENTORY & STOCK AGENT
 * Uses fastWebSearch for online retailers (real web access).
 * Uses InvokeLLM for nearby physical store suggestions.
 */

import { base44 } from "@/api/base44Client";
import { getCachedStock, setCachedStock } from "./agentCache";

export async function runInventoryAgent({ shoe, city, size = null, color = null, countryCode = "" }) {
  const cached = getCachedStock(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";

  const sizeStr = size ? ` US size ${size}` : "";
  const colorStr = (color || shoe.colorway) ? ` ${color || shoe.colorway}` : "";
  const query = `${shoe.brand} ${shoe.name}${colorStr}${sizeStr} in stock`;

  // 1. Online stock via fastWebSearch
  const webRes = await base44.functions.fastWebSearch({
    query,
    category: shoe.category,
    city,
    country,
    countryCode: code,
  });

  const onlineStores = (webRes?.web_picks || []).map(p => {
    const priceNum = parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || null;
    return {
      name:            p.retailer || p.name,
      stock_status:    p.in_stock ? "In stock" : "Out of stock",
      price:           priceNum,
      sizes_available: [],
      ships_to_location: p.ships_to_user !== false,
      url:             p.buy_link || null,
    };
  });

  // 2. Nearby physical stores via LLM (knowledge-based, no internet needed)
  let nearbyStores = [];
  try {
    const nearbyRes = await base44.integrations.Core.InvokeLLM({
      prompt: `List up to 5 real multi-brand shoe store locations (Foot Locker, JD Sports, Finish Line, DSW, Champs Sports, Zalando, Sports Direct, etc.) near ${city}, ${country}.

Only include stores you are confident are real locations in or near ${city}. Include exact street addresses.
Do NOT include single-brand stores (no Nike Store, no Adidas Store).
Do NOT invent addresses. If unsure about a location, skip it.

Return JSON with field "stores" containing each store's: name, address (full), distance_km, phone, maps_url.`,
      response_json_schema: {
        type: "object",
        properties: {
          stores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:        { type: "string" },
                address:     { type: "string" },
                distance_km: { type: "number" },
                phone:       { type: "string" },
                maps_url:    { type: "string" },
              },
            },
          },
        },
      },
    });

    nearbyStores = (nearbyRes?.stores || [])
      .filter(s => s.name && s.address && s.address.length > 5)
      .map(s => ({
        ...s,
        stock_status: "Check in store",
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
      }));
  } catch {
    nearbyStores = [];
  }

  const result = {
    overall_status:     onlineStores.length > 0 ? "available" : "unknown",
    confidence:         "high",
    available_sizes:    [],
    ships_to_city:      onlineStores.some(s => s.ships_to_location),
    estimated_delivery: null,
    pickup_available:   nearbyStores.length > 0,
    summary:            onlineStores.length > 0
      ? `Found ${onlineStores.length} retailer${onlineStores.length > 1 ? "s" : ""} online for ${shoe.brand} ${shoe.name}`
      : `No online retailers confirmed for your region`,
    online_stores:      onlineStores,
    nearby_stores:      nearbyStores,
  };

  setCachedStock(shoe.id, city, result, size, color);
  return result;
}