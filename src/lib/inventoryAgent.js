/**
 * INVENTORY & STOCK AGENT
 * Responsible for: real-time stock status, available sizes, store availability,
 * shipping eligibility, pickup options.
 * Runs via InvokeLLM with internet access — simulates a backend agent.
 */

import { base44 } from "@/api/base44Client";
import { getCachedStock, setCachedStock } from "./agentCache";

export async function runInventoryAgent({ shoe, city, size = null, color = null }) {
  const cached = getCachedStock(shoe.id, city, size, color);
  if (cached) return cached;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `You are an INVENTORY & STOCK AGENT for shoes. Check real-time availability from official brand and retailer websites.

SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
CATALOG PRICE: $${shoe.price}
USER LOCATION: ${city}, ${shoe._country || ""}
${size ? `SIZE REQUESTED: ${size}` : "All sizes"}
${color ? `COLOR: ${color}` : ""}

TASK: Determine current stock and availability from official sources.

STRICT RULES:
- NEVER assume stock — only report confirmed availability
- CRITICAL: Only include physical stores actually located near ${city}, and only include online stores that ship to the user's country. Do NOT include stores from other countries or that do not serve this location.
- Prioritize official brand website over third-party
- If conflicting sources, favor official results
- Confidence: "high" = official site confirmed, "medium" = authorized retailer, "low" = estimate
- For online_stores: url MUST be a real, working URL to the actual product page or the retailer's website search for this shoe. NEVER fabricate a URL. If you cannot find a real URL for a store, omit the url field and set stock_status to "Check in store".
- For nearby_stores: if you cannot confirm a store is physically near ${city}, set stock_status to "Check in store".

Return:
- overall_status: "in_stock" | "limited_stock" | "out_of_stock" | "unknown"
- confidence: "high" | "medium" | "low"
- available_sizes: array of US sizes confirmed available (e.g. [8, 8.5, 9, 10])
- low_stock_sizes: sizes with very limited availability
- colors_available: confirmed color variants
- ships_to_city: boolean — does any retailer ship to ${city}?
- estimated_delivery: string (e.g. "2-5 business days")
- online_stores: array of stores with online stock for ${city}:
  each: { name, stock_status, sizes_available, ships_to_location, url } — url must be a real URL or omitted
- nearby_stores: array of physical stores near ${city} with real addresses:
  each: { name, address, distance_km, stock_status, phone, maps_query, price }
  IMPORTANT: Only include REAL stores physically located near ${city}. If stock is unconfirmed, set stock_status to "Check in store". Include price if you can find it.
- pickup_available: boolean
- summary: one sentence about overall availability near ${city}`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        overall_status:    { type: "string" },
        confidence:        { type: "string" },
        available_sizes:   { type: "array", items: { type: "number" } },
        low_stock_sizes:   { type: "array", items: { type: "number" } },
        colors_available:  { type: "array", items: { type: "string" } },
        ships_to_city:     { type: "boolean" },
        estimated_delivery:{ type: "string" },
        pickup_available:  { type: "boolean" },
        summary:           { type: "string" },
        online_stores: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name:              { type: "string" },
              stock_status:      { type: "string" },
              sizes_available:   { type: "array", items: { type: "number" } },
              ships_to_location: { type: "boolean" },
              url:               { type: "string" },
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
              maps_query:   { type: "string" },
              price:        { type: "number" },
            },
          },
        },
      },
    },
  });

  const result = {
    overall_status:     res.overall_status || "unknown",
    confidence:         res.confidence || "low",
    available_sizes:    res.available_sizes || [],
    low_stock_sizes:    res.low_stock_sizes || [],
    colors_available:   res.colors_available || [],
    ships_to_city:      !!res.ships_to_city,
    estimated_delivery: res.estimated_delivery || null,
    pickup_available:   !!res.pickup_available,
    summary:            res.summary || "",
    online_stores:      (res.online_stores || []).filter(s => s.ships_to_location !== false),
    nearby_stores:      res.nearby_stores || [],
  };

  setCachedStock(shoe.id, city, result, size, color);
  return result;
}