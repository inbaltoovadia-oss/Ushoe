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

// Build guaranteed-working SEARCH page URLs for each retailer.
// These never 404 — they land on the retailer's own search results for the shoe.
function buildSearchUrl(retailerName, query, countryCode) {
  const q = encodeURIComponent(query);
  const rl = (retailerName || '').toLowerCase();

  if (countryCode === 'IL') {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (rl.includes('shilav'))      return `https://www.shilav.co.il/search?q=${q}`;
    if (rl.includes('fox'))         return `https://www.foxshoes.co.il/search?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.co.il/search?q=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/il/w?q=${q}`;
    if (rl.includes('sport depot')) return `https://www.sport-depot.co.il/search?q=${q}`;
    if (rl.includes('intisport'))   return `https://www.intisport.co.il/search?q=${q}`;
    if (rl.includes('terminal'))    return `https://www.terminalx.com/catalogsearch/result/?q=${q}`;
  } else {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://www.footlocker.com/search?query=${q}`;
    if (rl.includes('jd sports') || rl.includes('jdsports'))     return `https://www.jdsports.com/search/jdsports/${q}/`;
    if (rl.includes('zappos'))      return `https://www.zappos.com/search/term/${q}`;
    if (rl.includes('finish line')) return `https://www.finishline.com/store/browse/search.jsp?query=${q}`;
    if (rl.includes('dsw'))         return `https://www.dsw.com/en/us/search?q=${q}`;
    if (rl.includes('amazon'))      return `https://www.amazon.com/s?k=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/w?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.com/us/search?q=${q}`;
  }
  // Universal fallback: Google Shopping for this retailer
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + retailerName + ' buy')}`;
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

    // Size is part of cache key — different sizes may have different prices
    const cacheKey = `${q}::${cc}::${cityName}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const locationHint = cc === 'IL' ? 'Israel' : countryName;
    const sizeClause = selectedSize
      ? `The user specifically wants US size ${selectedSize}. Only report pricing for that size if the retailer shows size-specific pricing. If no size-specific price is shown, report the general price.`
      : '';

    const retailerList = cc === 'IL'
      ? 'Nike Israel (nike.com/il), Foot Locker Israel (footlocker.co.il), Shilav (shilav.co.il), Fox Shoes (foxshoes.co.il), Adidas Israel (adidas.co.il), Sport Depot (sport-depot.co.il), Terminal X (terminalx.com)'
      : 'Nike (nike.com), Foot Locker (footlocker.com), JD Sports (jdsports.com), Zappos (zappos.com), Finish Line (finishline.com), DSW (dsw.com), Adidas (adidas.com)';

    const prompt = `Search Google Shopping right now for: "${q}" in ${locationHint}.

Target retailers: ${retailerList}

${sizeClause}

YOUR ONLY JOB IS TO REPORT PRICES YOU CAN SEE IN THE SEARCH RESULTS.

Rules you MUST follow:
1. READ the price directly from what appears in the Google search results snippet — do NOT guess or invent
2. If you cannot see a real price for a retailer, OMIT that retailer entirely — do not fabricate a number
3. Report "price" as the EXACT string you see (e.g. "₪529.90" or "$115.00") — copy it verbatim
4. Report "original_price" only if you see a crossed-out/strikethrough price shown alongside the deal price
5. For "retailer" use the retailer's common name (e.g. "Foot Locker Israel", "Nike Israel")
6. Do NOT generate a product URL — leave buy_link as empty string "" — we will build the correct search URL ourselves
7. "price_confidence": set to "high" only if the price number is clearly visible in search results right now
8. "in_stock": set true only if search results explicitly say "In stock" or similar

Focus only on results where the price is 100% visible. Quality over quantity — 2 real results beat 5 guesses.`;

    const schema = {
      type: "object",
      properties: {
        web_picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name:             { type: "string" },
              brand:            { type: "string" },
              price:            { type: "string" },
              original_price:   { type: "string" },
              currency:         { type: "string" },
              retailer:         { type: "string" },
              buy_link:         { type: "string" },
              in_stock:         { type: "boolean" },
              ships_to_user:    { type: "boolean" },
              is_best_deal:     { type: "boolean" },
              price_confidence: { type: "string" },
              discount_percent: { type: "number" },
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

    // Strict validation — only keep results with a real numeric price
    const invalidRetailerNames = ['buy online', 'online store', 'shop now', 'buy now', 'retailer', 'store', 'website'];
    const validPicks = rawPicks.filter(p => {
      if (!p.retailer || invalidRetailerNames.includes(p.retailer.toLowerCase().trim())) return false;
      if (!p.price || p.price.trim() === '') return false;
      const num = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
      return num > 0;
    });

    // Deduplicate by retailer
    const seen = new Set();
    const dedupedPicks = validPicks.filter(p => {
      const k = p.retailer.toLowerCase().replace(/\s+/g, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // ALWAYS replace buy_link with a guaranteed-working search URL — never trust AI-generated URLs
    const finalPicks = dedupedPicks.map(p => ({
      ...p,
      buy_link: buildSearchUrl(p.retailer, q, cc),
    }));

    // If zero results, pad with search links (no fake prices)
    if (finalPicks.length === 0) {
      const fallbackRetailers = cc === 'IL'
        ? ['Foot Locker Israel', 'Shilav', 'Nike Israel']
        : ['Foot Locker', 'JD Sports', 'Zappos'];
      for (const retailerName of fallbackRetailers) {
        finalPicks.push({
          name: q, brand: '', price: '', original_price: '', currency: cc === 'IL' ? 'ILS' : 'USD',
          retailer: retailerName, buy_link: buildSearchUrl(retailerName, q, cc),
          in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'low', discount_percent: 0,
        });
      }
    }

    // Mark the lowest-priced result as best deal
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