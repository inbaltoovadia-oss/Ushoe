import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory cache: key → { data, ts }
const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  // Evict oldest if cache grows too large
  if (CACHE.size > 200) {
    const oldest = CACHE.keys().next().value;
    CACHE.delete(oldest);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, countryCode } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [], nearby_stores: [] });
    }

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;

    // Cache key based on query + location
    const cacheKey = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) {
      return Response.json({ ...cached, cached: true });
    }

    // Single focused Gemini call — real product URLs and accurate prices
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Search the web for: "${q}" available to buy in ${countryName} (near ${cityName}).

Return top 5 online retailers selling this exact shoe. CRITICAL:
- buy_link must be a REAL URL from your search results pointing to the actual product page or search results for this shoe on that retailer's site (NOT a homepage, NOT invented)
- price must be the real current price you found, in the local currency of ${countryName}
- If country is Israel: prefer footlocker.co.il, adidas.co.il, nike.com/il, and ILS prices
- ships_to_user must only be true if the retailer confirmed ships to ${countryName}

Also list 3 real physical shoe stores near ${cityName} with their real addresses.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          web_picks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:               { type: "string" },
                brand:              { type: "string" },
                price:              { type: "string" },
                original_price:     { type: "string" },
                retailer:           { type: "string" },
                buy_link:           { type: "string" },
                ships_to_user:      { type: "boolean" },
                estimated_shipping: { type: "string" },
                in_stock:           { type: "boolean" },
                is_best_deal:       { type: "boolean" },
                price_confidence:   { type: "string" },
                discount_percent:   { type: "number" },
              },
            },
          },
          nearby_stores: {
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

    // Process online picks
    const rawPicks = result?.web_picks || [];
    const seen = new Set();
    const filteredPicks = rawPicks.filter(p => {
      if (!p.retailer) return false;
      const key = (p.retailer + (p.name || '')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Mark cheapest as best deal if none flagged
    if (filteredPicks.length > 0 && !filteredPicks.some(p => p.is_best_deal)) {
      const prices = filteredPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filteredPicks[minIdx] = { ...filteredPicks[minIdx], is_best_deal: true };
    }

    // Process stores
    const filteredStores = (result?.nearby_stores || [])
      .filter(s => s.name && s.address && s.address.length > 5)
      .map(s => ({
        ...s,
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
      }));

    const response = {
      web_picks: filteredPicks,
      nearby_stores: filteredStores,
      location_used: `${cityName}, ${countryName}`,
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});