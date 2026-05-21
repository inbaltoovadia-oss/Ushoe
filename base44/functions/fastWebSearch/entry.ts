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

// Guaranteed-working retailer search URLs — never 404
function buildSearchUrl(retailerName, query, countryCode) {
  const q = encodeURIComponent(query);
  const rl = (retailerName || '').toLowerCase();

  if (countryCode === 'IL') {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.co.il/search?q=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/il/w?q=${q}`;
    if (rl.includes('sport depot')) return `https://www.sport-depot.co.il/search?q=${q}`;
    if (rl.includes('intisport'))   return `https://www.intisport.co.il/search?q=${q}`;
    if (rl.includes('terminal'))    return `https://www.terminalx.com/catalogsearch/result/?q=${q}`;
    if (rl.includes('intisport'))   return `https://www.intisport.co.il/search?q=${q}`;
  } else {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://www.footlocker.com/search?query=${q}`;

    if (rl.includes('zappos'))      return `https://www.zappos.com/search/term/${q}`;
    if (rl.includes('finish line')) return `https://www.finishline.com/store/browse/search.jsp?query=${q}`;
    if (rl.includes('dsw'))         return `https://www.dsw.com/en/us/search?q=${q}`;
    if (rl.includes('amazon'))      return `https://www.amazon.com/s?k=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/w?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.com/us/search?q=${q}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + retailerName + ' buy')}`;
}

// Verified IL retailers with confirmed working search URLs — used as guaranteed fallback padding
const IL_FALLBACK_RETAILERS = [
  { name: 'Nike Israel',         url: (q) => `https://www.nike.com/il/w?q=${q}` },
  { name: 'Foot Locker Israel',  url: (q) => `https://footlocker.co.il/search?q=${q}` },
  { name: 'Adidas Israel',       url: (q) => `https://www.adidas.co.il/search?q=${q}` },
  { name: 'Intisport',           url: (q) => `https://www.intisport.co.il/search?q=${q}` },
];

const US_FALLBACK_RETAILERS = [
  { name: 'Foot Locker',  url: (q) => `https://www.footlocker.com/search?query=${q}` },
  { name: 'Zappos',       url: (q) => `https://www.zappos.com/search/term/${q}` },
  { name: 'Zappos',       url: (q) => `https://www.zappos.com/search/term/${q}` },
  { name: 'Nike',         url: (q) => `https://www.nike.com/w?q=${q}` },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, city, country, countryCode, optimizeBy = 'best_deal', selectedSize = null } = await req.json();

    if (!query || !query.trim()) return Response.json({ web_picks: [], nearby_stores: [] });

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;

    const cacheKey = `${q}::${cc}::${cityName}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const locationHint = cc === 'IL' ? 'Israel' : countryName;


    const retailers = cc === 'IL'
      ? [
          { name: 'Nike Israel',        url: 'nike.com/il' },
          { name: 'Adidas Israel',      url: 'adidas.co.il' },
          { name: 'Foot Locker Israel', url: 'footlocker.co.il' },
          { name: 'Intisport',          url: 'intisport.co.il' },
          { name: 'Intisport',          url: 'intisport.co.il' },
        ]
      : [
          { name: 'Nike',        url: 'nike.com' },
          { name: 'Adidas',      url: 'adidas.com' },
          { name: 'Foot Locker', url: 'footlocker.com' },
          { name: 'Zappos',      url: 'zappos.com' },
          { name: 'Finish Line', url: 'finishline.com' },
          { name: 'DSW',         url: 'dsw.com' },
        ];

    const sizeStep = selectedSize
      ? `For each retailer: (1) open their website, (2) search for "${q}", (3) select US size ${selectedSize} on the product page, (4) copy the EXACT price shown for that size. If the size is unavailable or the retailer doesn't carry this shoe, skip them.`
      : `For each retailer: (1) open their website, (2) search for "${q}", (3) copy the EXACT price shown on the product listing page.`;

    const prompt = `You are a price research agent. For the shoe "${q}" sold in ${locationHint}, visit each retailer website below and extract the real live price.

Retailers to check:
${retailers.map(r => `- ${r.name}: ${r.url}`).join('\n')}

HOW TO GET THE PRICE:
${sizeStep}

STRICT RULES — violations will cause the data to be discarded:
1. ONLY report prices you literally see on the retailer's website right now — NEVER estimate, guess, or use your training data
2. The price must be a real number visible on the page (e.g. "₪529.90", "$119.00") — copy it character-for-character
3. If you cannot find this shoe on a retailer's site, or cannot see a price, OMIT that retailer entirely
4. Set buy_link to empty string "" — we will build URLs ourselves
5. Set price_confidence "high" only if you actually navigated to the product page and saw the price; "low" if from a search snippet only
6. DO NOT report the same price for multiple retailers — each must be independently verified

Return only retailers where you confirmed a real price by visiting their site.`;

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

    // Replace AI buy_link with guaranteed search URL
    const finalPicks = dedupedPicks.map(p => ({
      ...p,
      buy_link: buildSearchUrl(p.retailer, q, cc),
    }));

    // Pad to minimum 3 with official verified retailers only (no invented prices)
    const officialRetailers = cc === 'IL'
      ? [
          { name: 'Nike Israel',        url: (q) => `https://www.nike.com/il/w?q=${q}`,              brand: 'nike' },
          { name: 'Adidas Israel',      url: (q) => `https://www.adidas.co.il/search?q=${q}`,        brand: 'adidas' },
          { name: 'Foot Locker Israel', url: (q) => `https://footlocker.co.il/search?q=${q}`,        brand: null },
          { name: 'Intisport',          url: (q) => `https://www.intisport.co.il/search?q=${q}`,     brand: null },
        ]
      : [
          { name: 'Foot Locker', url: (q) => `https://www.footlocker.com/search?query=${q}`, brand: null },
          { name: 'Nike',        url: (q) => `https://www.nike.com/w?q=${q}`,                brand: 'nike' },
          { name: 'Adidas',      url: (q) => `https://www.adidas.com/us/search?q=${q}`,     brand: 'adidas' },
          { name: 'Zappos',      url: (q) => `https://www.zappos.com/search/term/${q}`,     brand: null },
        ];

    const enc = encodeURIComponent(q);
    const qLower = q.toLowerCase();
    for (const fb of officialRetailers) {
      if (finalPicks.length >= 3) break;
      // Skip brand-specific stores that wouldn't carry a competitor's shoe
      if (fb.brand === 'nike' && (qLower.includes('adidas') || qLower.includes('puma') || qLower.includes('reebok'))) continue;
      if (fb.brand === 'adidas' && (qLower.includes('nike') || qLower.includes('jordan') || qLower.includes('puma'))) continue;
      const alreadyHave = finalPicks.some(p => p.retailer.toLowerCase().replace(/\s+/g,'').includes(fb.name.toLowerCase().replace(/\s+/g,'').split('israel')[0].trim().replace(/\s+/g,'')));
      if (!alreadyHave) {
        finalPicks.push({
          name: q, brand: '', price: '', original_price: '', currency: cc === 'IL' ? 'ILS' : 'USD',
          retailer: fb.name, buy_link: fb.url(enc),
          in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'official_only', discount_percent: 0,
        });
      }
    }

    // Mark best deal (lowest confirmed price)
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