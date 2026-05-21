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

function buildSearchUrl(retailerName, query, countryCode) {
  const cleanQuery = query.replace(/\s+buy\s*$/i, '').trim();
  const q = encodeURIComponent(cleanQuery);
  const rl = (retailerName || '').toLowerCase();

  if (countryCode === 'IL') {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (rl.includes('weshoes') || rl.includes('we shoes')) return `https://www.weshoes.co.il/search?q=${q}`;
    if (rl.includes('adidas'))  return `https://www.adidas.co.il/search?q=${q}`;
    if (rl.includes('nike'))    return `https://www.nike.com/il/w?q=${q}`;
    if (rl.includes('puma'))    return `https://www.puma.com/il/he/search?q=${q}`;
    if (rl.includes('terminal') || rl.includes('shilav') || rl.includes('fox') || rl.includes('crocs')) return null;
  } else {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://www.footlocker.com/search?query=${q}`;
    if (rl.includes('zappos'))      return `https://www.zappos.com/search/term/${q}`;
    if (rl.includes('finish line')) return `https://www.finishline.com/store/browse/search.jsp?query=${q}`;
    if (rl.includes('dsw'))         return `https://www.dsw.com/en/us/search?q=${q}`;
    if (rl.includes('amazon'))      return `https://www.amazon.com/s?k=${q}`;
    if (rl.includes('nike'))        return `https://www.nike.com/w?q=${q}`;
    if (rl.includes('adidas'))      return `https://www.adidas.com/us/search?q=${q}`;
  }
  return null;
}

// Get IL retailers to check based on brand
function getILRetailers(query, brand) {
  const b = (brand || query || '').toLowerCase();
  const retailers = [
    { name: 'Foot Locker Israel', domain: 'footlocker.co.il', searchUrl: `https://footlocker.co.il/search?q=${encodeURIComponent(query)}` },
    { name: 'WeShoes Israel',     domain: 'weshoes.co.il',    searchUrl: `https://www.weshoes.co.il/search?q=${encodeURIComponent(query)}` },
  ];
  if (b.includes('nike'))   retailers.unshift({ name: 'Nike Israel',   domain: 'nike.com/il',    searchUrl: `https://www.nike.com/il/w?q=${encodeURIComponent(query)}` });
  if (b.includes('adidas')) retailers.unshift({ name: 'Adidas Israel', domain: 'adidas.co.il',   searchUrl: `https://www.adidas.co.il/search?q=${encodeURIComponent(query)}` });
  if (b.includes('puma'))   retailers.push(   { name: 'Puma Israel',   domain: 'puma.com',       searchUrl: `https://www.puma.com/il/he/search?q=${encodeURIComponent(query)}` });
  return retailers;
}

