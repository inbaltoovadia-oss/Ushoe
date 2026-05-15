/**
 * INVENTORY & STOCK AGENT
 * Calls the fastWebSearch backend function to find online stock,
 * and uses InvokeLLM (no internet) for nearby physical store info.
 */

import { base44 } from "@/api/base44Client";
import { getCachedStock, setCachedStock } from "./agentCache";
import { getRetailersForCountry } from "./retailerDirectory";

export async function runInventoryAgent({ shoe, city, size = null, color = null, countryCode = "" }) {
  const cached = getCachedStock(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";
  const query = `${shoe.brand} ${shoe.name}${size ? ` size ${size}` : ""}${color ? ` ${color}` : ""}`;

  // 1. Online stock — use fastWebSearch backend (has real web access)
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
      url:             null,
    };
  });

  // 2. Nearby stores — use InvokeLLM with knowledge of real store locations
  const retailers = getRetailersForCountry(code, shoe.name, shoe.brand);
  const chainNames = [...new Set(retailers.map(r => r.name))].join(", ");

  let nearbyStores = [];
  try {
    const nearbyRes = await base44.integrations.Core.InvokeLLM({
      prompt: `List real physical shoe store locations near ${city}, ${country}.
Known chains to look for: ${chainNames}

Return up to 5 real store locations. Only include stores you are confident exist in or near ${city}.
For each store return: name, address (full street address in ${city}), distance_km (estimated from city center), phone (if known), maps_url (Google Maps search link).
Do NOT invent addresses. If you don't know real locations near ${city}, return an empty array.`,
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
      .filter(s => s.name && s.address)
      .map(s => ({
        ...s,
        stock_status: "Check in store",
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
      }));
  } catch (_) {
    nearbyStores = [];
  }

  const result = {
    overall_status:     onlineStores.length > 0 ? "available" : "unknown",
    confidence:         "high",
    available_sizes:    [],
    ships_to_city:      onlineStores.length > 0,
    estimated_delivery: null,
    pickup_available:   nearbyStores.length > 0,
    summary:            onlineStores.length > 0
      ? `Found ${onlineStores.length} online retailer${onlineStores.length > 1 ? "s" : ""} carrying this shoe`
      : `No online retailers confirmed near ${city}`,
    online_stores:      onlineStores,
    nearby_stores:      nearbyStores,
  };

  setCachedStock(shoe.id, city, result, size, color);
  return result;
}