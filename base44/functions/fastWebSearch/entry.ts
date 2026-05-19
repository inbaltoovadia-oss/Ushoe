import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory cache: key → { data, ts }
const CACHE = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours — match client TTL

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

/**
 * Try to fetch a URL and confirm it resolves (HEAD request, 5s timeout).
 * Returns true if the URL is reachable, false otherwise.
 */
async function verifyUrl(url) {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    const resp = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PriceBot/1.0)",
        "Accept": "text/html,*/*",
      },
    });
    clearTimeout(timeout);
    // Accept any non-server-error response — 200, 301, 302, 403, 405 all mean the URL exists
    return resp.status < 500;
  } catch {
    return false;
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

    // Step 1: Ask the LLM with web search to find real product pages
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `CRITICAL: You are a real-time price search agent. Search the web NOW for: "${q}" available in ${countryName} (${cityName}).

YOUR JOB: Visit ACTUAL product pages RIGHT NOW and copy the EXACT prices, sizes, colors, and shipping info.

STRICT RULES — MUST FOLLOW:
1. Visit each product page and COPY the exact price shown — do NOT estimate or guess
2. buy_link MUST be the real URL from your search — copy verbatim from results
3. Check sizes_available on the product page — list what's actually in stock
4. Check colors_available — list colorways shown on the page
5. Verify shipping to ${countryName} — look for shipping policy or delivery info
6. ${isIsrael ? 'ISRAEL USER — search these retailers: Foot Locker Israel, Nike IL, Adidas IL, Terminal X, Renuar, Dynamica, AC Sports. Prices in ILS (₪).' : `Search major retailers shipping to ${countryName}: Foot Locker, Nike, Adidas, JD Sports, Size?, Offspring, Sneaker District, Farfetch. Prices in local currency.`}
7. MUST return at least 5 retailers — search multiple stores
8. NO Amazon, eBay, or marketplaces

For EACH retailer, provide:
- name: exact product name from page
- brand: brand name
- price: EXACT price as string with currency (e.g. "₪549", "$120", "€95") — copy from page
- original_price: was price if on sale (e.g. "₪699") or null
- currency: "ILS", "USD", "EUR", "GBP", etc.
- retailer: store name (e.g. "Foot Locker", "Nike", "Adidas")
- buy_link: EXACT product URL — copy from search results
- ships_to_user: true if they ship to ${countryName}
- estimated_shipping: shipping cost/delivery time from page (e.g. "Free shipping", "₪20 - 3-5 days")
- in_stock: true if available now
- sizes_available: array of sizes shown as in stock (e.g. [40, 40.5, 41, 42])
- colors_available: array of color names available (e.g. ["Black/White", "Triple White"])
- is_best_deal: true for cheapest
- price_confidence: "high" (you saw it on page), "medium" (snippet), "low" (guess)
- discount_percent: percentage off if on sale
- price_fetched_at: current ISO timestamp

Also find 3 real shoe stores near ${cityName} with addresses.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          web_picks: {
            type: "array",
            minItems: 5,
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
              required: ["name", "brand", "price", "currency", "retailer", "buy_link", "ships_to_user", "in_stock"],
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

    // Step 2: Verify each URL actually resolves — run checks in parallel
    const rawPicks = result?.web_picks || [];

    const verificationResults = await Promise.all(
      rawPicks.map(async (p) => {
        if (!p.buy_link || !p.buy_link.startsWith("https://")) return false;
        return verifyUrl(p.buy_link);
      })
    );

    const seen = new Set();
    const filteredPicks = rawPicks
      .filter((p, idx) => {
        if (!p.retailer) return false;
        if (!verificationResults[idx]) return false; // drop unverified URLs
        const key = (p.retailer + (p.name || '')).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(p => ({ ...p, price_fetched_at: p.price_fetched_at || new Date().toISOString() }));

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
      fetched_at: new Date().toISOString(),
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});