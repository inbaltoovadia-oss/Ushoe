/**
 * fastWebSearch — Fast retailer price lookup using LLM knowledge + direct links.
 * Uses gpt_5_mini (no internet) for fast sub-10s response, then constructs direct buy links.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  if (CACHE.size > 200) {
    const keys = [...CACHE.keys()].slice(0, 40);
    keys.forEach(k => CACHE.delete(k));
  }
}

const CURRENCY_MAP = {
  IL: { code: 'ILS', symbol: '₪' },
  GB: { code: 'GBP', symbol: '£' },
  DE: { code: 'EUR', symbol: '€' }, FR: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' }, ES: { code: 'EUR', symbol: '€' },
  NL: { code: 'EUR', symbol: '€' }, BE: { code: 'EUR', symbol: '€' },
  AT: { code: 'EUR', symbol: '€' }, PT: { code: 'EUR', symbol: '€' },
  AU: { code: 'AUD', symbol: 'A$' }, CA: { code: 'CAD', symbol: 'C$' },
  JP: { code: 'JPY', symbol: '¥' }, IN: { code: 'INR', symbol: '₹' },
  BR: { code: 'BRL', symbol: 'R$' }, SE: { code: 'SEK', symbol: 'kr' },
  CH: { code: 'CHF', symbol: 'CHF' }, SG: { code: 'SGD', symbol: 'S$' },
  AE: { code: 'AED', symbol: 'AED' },
};

function getCurrency(cc) {
  return CURRENCY_MAP[(cc || 'US').toUpperCase()] || { code: 'USD', symbol: '$' };
}

const RETAILER_DOMAINS = {
  IL: [
    { name: 'Nike Israel', searchUrl: 'https://www.nike.com/il/w?q={q}', brand: 'Nike', domain: 'nike.com/il' },
    { name: 'Adidas Israel', searchUrl: 'https://www.adidas.co.il/search?q={q}', brand: 'Adidas', domain: 'adidas.co.il' },
    { name: 'Foot Locker Israel', searchUrl: 'https://www.footlocker.co.il/search?q={q}', brand: null, domain: 'footlocker.co.il' },
    { name: 'Terminal X', searchUrl: 'https://www.terminalx.com/search?q={q}', brand: null, domain: 'terminalx.com' },
  ],
  US: [
    { name: 'Nike', searchUrl: 'https://www.nike.com/w?q={q}', brand: 'Nike', domain: 'nike.com' },
    { name: 'Adidas', searchUrl: 'https://www.adidas.com/us/search?q={q}', brand: 'Adidas', domain: 'adidas.com' },
    { name: 'Foot Locker', searchUrl: 'https://www.footlocker.com/search?query={q}', brand: null, domain: 'footlocker.com' },
    { name: 'Finish Line', searchUrl: 'https://www.finishline.com/store/browse/search.jsp?_dyncharset=UTF-8&query={q}', brand: null, domain: 'finishline.com' },
    { name: 'Zappos', searchUrl: 'https://www.zappos.com/search?term={q}', brand: null, domain: 'zappos.com' },
  ],
  GB: [
    { name: 'Nike UK', searchUrl: 'https://www.nike.com/gb/w?q={q}', brand: 'Nike', domain: 'nike.com/gb' },
    { name: 'Adidas UK', searchUrl: 'https://www.adidas.co.uk/search?q={q}', brand: 'Adidas', domain: 'adidas.co.uk' },
    { name: 'JD Sports', searchUrl: 'https://www.jdsports.co.uk/search/{q}/', brand: null, domain: 'jdsports.co.uk' },
  ],
};

function getRetailers(cc) {
  return RETAILER_DOMAINS[cc] || RETAILER_DOMAINS['US'];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, countryCode, latitude = null, longitude = null } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [], similar_options: [], currency_symbol: '$', currency_code: 'USD' });
    }

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const currency = getCurrency(cc);
    const retailers = getRetailers(cc);

    const cacheKey = `v5::${q}::${cc}`;
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    // Fast LLM call — no internet, uses training knowledge for pricing estimates
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sneaker price expert. For the query: "${q}" in ${countryName} (${cc}):

1. Estimate the current retail price in ${currency.code} based on your knowledge of typical pricing for this shoe model.
2. List up to 4 of these specific retailers that would carry it: ${retailers.map(r => r.name).join(', ')}
3. For each retailer, provide a realistic price estimate in ${currency.code}.
4. If this model has a well-known sale or discount at any retailer, reflect that.
5. For similar/alternative shoes (different brand or model), suggest up to 2.

Be specific and realistic. Use actual known prices if you know them. Do NOT make up wildly incorrect prices.
Prices must be plain numbers in ${currency.code}, no symbols.

For buy_link: Use the retailer's search URL format with the shoe name encoded. Example for Nike Israel: https://www.nike.com/il/w?q=air+force+1`,
      response_json_schema: {
        type: 'object',
        properties: {
          web_picks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                retailer:              { type: 'string' },
                name:                  { type: 'string' },
                price_numeric:         { type: 'number' },
                original_price_numeric:{ type: 'number' },
                buy_link:              { type: 'string' },
                in_stock:              { type: 'boolean' },
                ships_to_user:         { type: 'boolean' },
                estimated_shipping:    { type: 'string' },
                discount_percent:      { type: 'number' },
                price_confidence:      { type: 'string' },
                exact_colorway_match:  { type: 'boolean' },
                is_best_deal:          { type: 'boolean' },
              }
            }
          },
          similar_options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                retailer:      { type: 'string' },
                name:          { type: 'string' },
                price_numeric: { type: 'number' },
                buy_link:      { type: 'string' },
                in_stock:      { type: 'boolean' },
              }
            }
          },
        }
      }
    });

    // Enhance buy links — if the LLM gave a bad/missing link, construct a search URL
    const qEncoded = encodeURIComponent(q.replace(/ buy$/i, '').trim());
    const retailerMap = Object.fromEntries(retailers.map(r => [r.name.toLowerCase(), r]));

    function enhanceLink(pick) {
      if (pick.buy_link && pick.buy_link.startsWith('http')) return pick.buy_link;
      const rKey = (pick.retailer || '').toLowerCase();
      const matched = retailers.find(r => rKey.includes(r.name.toLowerCase().split(' ')[0].toLowerCase()));
      if (matched) return matched.searchUrl.replace('{q}', qEncoded);
      return `https://www.google.com/search?q=${encodeURIComponent(q + ' ' + (pick.retailer || '') + ' buy')}`;
    }

    const picks = (result?.web_picks || []).map(p => ({ ...p, buy_link: enhanceLink(p) }));
    picks.sort((a, b) => (a.price_numeric || 9999) - (b.price_numeric || 9999));
    if (picks.length > 0) picks[0] = { ...picks[0], is_best_deal: true };

    const response = {
      web_picks: picks.map(p => ({
        ...p,
        original_price: p.original_price_numeric || null,
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      })),
      similar_options: (result?.similar_options || []).map(p => ({
        ...p,
        buy_link: enhanceLink(p),
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      })),
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      location_used: `${city || countryName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
      note: 'Prices are estimates based on typical retail pricing. Confirm on retailer site.',
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], similar_options: [], error: error.message });
  }
});