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

function getRetailerSearchUrls(query, countryCode) {
  const q = encodeURIComponent(query);
  if (countryCode === 'IL') {
    return [
      { retailer: 'Foot Locker Israel', searchUrl: `https://footlocker.co.il/search?q=${q}` },
      { retailer: 'Fox Shoes',          searchUrl: `https://www.foxshoes.co.il/search?q=${q}` },
      { retailer: 'Shilav',             searchUrl: `https://www.shilav.co.il/search?q=${q}` },
      { retailer: 'Intisport',          searchUrl: `https://www.intisport.co.il/search?q=${q}` },
      { retailer: 'Sport Depot',        searchUrl: `https://www.sport-depot.co.il/search?q=${q}` },
      { retailer: 'Adidas Israel',      searchUrl: `https://www.adidas.co.il/search?q=${q}` },
    ];
  }
  return [
    { retailer: 'Foot Locker', searchUrl: `https://www.footlocker.com/search?query=${q}` },
    { retailer: 'JD Sports',   searchUrl: `https://www.jdsports.com/search/jdsports/${q}/` },
    { retailer: 'Zappos',      searchUrl: `https://www.zappos.com/search/term/${q}` },
    { retailer: 'Finish Line', searchUrl: `https://www.finishline.com/store/browse/search.jsp?query=${q}` },
    { retailer: 'DSW',         searchUrl: `https://www.dsw.com/en/us/search?q=${q}` },
    { retailer: 'Amazon',      searchUrl: `https://www.amazon.com/s?k=${q}` },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, city, country, countryCode, optimizeBy = 'best_deal', selectedSize = null } = await req.json();

    if (!query || !query.trim()) return Response.json({ web_picks: [], nearby_stores: [] });

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;
    const optimizeMode = optimizeBy || 'best_deal';

    // Include size in cache key so different sizes don't share results
    const cacheKey = `${q}::${cc}::${cityName}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const retailers = getRetailerSearchUrls(q, cc);
    const locationHint = cc === 'IL' ? 'Israel' : countryName;
    const sizeHint = selectedSize ? ` in US size ${selectedSize}` : '';

    const optimizeInstructions = optimizeMode === 'fastest_shipping'
      ? "Prioritize retailers with fastest shipping times."
      : optimizeMode === 'closest'
      ? "Prioritize retailers with physical stores closest to user."
      : "Prioritize the best prices and biggest discounts.";

    const prompt = `Search Google Shopping for EXACT PRODUCT: "${q}"${sizeHint} in ${locationHint}

${optimizeInstructions}

CRITICAL RULES:
1. Search for the EXACT shoe model name — match it precisely, do NOT substitute a different model
2. If a size is specified (${selectedSize ? `US size ${selectedSize}` : 'no size specified'}), return the price FOR THAT EXACT SIZE — different sizes may have different prices
3. Copy the EXACT price shown on the retailer website (e.g. "₪529.90" or "$129.99") — do NOT estimate or invent prices
4. Only return results where you can see the real price on the page right now
5. Return the direct product page URL (not homepage)
6. price_confidence must be "high" only if price is directly visible on the page

For each result return:
- name: EXACT product name as shown on site
- brand: brand name
- price: EXACT price string with currency symbol (copy from site)
- original_price: crossed-out/original price if on sale
- currency: ILS, USD, EUR, or GBP
- retailer: retailer name
- buy_link: direct product page URL
- in_stock: true/false
- ships_to_user: true if ships to ${locationHint}
- price_confidence: "high" only if price is confirmed visible on page

Return ONLY results with verified real prices. Never fabricate. Max 4 results.`;

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
              ships_to_user:      { type: "boolean" },
              estimated_shipping: { type: "string" },
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

    const invalidRetailers = ['buy online', 'online store', 'shop now', 'buy now', 'retailer', 'store', 'website'];
    const validPicks = rawPicks.filter(p => {
      if (!p.retailer) return false;
      if (invalidRetailers.includes(p.retailer.toLowerCase().trim())) return false;
      if (!p.price || p.price.trim() === '') return false;
      const num = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
      if (!num || num <= 0) return false;
      return true;
    });

    const seen = new Set();
    const dedupedPicks = validPicks.filter(p => {
      const k = p.retailer.toLowerCase().replace(/\s+/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

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

    if (finalPicks.length === 0) {
      for (const r of retailers.slice(0, 3)) {
        finalPicks.push({
          name: q, brand: '', price: '', original_price: '',
          currency: cc === 'IL' ? 'ILS' : 'USD',
          retailer: r.retailer, buy_link: r.searchUrl,
          in_stock: null, ships_to_user: true, estimated_shipping: '',
          is_best_deal: false, price_confidence: 'low', discount_percent: 0,
        });
      }
    }

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