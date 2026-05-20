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
// Only trusted verified brands with real working URLs
function getRetailerSearchUrls(query, countryCode) {
  const q = encodeURIComponent(query);
  if (countryCode === 'IL') {
    return [
      { retailer: 'Nike Israel',        searchUrl: `https://www.nike.com/il/w?q=${q}&vst=${q}` },
      { retailer: 'Foot Locker Israel', searchUrl: `https://footlocker.co.il/search?q=${q}` },
      { retailer: 'Terminal X',         searchUrl: `https://www.terminalx.com/catalogsearch/result/?q=${q}` },
      { retailer: 'AC Sports',          searchUrl: `https://www.acsports.co.il/search?q=${q}` },
      { retailer: 'Shilav',             searchUrl: `https://www.shilav.co.il/search?q=${q}` },
      { retailer: 'Fox Shoes',          searchUrl: `https://www.foxshoes.co.il/search?q=${q}` },
    ];
  }
  return [
    { retailer: 'Nike',        searchUrl: `https://www.nike.com/w?q=${q}&vst=${q}` },
    { retailer: 'Foot Locker', searchUrl: `https://www.footlocker.com/search?query=${q}` },
    { retailer: 'Adidas',      searchUrl: `https://www.adidas.com/us/search?q=${q}` },
    { retailer: 'JD Sports',   searchUrl: `https://www.jdsports.com/search/jdsports/${q}/` },
    { retailer: 'Zappos',      searchUrl: `https://www.zappos.com/search/term/${q}` },
    { retailer: 'Finish Line', searchUrl: `https://www.finishline.com/store/browse/search.jsp?query=${q}` },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, city, country, countryCode, optimizeBy = 'best_deal' } = await req.json();

    if (!query || !query.trim()) return Response.json({ web_picks: [], nearby_stores: [] });

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;
    const optimizeMode = optimizeBy || 'best_deal';

    const cacheKey = `${q}::${cc}::${cityName}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const retailers = getRetailerSearchUrls(q, cc);

    const locationHint = cc === 'IL' ? 'Israel' : countryName;
    
    const optimizeInstructions = optimizeMode === 'fastest_shipping' 
      ? "Prioritize retailers with fastest shipping times. Include shipping speed info for each."
      : optimizeMode === 'closest'
      ? "Prioritize retailers with physical stores closest to the user location."
      : "Prioritize the best prices and biggest discounts.";
    
    const prompt = `Search Google Shopping for: "${q} ${locationHint}"

${optimizeInstructions}

Return the top 3 results with a real price. For each: retailer name, exact price (e.g. ₪529.90), direct product URL, in_stock true/false, shipping speed if available. Only include results with a visible price. Never guess prices. price_confidence="high".`;

    const schema = {
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
    };

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: schema,
    });

    const rawPicks = llmResult?.web_picks || [];

    // Filter out results with no real price or invalid retailer names (accuracy check)
    const validPicks = rawPicks.filter(p => {
      if (!p.retailer) return false;
      // Filter out generic/invalid retailer names
      const invalidRetailers = ['buy online', 'online store', 'shop now', 'buy now', 'retailer', 'store', 'website'];
      if (invalidRetailers.includes(p.retailer.toLowerCase().trim())) return false;
      if (!p.price || p.price.trim() === '') return false;
      // Must have a numeric price extractable
      const num = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
      if (!num || num <= 0) return false;
      return true;
    });

    // Deduplicate by retailer
    const seen = new Set();
    const dedupedPicks = validPicks.filter(p => {
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