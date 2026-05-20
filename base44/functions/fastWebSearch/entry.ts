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

// Build search URLs for Israeli retailers
function buildSearchUrls(query, countryCode) {
  const q = encodeURIComponent(query);
  if (countryCode === 'IL') {
    return [
      { retailer: 'nike.com/il',      url: `https://www.nike.com/il/w?q=${q}&vst=${q}` },
      { retailer: 'terminalx.com',    url: `https://www.terminalx.com/catalogsearch/result/?q=${q}` },
      { retailer: 'footlocker.co.il', url: `https://footlocker.co.il/search?q=${q}` },
      { retailer: 'acsports.co.il',   url: `https://www.acsports.co.il/search?q=${q}` },
    ];
  }
  return [
    { retailer: 'nike.com',       url: `https://www.nike.com/w?q=${q}&vst=${q}` },
    { retailer: 'footlocker.com', url: `https://www.footlocker.com/search?query=${q}` },
    { retailer: 'adidas.com',     url: `https://www.adidas.com/us/search?q=${q}` },
  ];
}

// Fetch a URL with a browser-like UA and return text (with timeout)
async function fetchPage(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, finalUrl: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

    const cacheKey = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    // Step 1: fetch retailer search pages in parallel (fast, ~3-8s)
    const searchUrls = buildSearchUrls(q, cc);
    const fetchResults = await Promise.all(
      searchUrls.map(async ({ retailer, url }) => {
        const page = await fetchPage(url);
        return { retailer, searchUrl: url, page };
      })
    );

    // Step 2: collect page snippets and ask LLM to extract prices from real HTML
    const pageSnippets = fetchResults
      .filter(r => r.page && r.page.ok && r.page.text.length > 500)
      .map(r => {
        // Trim HTML to first 6000 chars to keep prompt manageable
        const snippet = r.page.text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                   .replace(/<[^>]+>/g, ' ')
                                   .replace(/\s+/g, ' ')
                                   .substring(0, 5000);
        return `=== ${r.retailer} (${r.searchUrl}) ===\n${snippet}`;
      });

    if (pageSnippets.length === 0) {
      // Fallback: pure LLM web search if all fetches failed (e.g. bot blocks)
      const fallback = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Search the web RIGHT NOW for "${q}" available to buy in ${countryName}. Return up to 4 real results with exact prices copied from the retailer pages. Only include results where you can verify the price on the actual product page.`,
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
                  name: { type: "string" }, brand: { type: "string" },
                  price: { type: "string" }, original_price: { type: "string" },
                  currency: { type: "string" }, retailer: { type: "string" },
                  buy_link: { type: "string" }, in_stock: { type: "boolean" },
                  estimated_shipping: { type: "string" }, sizes_available: { type: "array", items: { type: "number" } },
                  colors_available: { type: "array", items: { type: "string" } },
                  is_best_deal: { type: "boolean" }, price_confidence: { type: "string" },
                  discount_percent: { type: "number" },
                },
              },
            },
          },
        },
      });
      const picks = fallback?.web_picks || [];
      const result = { web_picks: picks, nearby_stores: [], location_used: `${cityName}, ${countryName}`, fetched_at: new Date().toISOString() };
      if (picks.length > 0) cacheSet(cacheKey, result);
      return Response.json(result);
    }

    // Step 3: LLM reads the real fetched HTML and extracts verified prices
    const extractionPrompt = `Below is the raw text content fetched DIRECTLY from retailer search pages for "${q}" in ${countryName}.
Extract the actual product listings and prices you can see in this text. 

RULES:
- Copy prices EXACTLY as they appear in the text (e.g. ₪529.90, not ₪530)
- Only extract items that are clearly "${q}" or very close matches
- The buy_link should be constructed from the retailer domain + any product path you see in the text
- Set price_confidence="high" if you found the price in this text, "low" if guessing
- Do NOT invent prices not present in the text

${pageSnippets.join('\n\n')}`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      add_context_from_internet: false,
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
                in_stock:           { type: "boolean" },
                estimated_shipping: { type: "string" },
                sizes_available:    { type: "array", items: { type: "number" } },
                colors_available:   { type: "array", items: { type: "string" } },
                is_best_deal:       { type: "boolean" },
                price_confidence:   { type: "string" },
                discount_percent:   { type: "number" },
              },
            },
          },
        },
      },
    });

    const rawPicks = llmResult?.web_picks || [];

    // Deduplicate by retailer
    const seen = new Set();
    const filteredPicks = rawPicks
      .filter(p => {
        if (!p.retailer || !p.price) return false;
        const k = p.retailer.toLowerCase().split('.')[0];
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(p => ({ ...p, price_fetched_at: new Date().toISOString() }));

    // Mark best deal
    if (filteredPicks.length > 0 && !filteredPicks.some(p => p.is_best_deal)) {
      const prices = filteredPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filteredPicks[minIdx] = { ...filteredPicks[minIdx], is_best_deal: true };
    }

    const response = {
      web_picks: filteredPicks,
      nearby_stores: [],
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
      pages_fetched: fetchResults.filter(r => r.page?.ok).map(r => r.retailer),
    };

    if (filteredPicks.length > 0) cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});