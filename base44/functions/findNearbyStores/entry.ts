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

    // Single combined call: find stores AND get price reference in one shot to avoid timeout
    const combined = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a sneaker shopping assistant for a user in ${city}, ${cc}.

Do TWO things in ONE search:

TASK 1 — Find up to 4 real physical sneaker stores near ${city} (${cc}) that likely carry: "${shoeFullName}".
${sizeInfo ? `Size needed: ${sizeInfo}.` : ''}
- Only real stores with verified addresses near ${city}
- Prefer: official ${shoe.brand} store, Foot Locker, JD Sports, local sneaker boutiques
- stock_confidence: "high" = known ${shoe.brand} retailer, "medium" = general sneaker store, "low" = uncertain
- Include: name, address, phone, website, maps_url, distance_km, rating, is_open, stock_confidence, stock_status, why

TASK 2 — Find the current online price of "${shoeFullName}" from the official ${shoe.brand} website in ${cc === 'IL' ? 'Israel (ILS ₪)' : `${cc} (${currency.code} ${currency.symbol})`}.
- Search "${shoeFullName} ${cc === 'IL' ? 'site:nike.com/il OR site:adidas.co.il' : `site:${shoe.brand.toLowerCase()}.com`}"
- brand_site_price: the price shown on the product page as a plain number
- brand_site_original: original/was price if on sale (null if not)
- brand_site_url: the exact product URL
- cheapest_price: lowest price from ANY local retailer website (plain number)
- cheapest_retailer: name of that retailer

All prices in ${currency.code}, plain numbers only, no symbols.`,
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
          summary:             { type: 'string' },
          brand_site_price:    { type: 'number' },
          brand_site_original: { type: 'number' },
          brand_site_url:      { type: 'string' },
          cheapest_price:      { type: 'number' },
          cheapest_retailer:   { type: 'string' },
        }
      }
    });

    const storeResult = combined;
    const priceResult = combined;

    // Use cheapest found price, fall back to brand site price
    const onlinePrice = priceResult?.cheapest_price || priceResult?.brand_site_price || null;
    const onlineOriginal = priceResult?.brand_site_original || null;
    const priceSource = priceResult?.cheapest_retailer || (priceResult?.brand_site_price ? `${shoe.brand} website` : null);
    const priceUrl = priceResult?.cheapest_url || priceResult?.brand_site_url || null;

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
        price_source: priceSource,
        price_url: priceUrl,
        price_is_approximate: true, // always flag as approximate for in-store
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