/**
 * fastWebSearch — Single Gemini call to find online prices across retailers.
 * Replaced parallel-per-retailer approach (which timed out) with one combined call.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  if (CACHE.size > 300) {
    const keys = [...CACHE.keys()].slice(0, 60);
    keys.forEach(k => CACHE.delete(k));
  }
}

function normalizeCity(city = "") {
  return city.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(city|metro|downtown)$/, "").trim();
}
function geoHash(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  return `${(Math.floor(lat * 10) / 10).toFixed(1)}_${(Math.floor(lng * 10) / 10).toFixed(1)}`;
}

const CURRENCY_MAP = {
  IL: { code: 'ILS', symbol: '₪' },
  GB: { code: 'GBP', symbol: '£' },
  DE: { code: 'EUR', symbol: '€' }, FR: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' }, ES: { code: 'EUR', symbol: '€' },
  NL: { code: 'EUR', symbol: '€' }, BE: { code: 'EUR', symbol: '€' },
  AT: { code: 'EUR', symbol: '€' }, PT: { code: 'EUR', symbol: '€' },
  IE: { code: 'EUR', symbol: '€' }, FI: { code: 'EUR', symbol: '€' },
  GR: { code: 'EUR', symbol: '€' },
  AU: { code: 'AUD', symbol: 'A$' }, CA: { code: 'CAD', symbol: 'C$' },
  JP: { code: 'JPY', symbol: '¥' }, KR: { code: 'KRW', symbol: '₩' },
  IN: { code: 'INR', symbol: '₹' }, BR: { code: 'BRL', symbol: 'R$' },
  MX: { code: 'MXN', symbol: 'MX$' }, SE: { code: 'SEK', symbol: 'kr' },
  NO: { code: 'NOK', symbol: 'kr' }, DK: { code: 'DKK', symbol: 'kr' },
  CH: { code: 'CHF', symbol: 'CHF' }, SG: { code: 'SGD', symbol: 'S$' },
  HK: { code: 'HKD', symbol: 'HK$' }, NZ: { code: 'NZD', symbol: 'NZ$' },
  ZA: { code: 'ZAR', symbol: 'R' }, AE: { code: 'AED', symbol: 'AED' },
  SA: { code: 'SAR', symbol: 'SAR' },
};

function getCurrency(cc) {
  return CURRENCY_MAP[(cc || 'US').toUpperCase()] || { code: 'USD', symbol: '$' };
}

const RETAILER_LISTS = {
  IL: 'Nike Israel (nike.com/il), Adidas Israel (adidas.co.il), Foot Locker Israel (footlocker.co.il), Terminal X (terminalx.com), Dynamica (dynamica.co.il)',
  US: 'Nike (nike.com), Adidas (adidas.com), Foot Locker (footlocker.com), Finish Line (finishline.com), Zappos (zappos.com), JD Sports (jdsports.com)',
  GB: 'Nike UK (nike.com/gb), Adidas UK (adidas.co.uk), Foot Locker UK (footlocker.co.uk), JD Sports (jdsports.co.uk), Schuh (schuh.co.uk)',
  DE: 'Nike Germany (nike.com/de), Adidas (adidas.de), Zalando (zalando.de), Foot Locker Germany (footlocker.de)',
};

function getRetailerList(cc) {
  return RETAILER_LISTS[cc] || RETAILER_LISTS['US'];
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
    const cityName = city || countryName;
    const currency = getCurrency(cc);
    const retailers = getRetailerList(cc);

    const locKey = geoHash(latitude, longitude) || normalizeCity(cityName);
    const cacheKey = `v3::${q}::${cc}::${locKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find current online prices for: "${q}" in ${countryName} (${cc}).

Check ONLY these top 3 retailers: ${retailers.split(',').slice(0, 3).join(',')}

For each retailer that has this exact product:
- Get the current price in ${currency.code} (plain number only)
- Include the direct product URL
- Only include confirmed in-stock items

Return up to 3 exact matches, cheapest first.
Return up to 2 similar alternatives if needed.
All prices in ${currency.code}, plain numbers only.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
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

    const picks = (result?.web_picks || []).filter(p => p.price_numeric && p.in_stock !== false);
    // Sort by price and mark cheapest as best deal
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
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      })),
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], similar_options: [], error: error.message });
  }
});