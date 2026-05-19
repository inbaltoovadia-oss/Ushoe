import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  if (CACHE.size > 400) {
    const keys = [...CACHE.keys()].slice(0, 80);
    keys.forEach(k => CACHE.delete(k));
  }
}

function normalizeCity(city = "") {
  return city.toLowerCase().replace(/\s*-\s*/g, "").replace(/[^a-z0-9]/g, "").replace(/(city|metro|downtown|district|area)$/, "").trim();
}

function geoHash(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  const snap = (v) => (Math.floor(v * 10) / 10).toFixed(1);
  return `${snap(lat)}_${snap(lng)}`;
}

const CURRENCY_MAP = {
  IL: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  GB: { code: 'GBP', symbol: '£', name: 'British Pound' },
  DE: { code: 'EUR', symbol: '€', name: 'Euro' }, FR: { code: 'EUR', symbol: '€', name: 'Euro' },
  IT: { code: 'EUR', symbol: '€', name: 'Euro' }, ES: { code: 'EUR', symbol: '€', name: 'Euro' },
  NL: { code: 'EUR', symbol: '€', name: 'Euro' }, BE: { code: 'EUR', symbol: '€', name: 'Euro' },
  AT: { code: 'EUR', symbol: '€', name: 'Euro' }, PT: { code: 'EUR', symbol: '€', name: 'Euro' },
  IE: { code: 'EUR', symbol: '€', name: 'Euro' }, FI: { code: 'EUR', symbol: '€', name: 'Euro' },
  GR: { code: 'EUR', symbol: '€', name: 'Euro' },
  AU: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  CA: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  JP: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  KR: { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  IN: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  BR: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  MX: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  SE: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  NO: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  DK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  CH: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  SG: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  HK: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  NZ: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  ZA: { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  AE: { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  SA: { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
};

function getCurrencyInfo(countryCode) {
  return CURRENCY_MAP[(countryCode || 'US').toUpperCase()] || { code: 'USD', symbol: '$', name: 'US Dollar' };
}

// Known trusted retailer domains per country
const TRUSTED_RETAILERS = {
  IL: ['nike.com/il', 'adidas.co.il', 'footlocker.co.il', 'terminalx.com', 'dynamica.co.il', 'ac.co.il', 'farfetch.com'],
  US: ['nike.com', 'adidas.com', 'footlocker.com', 'finishline.com', 'zappos.com', 'jdsports.com', 'champs.com', 'eastbay.com'],
  GB: ['nike.com/gb', 'adidas.co.uk', 'footlocker.co.uk', 'jdsports.co.uk', 'schuh.co.uk'],
  DE: ['nike.com/de', 'adidas.de', 'footlocker.de', 'zalando.de', 'snipes.com'],
};

function getTrustedRetailers(cc) {
  return TRUSTED_RETAILERS[cc] || TRUSTED_RETAILERS['US'];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, countryCode, latitude = null, longitude = null } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [], nearby_stores: [], currency_symbol: '$', currency_code: 'USD' });
    }

    const q = query.trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;
    const currency = getCurrencyInfo(cc);
    const trustedRetailers = getTrustedRetailers(cc).join(', ');

    const locKey = geoHash(latitude, longitude) || normalizeCity(cityName);
    const cacheKey = `${q}::${cc}::${locKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return Response.json({ ...cached, cached: true });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a real-time sneaker price search agent for a user in ${countryName} (${cityName}).

Search the web RIGHT NOW for: "${q}"

═══ CRITICAL REQUIREMENTS ═══

1. EXACT MODEL MATCH — Only include results that are the EXACT shoe: same brand, same model name, same colorway (if specified in the query). If the page shows a different colorway, different version, or similar-but-not-exact model — SKIP IT entirely.

2. CURRENTLY IN STOCK — Only include if the page shows "Add to Cart", "Buy Now", "In Stock", or "Available". Skip anything showing "Out of Stock", "Sold Out", "Notify Me When Available", or "Coming Soon".

3. LOCAL CURRENCY — All prices MUST be in ${currency.name} (${currency.code}, ${currency.symbol}). Return the price EXACTLY as shown on the retailer page in ${currency.symbol}. Do NOT convert or estimate — only include results that show prices in ${currency.code}.

4. SHIPS TO USER — Only include retailers that ship to ${countryName}. Preferred trusted retailers for ${cc}: ${trustedRetailers}

5. REAL URLs ONLY — buy_link must be the exact URL from your search results. Copy it verbatim. Never construct or guess.

6. NO MARKETPLACES — Do not include Amazon, eBay, StockX, GOAT, Facebook Marketplace, or general reseller platforms.

7. ZERO RESULTS > WRONG RESULTS — If you cannot find any in-stock, exact-match, locally-priced results, return an empty array. Do not pad with approximate results.

Return up to 5 results, ranked by: (1) price lowest first, (2) most trusted retailer.

For each result, return:
- name: exact product name as shown on the page
- brand: brand name  
- price: current price as string with ${currency.symbol} symbol (e.g. "${currency.symbol}499")
- original_price: original/was price string with ${currency.symbol} (null if not on sale)
- price_numeric: price as a plain number (no symbols)
- retailer: store name
- buy_link: exact URL from your search
- ships_to_user: true (since you already verified shipping)
- estimated_shipping: shipping info (e.g. "Free shipping", "3-5 days", "Free delivery over ${currency.symbol}300")
- in_stock: true
- is_best_deal: true for the cheapest option only
- price_confidence: "high" if price is clearly shown on the product page, "medium" if from search snippet
- discount_percent: number (0 if no sale)
- exact_colorway_match: true if colorway exactly matches the search query`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          web_picks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:                  { type: "string" },
                brand:                 { type: "string" },
                price:                 { type: "string" },
                original_price:        { type: "string" },
                price_numeric:         { type: "number" },
                retailer:              { type: "string" },
                buy_link:              { type: "string" },
                ships_to_user:         { type: "boolean" },
                estimated_shipping:    { type: "string" },
                in_stock:              { type: "boolean" },
                is_best_deal:          { type: "boolean" },
                price_confidence:      { type: "string" },
                discount_percent:      { type: "number" },
                exact_colorway_match:  { type: "boolean" },
              },
            },
          },
        },
      },
    });

    const rawPicks = result?.web_picks || [];

    const seen = new Set();
    const exactMatches = [];
    const similarOptions = [];

    for (const p of rawPicks) {
      if (!p.retailer || p.in_stock === false) continue;
      const key = (p.retailer + (p.name || '')).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const item = {
        ...p,
        price_numeric: p.price_numeric || parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || null,
        price_fetched_at: new Date().toISOString(),
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      };
      if (p.exact_colorway_match !== false) {
        exactMatches.push(item);
      } else {
        similarOptions.push(item);
      }
    }

    // Mark cheapest exact match as best deal
    if (exactMatches.length > 0 && !exactMatches.some(p => p.is_best_deal)) {
      const minIdx = exactMatches.reduce((mi, p, i, arr) => (p.price_numeric || 9999) < (arr[mi].price_numeric || 9999) ? i : mi, 0);
      exactMatches[minIdx] = { ...exactMatches[minIdx], is_best_deal: true };
    }

    const response = {
      web_picks: exactMatches,
      similar_options: similarOptions,
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