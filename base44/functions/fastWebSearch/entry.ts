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
      prompt: `You are a real-time price search agent. Search the web NOW for: "${q}" available in ${countryName} (${cityName}).

YOUR JOB: Find the actual product listing pages for this exact shoe and return the REAL current prices.

STRICT RULES — violations will break the app:
1. buy_link MUST be an actual URL you found in your web search results for this exact product. Copy it verbatim. Do NOT construct or guess URLs. If you didn't find a real product URL for a retailer, skip that retailer.
2. price MUST be the exact price shown on that product page right now. Do NOT estimate or use old data.
3. ${isIsrael ? 'User is in ISRAEL. Prefer Israeli retailers: nike.com/il, footlocker.co.il, adidas.co.il, terminalx.com, renuar.co.il, dynamica.co.il, ac.co.il. Return prices in ILS (₪).' : `User is in ${countryName}. Only include retailers that ship to ${countryName}.`}
4. ships_to_user = true only if the retailer's site actually serves ${countryName}
5. Do not include Amazon, eBay, or marketplaces unless specifically relevant
6. Return up to 5 results only

For each result provide:
- name: exact product name as shown on the page
- brand: brand
- price: current sale/regular price as string with currency symbol (e.g. "₪549", "$89.99")
- original_price: original/was price as string (null if not on sale)
- retailer: store name
- buy_link: the EXACT URL from your search results (copy-paste verbatim)
- ships_to_user: boolean
- estimated_shipping: shipping info string
- in_stock: boolean
- is_best_deal: true for the cheapest option
- price_confidence: "high" (you saw the price on the page), "medium" (from search snippet), "low" (estimated)
- discount_percent: number (0 if not on sale)
- price_fetched_at: current ISO timestamp

Also find 3 real shoe stores near ${cityName} with real addresses.`,
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
                price_fetched_at:   { type: "string" },
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