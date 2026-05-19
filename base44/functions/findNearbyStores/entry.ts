/**
 * findNearbyStores — Single fast Gemini call to find nearby stores
 * Enforces exact model/colorway/size matching
 * Results cached 3 hours per location
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 3 * 60 * 60 * 1000;

function normalizeCity(city = '') {
  return city.toLowerCase().replace(/\s*-\s*/g, '').replace(/[^a-z0-9]/g, '').replace(/(city|metro|downtown|district|area)$/, '').trim();
}
function geoHash(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  const snap = (v) => (Math.floor(v * 10) / 10).toFixed(1);
  return `${snap(lat)}_${snap(lng)}`;
}

const CURRENCY_INFO = {
  IL: { code: 'ILS', symbol: '₪' }, GB: { code: 'GBP', symbol: '£' },
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
  return CURRENCY_INFO[(cc || 'US').toUpperCase()] || { code: 'USD', symbol: '$' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      shoe,
      selectedSize = null,
      selectedColor = null,
      cityFallback = null,
      latitude = null,
      longitude = null,
      countryCode = 'US',
    } = body;

    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const city = cityFallback || 'unknown location';
    const cc = (countryCode || 'US').toUpperCase();
    const currency = getCurrency(cc);

    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const sizeInfo = selectedSize ? `US size ${selectedSize}` : '';
    const colorInfo = selectedColor || shoe.colorway || '';

    const cacheKey = `${shoe.id || shoe.name}_${geoHash(latitude, longitude) || normalizeCity(city)}_${selectedSize || ''}_${cc}`;
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    // Single parallel call: stores + local price
    const [storeResult, priceResult] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Find up to 5 real sneaker stores near ${city} (${cc}) that stock the EXACT shoe: "${shoeFullName}".
${sizeInfo ? `Size needed: ${sizeInfo}.` : ''}
${colorInfo ? `Colorway: ${colorInfo}.` : ''}

CRITICAL RULES:
1. Only include stores that are REAL physical locations in or near ${city} with verified addresses.
2. Prefer official brand stores (${shoe.brand}), then Foot Locker, JD Sports, local sneaker boutiques.
3. stock_confidence = "high" only if the store is known to regularly carry ${shoe.brand} sneakers in this style.
4. stock_confidence = "medium" for general sneaker retailers likely to have it.
5. stock_confidence = "low" for stores that might carry it but uncertain.
6. Rank by: (1) stock_confidence high→low, (2) distance closest first.
7. For each store include: name, address, phone, website, maps_url (Google Maps link), distance_km, rating (out of 5), is_open (boolean), stock_confidence, stock_status (short phrase), why (reason ≤10 words why they'd carry it).

Return real data only. If you cannot find real stores near ${city}, return an empty stores array.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            stores: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name:             { type: 'string' },
                  address:          { type: 'string' },
                  phone:            { type: 'string' },
                  website:          { type: 'string' },
                  maps_url:         { type: 'string' },
                  distance_km:      { type: 'number' },
                  rating:           { type: 'number' },
                  is_open:          { type: 'boolean' },
                  stock_confidence: { type: 'string' },
                  stock_status:     { type: 'string' },
                  why:              { type: 'string' },
                }
              }
            },
            summary: { type: 'string' },
          }
        }
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `What is the current retail price of "${shoeFullName}" in ${cc === 'IL' ? 'Israel (ILS, ₪)' : `${cc} in ${currency.code} (${currency.symbol})`}?
Find the official brand website price and any active sale price RIGHT NOW.
Return price_current as a plain number in ${currency.code} (no symbols). Return null if not found.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            price_current:  { type: 'number' },
            price_original: { type: 'number' },
            is_on_sale:     { type: 'boolean' },
          }
        }
      })
    ]);

    const onlinePrice = priceResult?.price_current || null;
    const onlineOriginal = priceResult?.price_original || null;

    const finalStores = (storeResult.stores || [])
      .filter(s => s.name && s.address && s.address.length > 5)
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        const conf = (order[a.stock_confidence] ?? 1) - (order[b.stock_confidence] ?? 1);
        return conf !== 0 ? conf : (a.distance_km ?? 999) - (b.distance_km ?? 999);
      })
      .slice(0, 5)
      .map((s, i) => ({
        ...s,
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(s.name + ' ' + s.address)}`,
        is_best_option: i === 0,
        price: onlinePrice,
        original_price: onlineOriginal,
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      }));

    const result = {
      stores: finalStores,
      summary: storeResult.summary || `Found ${finalStores.length} stores near ${city} for ${shoeFullName}.`,
      shoe_searched: shoeFullName,
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      source: 'gemini_web',
    };

    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});