// Fetch price from a single retailer using a focused LLM call
async function fetchRetailerPrice(base44, query, retailer, sizeNote) {
  try {
    const result = await Promise.race([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Search the web right now for the current price of "${query}"${sizeNote ? ` ${sizeNote}` : ''} on ${retailer.domain}.

Look at the actual product listing page on ${retailer.domain} and return:
- price: the exact price shown (e.g. "₪649.90", "$120.00") — must be a real number from the page
- original_price: original/crossed-out price if there is a discount, otherwise same as price
- buy_link: direct URL to the product or search results page on ${retailer.domain}
- in_stock: true if available to buy, false if sold out
- discount_percent: integer discount percentage if on sale, else 0

If you cannot find the product on this specific site, return price as null.`,
        add_context_from_internet: true,
        model: "gemini_3_1_pro",
        response_json_schema: {
          type: "object",
          properties: {
            price:            { type: "string" },
            original_price:   { type: "string" },
            buy_link:         { type: "string" },
            in_stock:         { type: "boolean" },
            price_confidence: { type: "string" },
            discount_percent: { type: "number" },
          }
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 55000))
    ]);

    const price = result?.price;
    const priceNum = parseFloat((price || '').replace(/[^0-9.]/g, ''));
    if (!price || isNaN(priceNum) || priceNum <= 0) return null;

    const rawLink = (result?.buy_link || '').trim();
    const link = (rawLink.startsWith('http') && !rawLink.includes('google.com'))
      ? rawLink
      : retailer.searchUrl;

    return {
      retailer: retailer.name,
      name: query,
      brand: '',
      price,
      original_price: result?.original_price || null,
      currency: 'ILS',
      buy_link: link,
      in_stock: result?.in_stock ?? true,
      ships_to_user: true,
      is_best_deal: false,
      price_confidence: result?.price_confidence || 'medium',
      discount_percent: result?.discount_percent || 0,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  let parsedBody = {};
  try { parsedBody = await req.json(); } catch {}

  const { query, city, country, countryCode, brand = '', selectedSize = null, userLat = null, userLng = null } = parsedBody;

  const q = (query || '').trim();
  const cc = (countryCode || 'US').toUpperCase();
  const countryName = country || 'United States';
  const cityName = city || countryName;

  try {
    const base44 = createClientFromRequest(req);
    if (!q) return Response.json({ web_picks: [], nearby_stores: [] });

    const cacheKey = `${q}::${cc}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const sizeNote = selectedSize ? `US size ${selectedSize}` : '';

    let finalPicks = [];

    if (cc === 'IL') {
      // Parallel per-retailer price fetches — whichever returns first wins
      const retailers = getILRetailers(q, brand);
      const results = await Promise.all(retailers.map(r => fetchRetailerPrice(base44, q, r, sizeNote)));
      finalPicks = results.filter(Boolean);
    } else {
      // For non-IL: single broad search
      const prompt = `Search the web and find current prices for "${q}"${sizeNote ? ` in ${sizeNote}` : ''} from major US retailers: Foot Locker, Zappos, Nike, Adidas, DSW, Finish Line.
For each retailer found: report exact price, direct URL, stock status.`;
      const result = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          model: "gemini_3_1_pro",
          response_json_schema: {
            type: "object",
            properties: {
              web_picks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    retailer: { type: "string" }, price: { type: "string" },
                    buy_link: { type: "string" }, in_stock: { type: "boolean" },
                    is_best_deal: { type: "boolean" }, price_confidence: { type: "string" },
                    discount_percent: { type: "number" }, currency: { type: "string" },
                  }
                }
              }
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 50000))
      ]);
      finalPicks = (result?.web_picks || []).filter(p => p.price && parseFloat(p.price.replace(/[^0-9.]/g, '')) > 0)
        .map(p => ({
          ...p,
          buy_link: buildSearchUrl(p.retailer, q, cc) || p.buy_link,
        })).filter(p => p.buy_link);
    }

    // Mark best deal (lowest price)
    if (finalPicks.length > 0 && !finalPicks.some(p => p.is_best_deal)) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0 && prices[minIdx] < Infinity) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    // Fallback if nothing found — verified search links (no Shilav)
    let fallbackPicks = [];
    if (finalPicks.length === 0) {
      if (cc === 'IL') {
        const fq = encodeURIComponent(q);
        const retailers = getILRetailers(q, brand);
        fallbackPicks = retailers.map((r, i) => ({
          retailer: r.name, name: q, brand: '', currency: 'ILS', price: null,
          buy_link: r.searchUrl, in_stock: null, ships_to_user: true,
          is_best_deal: i === 0, price_confidence: 'low',
          discount_percent: 0, is_fallback_search_link: true,
        }));
      }
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
    const fq = encodeURIComponent(q);
    const fallback = cc === 'IL' ? [
      { retailer: 'Foot Locker Israel', buy_link: `https://footlocker.co.il/search?q=${fq}`, price: null, name: q, brand: '', currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: true,  price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
      { retailer: 'WeShoes Israel',     buy_link: `https://www.weshoes.co.il/search?q=${fq}`, price: null, name: q, brand: '', currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
      { retailer: 'Nike Israel',        buy_link: `https://www.nike.com/il/w?q=${fq}`,         price: null, name: q, brand: '', currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
    ] : [];
    return Response.json({ web_picks: fallback, nearby_stores: [], timed_out: true, used_fallback: true, error: error.message });
  }
});