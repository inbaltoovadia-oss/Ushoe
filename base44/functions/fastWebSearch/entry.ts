import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory cache: key → { data, ts }
const CACHE = new Map();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes — fresh prices

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
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
    const isIsrael = cc === 'IL';

    const cacheKey = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) {
      return Response.json({ ...cached, cached: true });
    }

    const retailerList = isIsrael
      ? 'Nike Israel (nike.com/il), Adidas Israel (adidas.co.il), Foot Locker Israel (footlocker.co.il), Terminal X (terminalx.com), Dynamica (dynamica.co.il), AC Sports (acsports.co.il), Sport Active'
      : `Nike, Adidas, Foot Locker, JD Sports, Size?, Offspring, Zalando, ASOS`;

    const currencyNote = isIsrael ? 'ILS (₪)' : 'local currency';

    const prompt = `You are a REAL-TIME price search agent. Search the web RIGHT NOW for: "${q}" in ${countryName} (${cityName}).

Search these retailers: ${retailerList}

For each retailer, go to their website and find the ACTUAL CURRENT price. Return 5-7 results.

ACCURACY RULES:
- price: copy the EXACT number from the page with currency symbol (e.g. "₪529", "$120", "€95") in ${currencyNote}
- original_price: the crossed-out/was-price if on sale, else same as price
- buy_link: the real product page URL — must start with https://
- in_stock: only true if actually available now
- sizes_available: list of numeric sizes shown as available (e.g. [40, 41, 42, 43])
- colors_available: color names on the page (e.g. ["White/White", "Black"])
- estimated_shipping: exact shipping info (e.g. "Free shipping", "₪25 - 3-5 days")
- price_confidence: "high" if you saw the price on the page, "medium" if from snippet
- is_best_deal: true only for the cheapest option

Also return 3 nearby shoe stores in ${cityName} with real addresses and phone numbers.`;

    const result = await Promise.race([
      base44.asServiceRole.integrations.Core.InvokeLLM({
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
                  price_fetched_at:   { type: "string" },
                },
                required: ["name", "brand", "price", "currency", "retailer", "buy_link", "in_stock"],
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
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("LLM timeout")), 55000))
    ]);

    const rawPicks = result?.web_picks || [];

    // Deduplicate by retailer
    const seen = new Set();
    const filteredPicks = rawPicks
      .filter(p => {
        if (!p.retailer || !p.price) return false;
        const key = p.retailer.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(p => ({ ...p, price_fetched_at: new Date().toISOString() }));

    // Mark cheapest as best deal if none flagged
    if (filteredPicks.length > 0 && !filteredPicks.some(p => p.is_best_deal)) {
      const prices = filteredPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filteredPicks[minIdx] = { ...filteredPicks[minIdx], is_best_deal: true };
    }

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
      fetched_at: new Date().toISOString(),
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});