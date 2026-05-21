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

// Guaranteed-working retailer search URLs
function buildSearchUrl(retailerName, query, countryCode) {
  const q = encodeURIComponent(query);
  const rl = (retailerName || '').toLowerCase();

  if (countryCode === 'IL') {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.co.il/search?q=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/il/w?q=${q}`;
    if (rl.includes('terminal'))    return null; // Terminal X is permanently closed
    if (rl.includes('weshoes') || rl.includes('we shoes')) return `https://www.weshoes.co.il/search?q=${q}`;
    if (rl.includes('shilav'))      return `https://www.shilav.co.il/search?q=${q}`;
    if (rl.includes('fox'))         return `https://www.foxshoes.co.il/search?q=${q}`;
    if (rl.includes('crocs'))       return `https://www.crocs.co.il/search?q=${q}`;
    if (rl.includes('shufersal') || rl.includes('super-pharm') || rl.includes('ace')) return null;
  } else {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://www.footlocker.com/search?query=${q}`;
    if (rl.includes('zappos'))      return `https://www.zappos.com/search/term/${q}`;
    if (rl.includes('finish line')) return `https://www.finishline.com/store/browse/search.jsp?query=${q}`;
    if (rl.includes('dsw'))         return `https://www.dsw.com/en/us/search?q=${q}`;
    if (rl.includes('amazon'))      return `https://www.amazon.com/s?k=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/w?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.com/us/search?q=${q}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + retailerName + ' לקנות')}`;
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

    const cacheKey = `${q}::${cc}::${cityName}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const locationHint = cc === 'IL' ? 'Israel' : countryName;
    const currency = cc === 'IL' ? 'ILS (₪)' : 'USD ($)';
    const sizeNote = selectedSize ? ` in US size ${selectedSize}` : '';

    // IL retailers — broad multi-brand stores that could carry ANY shoe brand
    const ilRetailers = cc === 'IL' ? [
      'Foot Locker Israel (footlocker.co.il)',
      'WeShoes Israel (weshoes.co.il)',
      'Shilav (shilav.co.il)',
      'Fox Shoes (foxshoes.co.il)',
      'Nike Israel (nike.com/il) — ONLY if the shoe is a Nike brand product',
      'Adidas Israel (adidas.co.il) — ONLY if the shoe is an Adidas brand product',
      'Crocs Israel (crocs.co.il) — ONLY if the shoe is a Crocs brand product',
      'Puma Israel (puma.com/il) — ONLY if the shoe is a Puma brand product',
    ] : [
      'Foot Locker (footlocker.com)',
      'Zappos (zappos.com)',
      'DSW (dsw.com)',
      'Finish Line (finishline.com)',
      'Nike (nike.com) — ONLY if the shoe is a Nike brand product',
      'Adidas (adidas.com) — ONLY if the shoe is an Adidas brand product',
    ];

    const prompt = `You are a live price checker. Search the web right now to find the current selling price of "${q}"${sizeNote} in ${locationHint}.

Retailers to check (visit each website):
${ilRetailers.map(r => `- ${r}`).join('\n')}

INSTRUCTIONS:
1. For each retailer, go to their website and search for "${q}"
2. Only report a retailer if: (a) the shoe is actually listed on their site AND (b) you can see the exact price on the page
3. The price must be the actual current price in ${currency} — copy it exactly as shown (e.g. "₪649.90" or "$129.99")
4. If the shoe is not found on a retailer's site, or is out of stock, skip that retailer entirely
5. Brand-specific stores (Nike, Adidas, Crocs, Puma) should ONLY be included if the shoe brand matches — e.g. do NOT show Nike Israel for Crocs or Adidas shoes
6. Leave buy_link as empty string "" — it will be filled automatically
7. Report in_stock as true only if the shoe is currently available to purchase

Return ONLY retailers where you verified a real price from their website.`;

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
      // Must have a real price
      if (!p.price || p.price.trim() === '') return false;
      const num = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
      if (num <= 0) return false;
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

    // Replace AI buy_link with guaranteed search URL — drop picks with no valid URL
    const finalPicks = dedupedPicks
      .map(p => {
        const url = buildSearchUrl(p.retailer, q, cc);
        if (!url) return null; // drop retailers with no valid URL
        return { ...p, buy_link: url };
      })
      .filter(Boolean);

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

    if (finalPicks.length > 0) cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], nearby_stores: [], error: error.message });
  }
});