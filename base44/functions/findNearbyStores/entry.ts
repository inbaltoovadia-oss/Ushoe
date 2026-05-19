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

    // Find real nearby physical stores with their own individual prices
    const combined = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Search the web for real physical sneaker stores near ${city}, ${cc} that carry "${shoeFullName}".
${sizeInfo ? `The customer needs ${sizeInfo}.` : ''}

Find up to 5 DIFFERENT real physical stores. Each must be a different store chain/brand (e.g. Nike Store, Adidas Store, Foot Locker, JD Sports, a local boutique — NOT multiple branches of the same chain).

For EACH store, also search their website for the current price of "${shoeFullName}" in ${currency.code}.

CRITICAL: Each store must have its OWN individual price from that store's website or known in-store pricing. Do NOT use the same price for all stores.

Return:
- name: exact store name
- address: real street address in ${city}
- phone: store phone number if found
- website: store website URL
- maps_url: Google Maps URL for this store
- distance_km: estimated distance from city center
- rating: Google Maps rating if known
- is_open: current open/closed status if known
- stock_confidence: "high" if it's an official brand store or known to carry this model, "medium" if general sneaker store, "low" if uncertain
- stock_status: short text like "Likely in stock" or "Call to confirm"
- price: this store's current price for "${shoeFullName}" in ${currency.code} as a plain number (search their website)
- original_price: original price before any sale, or null
- price_url: direct URL to the product on this store's website
- why: one sentence explaining why this store likely has the shoe

All prices in ${currency.code} as plain numbers only.`,
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
                price:            { type: 'number' },
                original_price:   { type: 'number' },
                price_url:        { type: 'string' },
                why:              { type: 'string' },
              }
            }
          },
          summary: { type: 'string' },
        }
      }
    });

    // Deduplicate by store chain brand
    const seenChains = new Set();
    const finalStores = (combined.stores || [])
      .filter(s => {
        if (!s.name || !s.address || s.address.length < 5) return false;
        const chainKey = s.name.toLowerCase().replace(/\s*(israel|il|store|shop|\d+)/g, '').replace(/[^a-z]/g, '').trim();
        if (seenChains.has(chainKey)) return false;
        seenChains.add(chainKey);
        return true;
      })
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
        price: s.price || null,
        original_price: s.original_price || null,
        price_is_approximate: true,
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      }));

    const result = {
      stores: finalStores,
      summary: combined.summary || `Found ${finalStores.length} stores near ${city} for ${shoeFullName}.`,
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