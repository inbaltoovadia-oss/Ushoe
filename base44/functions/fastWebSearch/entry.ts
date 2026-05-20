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

// Guaranteed working search page URLs — used as fallback buy_link (never 404)
function getRetailerSearchUrls(query, countryCode) {
  const q = encodeURIComponent(query);
  if (countryCode === 'IL') {
    return [
      { retailer: 'Nike Israel',        searchUrl: `https://www.nike.com/il/w?q=${q}&vst=${q}` },
      { retailer: 'Terminal X',         searchUrl: `https://www.terminalx.com/catalogsearch/result/?q=${q}` },
      { retailer: 'Foot Locker Israel', searchUrl: `https://footlocker.co.il/search?q=${q}` },
      { retailer: 'AC Sports',          searchUrl: `https://www.acsports.co.il/search?q=${q}` },
      { retailer: 'Adidas Israel',      searchUrl: `https://www.adidas.co.il/search?q=${q}` },
    ];
  }
  return [
    { retailer: 'Nike',        searchUrl: `https://www.nike.com/w?q=${q}&vst=${q}` },
    { retailer: 'Foot Locker', searchUrl: `https://www.footlocker.com/search?query=${q}` },
    { retailer: 'Adidas',      searchUrl: `https://www.adidas.com/us/search?q=${q}` },
    { retailer: 'JD Sports',   searchUrl: `https://www.jdsports.com/search/jdsports/${q}/` },
    { retailer: 'Zappos',      searchUrl: `https://www.zappos.com/search?term=${q}` },
  ];
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

    const cacheKey = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const retailers = getRetailerSearchUrls(q, cc);
    const retailerList = retailers.map(r => `- ${r.retailer}: ${r.searchUrl}`).join('\n');

    // Use Gemini Flash with live web search — search by shoe name only (no size/color = better results)
    const prompt = `You are a shopping assistant. Search the web RIGHT NOW for "${q}" and visit each of these retailer websites to find the exact current price:

${retailerList}

CRITICAL INSTRUCTIONS:
1. Search ONLY by the shoe name "${q}" — do NOT add size or color to your search, it causes "no results found" errors.
2. Visit each retailer's product page and COPY the price character-for-character as shown (e.g. ₪529.90, $89.99 — do NOT round or estimate).
3. For buy_link: COPY the EXACT URL from your browser address bar of the product page you visited. If no product page found, use the search URL above.
4. ONLY include retailers that actually sell this specific shoe. If a retailer does not carry "${q}", skip them entirely — do NOT include them with a low confidence score.
5. Report in_stock as true/false based on what you see.
6. Copy exact sizes available from the page (EU or US numbers).
7. Return ONLY retailers where you found the actual product listed for sale.
8. Mark is_best_deal=true for the single cheapest verified price.`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
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
    const dedupedPicks = rawPicks.filter(p => {
      if (!p.retailer) return false;
      const k = p.retailer.toLowerCase().replace(/\s+/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Ensure every pick has a valid buy_link — fallback to search URL
    const finalPicks = dedupedPicks.map(p => {
      if (!p.buy_link || p.buy_link.trim() === '') {
        const match = retailers.find(r =>
          r.retailer.toLowerCase().includes(p.retailer.toLowerCase().split(' ')[0]) ||
          p.retailer.toLowerCase().includes(r.retailer.toLowerCase().split(' ')[0])
        );
        return { ...p, buy_link: match ? match.searchUrl : `https://www.google.com/search?q=${encodeURIComponent(q + ' ' + p.retailer + ' buy')}` };
      }
      return p;
    });

    // Only pad if we have zero results — avoid force-adding stores that don't carry the shoe
    if (finalPicks.length === 0) {
      for (const r of retailers.slice(0, 3)) {
        finalPicks.push({
          name: q, brand: '', price: '', original_price: '',
          currency: cc === 'IL' ? 'ILS' : 'USD',
          retailer: r.retailer, buy_link: r.searchUrl,
          in_stock: null, estimated_shipping: '',
          sizes_available: [], colors_available: [],
          is_best_deal: false, price_confidence: 'low', discount_percent: 0,
        });
      }
    }

    // Mark best deal
    if (!finalPicks.some(p => p.is_best_deal)) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0 && prices[minIdx] < Infinity) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    const response = {
      web_picks: finalPicks,
      nearby_stores: [],
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
    };

    if (finalPicks.some(p => p.price_confidence !== 'low')) cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});