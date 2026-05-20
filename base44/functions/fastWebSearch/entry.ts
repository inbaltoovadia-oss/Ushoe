import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 20 * 60 * 1000;

function cacheGet(k) {
  const e = CACHE.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { CACHE.delete(k); return null; }
  return e.data;
}
function cacheSet(k, data) {
  CACHE.set(k, { data, ts: Date.now() });
  if (CACHE.size > 200) CACHE.delete(CACHE.keys().next().value);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, city, country, countryCode } = await req.json();

    if (!query || !query.trim()) return Response.json({ web_picks: [], nearby_stores: [] });

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;
    const isIsrael = cc === 'IL';

    const key = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(key);
    if (cached) return Response.json({ ...cached, cached: true });

    const retailers = isIsrael
      ? 'nike.com/il, footlocker.co.il, terminalx.com, acsports.co.il, adidas.co.il'
      : 'nike.com, footlocker.com, adidas.com, jdsports.co.uk, zalando.com';

    const prompt = `Search these retailers RIGHT NOW for "${q}" in ${countryName}: ${retailers}
Return max 5 results with LIVE prices in ${isIsrael ? '₪ ILS' : '$ USD'}.
For each: price (exact with ₪), original_price (sale was-price or same), buy_link (real product URL https://...), sizes_available (array of EU size numbers), colors_available (array of color strings), in_stock, estimated_shipping, price_confidence (high=seen on page/medium=estimated), is_best_deal (true for cheapest only), retailer name.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
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
                currency:           { type: "string" },
                retailer:           { type: "string" },
                buy_link:           { type: "string" },
                ships_to_user:      { type: "boolean" },
                estimated_shipping: { type: "string" },
                in_stock:           { type: "boolean" },
                sizes_available:    { type: "array", items: { type: "number" } },
                colors_available:   { type: "array", items: { type: "string" } },
                is_best_deal:       { type: "boolean" },
                price_confidence:   { type: "string" },
                discount_percent:   { type: "number" },
              },
              required: ["name", "brand", "price", "currency", "retailer", "buy_link", "in_stock"],
            },
          },
          nearby_stores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:     { type: "string" },
                address:  { type: "string" },
                phone:    { type: "string" },
                maps_url: { type: "string" },
              },
            },
          },
        },
      },
    });

    const rawPicks = result?.web_picks || [];
    const seen = new Set();
    const filteredPicks = rawPicks
      .filter(p => {
        if (!p.retailer || !p.price) return false;
        const k = p.retailer.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(p => ({ ...p, price_fetched_at: new Date().toISOString() }));

    if (filteredPicks.length > 0 && !filteredPicks.some(p => p.is_best_deal)) {
      const prices = filteredPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filteredPicks[minIdx] = { ...filteredPicks[minIdx], is_best_deal: true };
    }

    const filteredStores = (result?.nearby_stores || [])
      .filter(s => s.name && s.address)
      .map(s => ({
        ...s,
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
      }));

    const response = {
      web_picks: filteredPicks,
      nearby_stores: filteredStores,
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
    };

    if (filteredPicks.length > 0) cacheSet(key, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});