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
    prompt: `You are a shoe inventory agent. Check real-time availability for this exact shoe.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
BRAND: ${shoe.brand}
USER LOCATION: ${city}, ${country}
${size ? `SIZE: ${size}` : ""}

ONLINE RETAILERS TO CHECK:
${retailerList}

INSTRUCTIONS:
1. Search each retailer's website for "${shoe.brand} ${shoe.name}" using live web search.
2. Only include a retailer in online_stores if you actually find a matching product listing for this exact shoe on their site. Do NOT include a retailer if the search returns no matching results or the brand doesn't match.
3. Set found_on_site: true ONLY when a real product listing for this shoe appears in search results. Set found_on_site: false otherwise.
4. For stock_status, use what the listing shows — default to "Check in store" if the listing doesn't specify.
5. For nearby physical stores: search for real ${shoe.brand} stores or major multi-brand retailers (Foot Locker, JD Sports, etc.) near ${city} that actually carry this brand. Use real store names and real street addresses. Do NOT invent stores.

Return:
- online_stores: [{ name, found_on_site (boolean), stock_status, sizes_available }]
  - stock_status: "In stock" | "Limited stock" | "Out of stock" | "Check in store"
  - ONLY include entries where found_on_site is true
- nearby_stores: up to 6 verified physical stores near ${city} that carry ${shoe.brand}.
  [{ name, address (real street address), distance_km, stock_status, phone }]
- overall_status: "in_stock" | "limited_stock" | "out_of_stock" | "unknown"
- available_sizes: confirmed US sizes in stock
- estimated_delivery: estimated shipping time to ${city}
- summary: one line about where to find ${shoe.brand} ${shoe.name} near ${city}`,
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
              found_on_site:   { type: "boolean" },
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

  const onlineStores = (res.online_stores || []).filter(s => s.found_on_site !== false).map(s => {
    const key = (s.name || "").toLowerCase();
    const dirEntry = retailerMap[key]
      || Object.values(retailerMap).find(d => key.includes(d.name.toLowerCase().split(" ")[0]))
      || Object.values(retailerMap).find(d => d.name.toLowerCase().split(" ")[0] && key.includes(d.name.toLowerCase().split(" ")[0]));
    return {
      name:              s.name,
      stock_status:      s.stock_status || "Check in store",
      sizes_available:   s.sizes_available || [],
      ships_to_location: true,
      url:               dirEntry?.url || null,
    };
  }).filter(s => s.name);

  // Only include nearby stores with real addresses (not generic city names)
  const nearbyStores = (res.nearby_stores || [])
    .filter(s => s.name && s.address && s.address.toLowerCase() !== city.toLowerCase())
    .map(s => ({
      ...s,
      stock_status: s.stock_status || "Check in store",
      maps_url: `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
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