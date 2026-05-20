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

    const prompt = `Go to each of these retailer websites NOW and find "${q}" for sale in ${countryName}: ${retailers}

CRITICAL INSTRUCTIONS:
- Visit each website and COPY the EXACT price shown on the product page. Do NOT estimate, round, or guess prices.
- If the price on the page is ₪529, return "₪529". If it says ₪499.90, return "₪499.90". Copy it character for character.
- Only return a result for a retailer if you actually saw the product page and confirmed the price.
- Set price_confidence="high" ONLY if you saw the exact price on the page. Use "low" if you are guessing.
- Return the real product URL (the direct product page URL, not homepage).
- Return prices in ${isIsrael ? '₪ ILS (Israeli Shekel)' : '$ USD'}.

For each result include: price (copied exactly from page), original_price (the crossed-out "was" price if on sale, otherwise same as price), buy_link (direct product URL), sizes_available (EU sizes shown on page), colors_available, in_stock, estimated_shipping, price_confidence, is_best_deal (true only for lowest price), retailer name, brand, name.`;

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