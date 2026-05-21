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

// Fallback search URL only used when AI couldn't find a direct product link
function buildSearchUrl(retailerName, query, countryCode) {
  const q = encodeURIComponent(query);
  const rl = (retailerName || '').toLowerCase();

  if (countryCode === 'IL') {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.co.il/search?q=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/il/w?q=${q}`;
    if (rl.includes('terminal'))    return null; // permanently closed
    if (rl.includes('weshoes') || rl.includes('we shoes')) return `https://www.weshoes.co.il/search?q=${q}`;
    if (rl.includes('shilav'))      return `https://www.shilav.co.il/search?q=${q}`;
    if (rl.includes('fox'))         return `https://www.foxshoes.co.il/search?q=${q}`;
    if (rl.includes('crocs'))       return null; // no physical/dedicated store in Israel — handled by multi-brand retailers
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
  // Parse body once at the top so it's available in both try and catch
  let parsedBody = {};
  try { parsedBody = await req.json(); } catch {}

  const { query, city, country, countryCode, optimizeBy = 'best_deal', selectedSize = null } = parsedBody;

  const q = (query || '').trim();
  const cc = (countryCode || 'US').toUpperCase();
  const countryName = country || 'United States';
  const cityName = city || countryName;

  try {
    const base44 = createClientFromRequest(req);

    if (!q) return Response.json({ web_picks: [], nearby_stores: [] });

    const cacheKey = `${q}::${cc}::${cityName}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const locationHint = cc === 'IL' ? 'Israel' : countryName;
    const currency = cc === 'IL' ? 'ILS (₪)' : 'USD ($)';
    const sizeNote = selectedSize ? ` in US size ${selectedSize}` : '';

    const ilRetailers = cc === 'IL' ? [
      'Foot Locker Israel (footlocker.co.il)',
      'WeShoes Israel (weshoes.co.il)',
      'Shilav (shilav.co.il)',
      'Fox Shoes (foxshoes.co.il)',
      'Nike Israel (nike.com/il) — ONLY if the shoe is a Nike brand product',
      'Adidas Israel (adidas.co.il) — ONLY if the shoe is an Adidas brand product',
      'Puma Israel (puma.com/il) — ONLY if the shoe is a Puma brand product',
    ] : [
      'Foot Locker (footlocker.com)',
      'Zappos (zappos.com)',
      'DSW (dsw.com)',
      'Finish Line (finishline.com)',
      'Nike (nike.com) — ONLY if the shoe is a Nike brand product',
      'Adidas (adidas.com) — ONLY if the shoe is an Adidas brand product',
    ];

    const prompt = `You are a live price checker. Search the web RIGHT NOW to find the current selling price of "${q}"${sizeNote} in ${locationHint}.

Retailers to check (visit each website and find the product):
${ilRetailers.map(r => `- ${r}`).join('\n')}

STEP-BY-STEP FOR EACH RETAILER:
1. Go to their website
2. Search for "${q}"
3. Click on the exact product listing
4. Copy the EXACT price shown on the product page (e.g. "₪649.90")
5. Copy the FULL URL of that specific product page (e.g. "https://footlocker.co.il/products/some-shoe-slug")

STRICT RULES:
- ONLY report a retailer if you actually found this exact shoe listed on their site with a visible price
- The price must be what you see on the page right now — NEVER guess or estimate
- buy_link MUST be the direct URL of the specific product page you found — NOT a search page URL
- If you only found a search results page but no specific product, still report the search URL
- Skip any retailer where the shoe is not found or out of stock
- Brand stores (Nike, Adidas, Puma) ONLY if the shoe brand matches exactly
- price_confidence: "high" = you opened the product page; "medium" = search results snippet only

Return ONLY retailers where you confirmed a real price.`;

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

    const llmResult = await Promise.race([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: schema,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 60000))
    ]);

    const rawPicks = llmResult?.web_picks || [];

    const invalidRetailerNames = ['buy online', 'online store', 'shop now', 'buy now', 'retailer', 'store', 'website'];
    // Blocked retailer names and domains — Terminal X is closed, Crocs has no IL store
    const BLOCKED_RETAILER_KEYWORDS = ['terminal x', 'terminalx', 'crocs store'];
    const BLOCKED_DOMAINS = ['terminalx.com', 'crocs.com'];

    const validPicks = rawPicks.filter(p => {
      if (!p.retailer || invalidRetailerNames.includes(p.retailer.toLowerCase().trim())) return false;
      if (!p.price || p.price.trim() === '') return false;
      const num = parseFloat((p.price || '').replace(/[^0-9.]/g, ''));
      if (num <= 0) return false;
      // Block by retailer name (catches "Terminal X (Fox Shoes)" etc.)
      const rl = p.retailer.toLowerCase();
      if (BLOCKED_RETAILER_KEYWORDS.some(k => rl.includes(k))) return false;
      // Block by buy_link domain
      const link = (p.buy_link || '').toLowerCase();
      if (BLOCKED_DOMAINS.some(d => link.includes(d))) return false;
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

    // Use AI-provided direct product URL if it looks valid, otherwise fall back to search URL
    const finalPicks = dedupedPicks
      .map(p => {
        const aiLink = (p.buy_link || '').trim();
        // Use AI link if it's a real product URL (not a search page, not empty)
        const isDirectProductUrl = aiLink.startsWith('http') &&
          !aiLink.includes('/search') &&
          !aiLink.includes('?q=') &&
          !aiLink.includes('?query=') &&
          !aiLink.includes('google.com');

        const url = isDirectProductUrl ? aiLink : buildSearchUrl(p.retailer, q, cc);
        if (!url) return null; // drop blocked retailers (Terminal X, Crocs store, etc.)
        return { ...p, buy_link: url };
      })
      .filter(Boolean);

    // Mark best deal (lowest confirmed price)
    if (!finalPicks.some(p => p.is_best_deal)) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0 && prices[minIdx] < Infinity) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    // If AI returned nothing (timeout or no results), provide verified retailer search links as fallback
    let fallbackPicks = [];
    if (finalPicks.length === 0 && cc === 'IL') {
      const cleanQ = q.replace(/\s*buy\s*$/i, '').trim();
      const fq = encodeURIComponent(cleanQ);
      const fallbackRetailers = [
        { retailer: 'Foot Locker Israel', buy_link: `https://footlocker.co.il/search?q=${fq}`, price: null },
        { retailer: 'WeShoes Israel',    buy_link: `https://www.weshoes.co.il/search?q=${fq}`, price: null },
        { retailer: 'Shilav',            buy_link: `https://www.shilav.co.il/search?q=${fq}`, price: null },
      ];
      fallbackPicks = fallbackRetailers.map((r, i) => ({
        ...r,
        name: q,
        brand: '',
        currency: 'ILS',
        in_stock: null,
        ships_to_user: true,
        is_best_deal: i === 0,
        price_confidence: 'low',
        discount_percent: 0,
        is_fallback_search_link: true,
      }));
    }

    const response = {
      web_picks: finalPicks.length > 0 ? finalPicks : fallbackPicks,
      nearby_stores: [],
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
      used_fallback: finalPicks.length === 0,
    };

    if (finalPicks.length > 0) cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    // On timeout/error, return fallback search links for IL so user still sees actionable options
    let fallback = [];
    if (cc === 'IL' && q) {
      const cleanQ = q.replace(/\s*buy\s*$/i, '').trim();
      const fq = encodeURIComponent(cleanQ);
      fallback = [
      { retailer: 'Foot Locker Israel', buy_link: `https://footlocker.co.il/search?q=${fq}`, price: null, name: cleanQ, brand: '', currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: true,  price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
      { retailer: 'WeShoes Israel',     buy_link: `https://www.weshoes.co.il/search?q=${fq}`, price: null, name: cleanQ, brand: '', currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
      { retailer: 'Shilav',             buy_link: `https://www.shilav.co.il/search?q=${fq}`, price: null, name: cleanQ, brand: '', currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
      ];
    }
    return Response.json({ web_picks: fallback, nearby_stores: [], timed_out: true, used_fallback: fallback.length > 0, error: error.message });
  }
});