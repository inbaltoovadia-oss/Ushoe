/**
 * INVENTORY & STOCK AGENT
 * Uses gemini_3_flash (the only model that supports add_context_from_internet)
 * to do real live web searches on verified multi-brand shoe resellers.
 */

import { base44 } from "@/api/base44Client";
import { getCachedStock, setCachedStock } from "./agentCache";
import { getRetailersForCountry } from "./retailerDirectory";

export async function runInventoryAgent({ shoe, city, size = null, color = null, countryCode = "" }) {
  const cached = getCachedStock(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";
  const retailers = getRetailersForCountry(code, shoe.name, shoe.brand);
  const retailerList = retailers.map(r => `- ${r.name}: ${r.url}`).join("\n");

  const res = await base44.integrations.Core.InvokeLLM({
    model: "gemini_3_flash",
    add_context_from_internet: true,
    prompt: `You are a shoe availability research agent. Use live web search to find real stock for this shoe RIGHT NOW.

SHOE: "${shoe.brand} ${shoe.name}"${shoe.colorway ? ` colorway: ${shoe.colorway}` : ""}
USER LOCATION: ${city}, ${country}
${size ? `REQUESTED SIZE: US ${size}` : ""}

TASK 1 — ONLINE RETAILERS:
Search each of these verified multi-brand resellers for the shoe. Use queries like:
"${shoe.brand} ${shoe.name} site:footlocker.com" or just search "${shoe.brand} ${shoe.name} buy" and check these sites:
${retailerList}

For each retailer you find the shoe listed on, return:
- name: retailer name
- stock_status: "In stock" | "Limited stock" | "Out of stock" | "Check in store"
- price: number (USD)
- sizes_available: array of US sizes if shown
- url: the direct product/search page URL you found

TASK 2 — NEARBY PHYSICAL STORES:
Search Google Maps / web for these specific store chains near ${city}:
Foot Locker, JD Sports, Finish Line, Champs Sports, DSW, Rack Room Shoes, Famous Footwear, Shoe Carnival

For each store you find a real location for near ${city}, return:
- name: exact store name (e.g. "Foot Locker - Times Square")
- address: full street address
- distance_km: estimated km from city center
- stock_status: "Check in store" (default unless you find specific info)
- phone: phone number if found
- maps_url: Google Maps link

IMPORTANT:
- Only include retailers/stores you actually found via web search
- Do NOT include single-brand stores (no Nike Store, no Adidas Store, no Under Armour store)
- Do NOT invent stores or addresses
- Nearby stores should be REAL locations near ${city} with real addresses`,
    response_json_schema: {
      type: "object",
      properties: {
        overall_status:     { type: "string" },
        available_sizes:    { type: "array", items: { type: "number" } },
        estimated_delivery: { type: "string" },
        summary:            { type: "string" },
        online_stores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name:            { type: "string" },
              stock_status:    { type: "string" },
              price:           { type: "number" },
              sizes_available: { type: "array", items: { type: "number" } },
              url:             { type: "string" },
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
              maps_url:     { type: "string" },
            },
          },
        },
      },
    },
  });

  // Build retailer URL map for fallback
  const retailerMap = {};
  retailers.forEach(r => { retailerMap[r.name.toLowerCase()] = r; });

  const onlineStores = (res.online_stores || []).map(s => {
    const key = (s.name || "").toLowerCase();
    const dirEntry = Object.values(retailerMap).find(d =>
      key.includes(d.name.toLowerCase().split(" ")[0]) || d.name.toLowerCase().includes(key.split(" ")[0])
    );
    return {
      name:            s.name,
      stock_status:    s.stock_status || "Check in store",
      price:           s.price || null,
      sizes_available: s.sizes_available || [],
      ships_to_location: true,
      url:             s.url || dirEntry?.url || null,
    };
  }).filter(s => s.name);

  const nearbyStores = (res.nearby_stores || [])
    .filter(s => s.name && s.address && s.address.trim() !== city.trim())
    .map(s => ({
      ...s,
      stock_status: s.stock_status || "Check in store",
      maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
    }));

  const result = {
    overall_status:     res.overall_status || "unknown",
    confidence:         "high",
    available_sizes:    res.available_sizes || [],
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