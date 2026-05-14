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

CRITICAL INSTRUCTIONS:
1. Search each retailer's website NOW for "${shoe.brand} ${shoe.name}".
2. Set found_on_site: true ONLY if this exact shoe is listed on their site.
3. NEVER include a retailer that doesn't carry this brand (e.g. Adidas site won't have Nike shoes).
4. For nearby physical stores: ONLY list stores that physically exist near ${city} AND carry ${shoe.brand}. Use real street addresses. No generic city names.

Return ONLY for online retailers where you confirmed the shoe is listed:
- online_stores: [{ name, found_on_site (bool), stock_status, sizes_available }]
  - stock_status: "In stock" | "Limited stock" | "Out of stock" | "Check in store"
  - Only include entries where found_on_site is true
- nearby_stores: up to 4 real physical stores near ${city} confirmed to carry ${shoe.brand}.
  [{ name, address (real street address), distance_km, stock_status, phone }]
  Return [] if no confirmed stores found.
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

  // Only keep online stores the LLM confirmed carry this shoe
  const confirmedOnline = (res.online_stores || []).filter(s => s.found_on_site !== false);

  const onlineStores = confirmedOnline.map(s => {
    const key = (s.name || "").toLowerCase();
    const dirEntry = retailerMap[key]
      || Object.values(retailerMap).find(d => key.includes(d.name.toLowerCase().split(" ")[0]));
    if (!dirEntry) return null;
    return {
      name:              s.name,
      stock_status:      s.stock_status || "Check in store",
      sizes_available:   s.sizes_available || [],
      ships_to_location: true,
      url:               dirEntry.url,
    };
  }).filter(Boolean);

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