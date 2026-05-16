import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Run online deals + nearby stores in parallel
    const [onlineRes, storesRes] = await Promise.allSettled([

      // ── ONLINE DEALS: Gemini googles for real product pages ──────────────
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a live shoe price comparison engine. Use Google Search RIGHT NOW to find where to buy "${q}" online in ${countryName}.

INSTRUCTIONS:
1. Search Google for: "${q}" buy online ${countryName} site:footlocker.com OR site:zappos.com OR site:amazon.com OR site:jdsports.com OR site:nike.com OR site:adidas.com OR site:zalando.com OR site:ssense.com OR site:goat.com OR site:stockx.com
2. Also search: "${q}" ${countryName} in stock price 2025
3. For EACH result you actually find via Google, extract:
   - The EXACT real product URL (must start with https://, must be a real page you found)
   - The current real price shown (with currency symbol for ${countryName})
   - The retailer name
   - Whether it ships to ${countryName}
   - Stock status
   - Any discount vs original price
   - Free shipping or cost

Return up to 6 results. ONLY include entries where you found a real product page URL via Google Search. Do NOT invent or guess URLs. If you cannot find a real URL for a retailer, skip it entirely.`,
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
          },
        },
      }),

      // ── NEARBY STORES: Gemini searches Google Maps ───────────────────────
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Use Google Maps Search to find real physical shoe stores near ${cityName}, ${countryName} that carry multi-brand sneakers.

INSTRUCTIONS:
1. Search Google Maps for: "shoe stores near ${cityName} ${countryName}"
2. Also search: "Foot Locker near ${cityName}" and "JD Sports near ${cityName}" and "sneaker store near ${cityName}"
3. For each store you find on Google Maps, extract:
   - Store name (exact as shown on Google Maps)
   - Full street address (as shown on Google Maps)
   - Distance from city center in km
   - Phone number if shown
   - Google Maps URL for this specific store listing

Return up to 5 stores. ONLY include stores where you found an actual Google Maps listing. Do NOT invent addresses or phone numbers. Skip stores you are not confident about.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
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
      }),
    ]);

    // Process online picks
    const rawPicks = onlineRes.status === 'fulfilled' ? (onlineRes.value?.web_picks || []) : [];
    const seen = new Set();
    const filteredPicks = rawPicks.filter(p => {
      if (!p.retailer) return false;
      if (p.in_stock === false || p.ships_to_user === false) return false;
      const key = (p.retailer + (p.name || '')).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Ensure one best_deal
    if (filteredPicks.length > 0 && !filteredPicks.some(p => p.is_best_deal)) {
      const prices = filteredPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filteredPicks[minIdx] = { ...filteredPicks[minIdx], is_best_deal: true };
    }

    // Process stores
    const rawStores = storesRes.status === 'fulfilled' ? (storesRes.value?.stores || []) : [];
    const filteredStores = rawStores
      .filter(s => s.name && s.address && s.address.length > 5)
      .map(s => ({
        ...s,
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
      }));

    return Response.json({
      web_picks: filteredPicks,
      nearby_stores: filteredStores,
      location_used: `${cityName}, ${countryName}`,
    });

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});