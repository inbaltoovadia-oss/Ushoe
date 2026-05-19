/**
 * fastWebSearch — Parallel per-retailer price lookups for maximum accuracy.
 * Each retailer is searched independently so prices can't bleed into each other.
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

// Retailers to search per country
const RETAILERS_BY_COUNTRY = {
  IL: [
    { name: 'Nike Israel', domain: 'nike.com/il', searchUrl: 'site:nike.com/il' },
    { name: 'Adidas Israel', domain: 'adidas.co.il', searchUrl: 'site:adidas.co.il' },
    { name: 'Foot Locker Israel', domain: 'footlocker.co.il', searchUrl: 'site:footlocker.co.il' },
    { name: 'Terminal X', domain: 'terminalx.com', searchUrl: 'site:terminalx.com' },
    { name: 'Dynamica', domain: 'dynamica.co.il', searchUrl: 'site:dynamica.co.il' },
  ],
  US: [
    { name: 'Nike', domain: 'nike.com', searchUrl: 'site:nike.com' },
    { name: 'Adidas', domain: 'adidas.com', searchUrl: 'site:adidas.com' },
    { name: 'Foot Locker', domain: 'footlocker.com', searchUrl: 'site:footlocker.com' },
    { name: 'Finish Line', domain: 'finishline.com', searchUrl: 'site:finishline.com' },
    { name: 'Zappos', domain: 'zappos.com', searchUrl: 'site:zappos.com' },
    { name: 'JD Sports', domain: 'jdsports.com', searchUrl: 'site:jdsports.com' },
  ],
  GB: [
    { name: 'Nike UK', domain: 'nike.com/gb', searchUrl: 'site:nike.com/gb' },
    { name: 'Adidas UK', domain: 'adidas.co.uk', searchUrl: 'site:adidas.co.uk' },
    { name: 'Foot Locker UK', domain: 'footlocker.co.uk', searchUrl: 'site:footlocker.co.uk' },
    { name: 'JD Sports UK', domain: 'jdsports.co.uk', searchUrl: 'site:jdsports.co.uk' },
    { name: 'Schuh', domain: 'schuh.co.uk', searchUrl: 'site:schuh.co.uk' },
  ],
  DE: [
    { name: 'Nike Germany', domain: 'nike.com/de', searchUrl: 'site:nike.com/de' },
    { name: 'Adidas Germany', domain: 'adidas.de', searchUrl: 'site:adidas.de' },
    { name: 'Zalando', domain: 'zalando.de', searchUrl: 'site:zalando.de' },
    { name: 'Foot Locker Germany', domain: 'footlocker.de', searchUrl: 'site:footlocker.de' },
  ],
};

function getRetailers(cc) {
  return RETAILERS_BY_COUNTRY[cc] || RETAILERS_BY_COUNTRY['US'];
}

async function searchOneRetailer(base44, retailer, shoeName, currency, countryName) {
  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Search the web specifically on ${retailer.domain} for the exact product: "${shoeName}".

Go to ${retailer.domain} and find THIS EXACT shoe. Look for the current live price shown on the product page.

STRICT RULES:
1. Only return data if you found the EXACT shoe "${shoeName}" on ${retailer.domain}
2. The price MUST be in ${currency.code} (${currency.symbol}) as shown on the page — do NOT convert
3. The shoe must currently show "Add to Cart" or "Buy Now" (in stock)
4. buy_link must be the real product URL on ${retailer.domain} — copy it exactly from search results
5. If the shoe is not found or out of stock on ${retailer.domain}, return found: false

Be precise. Only report what you actually found, not what you estimate.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          found:            { type: "boolean" },
          price_numeric:    { type: "number" },
          original_price_numeric: { type: "number" },
          buy_link:         { type: "string" },
          in_stock:         { type: "boolean" },
          product_name:     { type: "string" },
          shipping_info:    { type: "string" },
          discount_percent: { type: "number" },
        }
      }
    });

    if (!result?.found || !result?.price_numeric || !result?.in_stock) return null;

    return {
      retailer: retailer.name,
      name: result.product_name || shoeName,
      price_numeric: result.price_numeric,
      original_price: result.original_price_numeric ? result.original_price_numeric : null,
      buy_link: result.buy_link || null,
      ships_to_user: true,
      estimated_shipping: result.shipping_info || null,
      in_stock: true,
      price_confidence: "high",
      discount_percent: result.discount_percent || 0,
      exact_colorway_match: true,
      is_best_deal: false,
      currency_code: currency.code,
      currency_symbol: currency.symbol,
    };
  } catch {
    return null;
  }
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

    const locKey = geoHash(latitude, longitude) || normalizeCity(cityName);
    const cacheKey = `v2::${q}::${cc}::${locKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const retailers = getRetailers(cc);

    // Search all retailers in parallel for accurate independent results
    const results = await Promise.all(
      retailers.map(r => searchOneRetailer(base44, r, q, currency, countryName))
    );

    const exactMatches = results
      .filter(r => r !== null)
      .sort((a, b) => (a.price_numeric || 9999) - (b.price_numeric || 9999));

    // Mark cheapest as best deal
    if (exactMatches.length > 0) {
      exactMatches[0] = { ...exactMatches[0], is_best_deal: true };
    }

    const response = {
      web_picks: exactMatches,
      similar_options: [],
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      location_used: `${cityName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
      retailers_searched: retailers.map(r => r.name),
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], similar_options: [], error: error.message });
  }
});