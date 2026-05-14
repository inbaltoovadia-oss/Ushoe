/**
 * INVENTORY & STOCK AGENT
 * Uses real retailer directory for URLs, LLM for stock status intelligence.
 */

import { base44 } from "@/api/base44Client";
import { getCachedStock, setCachedStock } from "./agentCache";
import { getRetailersForCountry } from "./retailerDirectory";

export async function runInventoryAgent({ shoe, city, size = null, color = null }) {
  const cached = getCachedStock(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "";
  const retailers = getRetailersForCountry(country, shoe.name, shoe.brand);
  const retailerList = retailers.map(r => `- ${r.name} (${r.domain})`).join("\n");

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a shoe stock agent. Check availability for this shoe.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
USER LOCATION: ${city}, ${country}
${size ? `SIZE: ${size}` : ""}

ONLINE RETAILERS TO CHECK (all serve ${country}):
${retailerList}

Search each retailer's website and report:
- overall_status: "in_stock" | "limited_stock" | "out_of_stock" | "unknown"
- available_sizes: confirmed US sizes in stock
- estimated_delivery: estimated delivery to ${city}
- online_stores: for each retailer above: { name, stock_status, sizes_available }
  - stock_status must be one of: "In stock" | "Limited stock" | "Out of stock" | "Check in store"
  - "Check in store" only if you truly cannot determine online availability
- nearby_stores: up to 4 REAL physical stores near ${city} with actual addresses (not generic city names).
  For each: { name, address, distance_km, stock_status, phone }
  ONLY include stores you can confirm physically exist near ${city}.
  Set stock_status to "Check in store" if stock is unknown.
  If you cannot find real physical stores near ${city}, return an empty array.
- summary: one sentence about availability near ${city}`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        overall_status:    { type: "string" },
        available_sizes:   { type: "array", items: { type: "number" } },
        estimated_delivery:{ type: "string" },
        summary:           { type: "string" },
        online_stores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name:            { type: "string" },
              stock_status:    { type: "string" },
              sizes_available: { type: "array", items: { type: "number" } },
            },
          },
        },
        nearby_stores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name:         { type: "string" },
              address:      { type: "string" },
              distance_km:  { type: "number" },
              stock_status: { type: "string" },
              phone:        { type: "string" },
            },
          },
        },
      },
    },
  });

  // Merge stock status with real URLs from directory
  const retailerMap = {};
  retailers.forEach(r => { retailerMap[r.name.toLowerCase()] = r; });

  const onlineStores = (res.online_stores || []).map(s => {
    const key = (s.name || "").toLowerCase();
    const dirEntry = retailerMap[key]
      || Object.values(retailerMap).find(d => key.includes(d.name.toLowerCase().split(" ")[0]));
    return {
      name:            s.name,
      stock_status:    s.stock_status || "Check in store",
      sizes_available: s.sizes_available || [],
      ships_to_location: true,
      url:             dirEntry?.url || null,
    };
  });

  // Add any directory retailers the LLM didn't mention
  const mentionedOnline = new Set(onlineStores.map(s => s.name?.toLowerCase()));
  retailers.forEach(r => {
    if (!mentionedOnline.has(r.name.toLowerCase())) {
      onlineStores.push({
        name:            r.name,
        stock_status:    "Check in store",
        sizes_available: [],
        ships_to_location: true,
        url:             r.url,
      });
    }
  });

  const nearbyStores = (res.nearby_stores || []).map(s => ({
    ...s,
    stock_status: s.stock_status || "Check in store",
    maps_url: `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${city}`)}`,
  }));

  const result = {
    overall_status:     res.overall_status || "unknown",
    confidence:         "medium",
    available_sizes:    res.available_sizes || [],
    low_stock_sizes:    [],
    colors_available:   [],
    ships_to_city:      onlineStores.length > 0,
    estimated_delivery: res.estimated_delivery || null,
    pickup_available:   nearbyStores.length > 0,
    summary:            res.summary || "",
    online_stores:      onlineStores,
    nearby_stores:      nearbyStores,
  };

  setCachedStock(shoe.id, city, result, size, color);
  return result;
}