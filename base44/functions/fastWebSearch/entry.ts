/**
 * fastWebSearch — Real live prices via Gemini web search.
 * Splits into 2 parallel searches (brand site + multi-retailer) to stay under timeout.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 20 * 60 * 1000; // 20 min

function cacheGet(key) {
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { CACHE.delete(key); return null; }
  return e.data;
}
function cacheSet(key, data) {
  CACHE.set(key, { data, ts: Date.now() });
  if (CACHE.size > 150) [...CACHE.keys()].slice(0, 30).forEach(k => CACHE.delete(k));
}

const CURRENCY_MAP = {
  IL: { code: 'ILS', symbol: '₪' }, GB: { code: 'GBP', symbol: '£' },
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

// Retailer sets per country — split into 2 groups for parallel search
const RETAILER_SETS = {
  IL: {
    group1: ['Nike Israel (nike.com/il)', 'Adidas Israel (adidas.co.il)'],
    group2: ['Foot Locker Israel (footlocker.co.il)', 'Terminal X (terminalx.com)', 'Shoebox Israel (shoebox.co.il)'],
  },
  US: {
    group1: ['Nike (nike.com)', 'Adidas (adidas.com)'],
    group2: ['Foot Locker (footlocker.com)', 'Finish Line (finishline.com)', 'Zappos (zappos.com)'],
  },
  GB: {
    group1: ['Nike UK (nike.com/gb)', 'Adidas UK (adidas.co.uk)'],
    group2: ['JD Sports (jdsports.co.uk)', 'Size? (size.co.uk)', 'Foot Locker UK (footlocker.co.uk)'],
  },
  DE: {
    group1: ['Nike DE (nike.com/de)', 'Adidas DE (adidas.de)'],
    group2: ['Foot Locker DE (footlocker.de)', 'Zalando DE (zalando.de)', 'JD Sports DE (jdsports.de)'],
  },
};
function getRetailerSets(cc) {
  return RETAILER_SETS[cc] || RETAILER_SETS['US'];
}

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          retailer:               { type: 'string' },
          name:                   { type: 'string' },
          price_numeric:          { type: 'number' },
          original_price_numeric: { type: 'number' },
          buy_link:               { type: 'string' },
          in_stock:               { type: 'boolean' },
          ships_to_user:          { type: 'boolean' },
          estimated_shipping:     { type: 'string' },
          discount_percent:       { type: 'number' },
          price_confidence:       { type: 'string' },
          exact_colorway_match:   { type: 'boolean' },
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
};

function buildPrompt(shoeName, retailers, currency, countryName, cc) {
  return `Search the web RIGHT NOW for the current live retail price of "${shoeName}" at these SPECIFIC retailers in ${countryName}: ${retailers.join(', ')}.

CRITICAL RULES:
- Search EACH retailer's website individually for this exact product
- Return MAXIMUM ONE result per retailer — do NOT list the same retailer chain multiple times
- Each result must be from a DIFFERENT store brand/chain
- ONLY include a retailer if you actually found this product on their website with a real price
- If a retailer doesn't sell this shoe, skip them entirely — do not fabricate results
- Prices must be in ${currency.code} as plain numbers (no symbols)
- buy_link must be the DIRECT product page URL you found on their website
- price_confidence: "high" = found exact product page, "medium" = found similar listing
- exact_colorway_match: true only if colorway/color exactly matches the search query`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, countryCode, latitude = null, longitude = null } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [], similar_options: [], currency_symbol: '$', currency_code: 'USD' });
    }

    const q = query.trim().replace(/ buy$/i, '').trim();
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const currency = getCurrency(cc);
    const sets = getRetailerSets(cc);

    const cacheKey = `v6::${q}::${cc}`;
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    // Run 2 parallel Gemini web searches — each focused on fewer retailers = faster
    const [res1, res2] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: buildPrompt(q, sets.group1, currency, countryName, cc),
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: SEARCH_SCHEMA,
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: buildPrompt(q, sets.group2, currency, countryName, cc),
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        response_json_schema: SEARCH_SCHEMA,
      }),
    ]);

    // Merge results from both searches
    const allPicks = [
      ...(res1?.results || []),
      ...(res2?.results || []),
    ].filter(p => p.retailer && p.price_numeric > 0);

    // Deduplicate strictly by retailer brand (first word of retailer name)
    const seen = new Set();
    const deduped = allPicks.filter(p => {
      // Normalize to brand key: "Foot Locker Israel" → "footlocker", "Nike Israel" → "nike"
      const brand = (p.retailer || '').toLowerCase()
        .replace(/\s*(israel|uk|us|de|fr|il)\s*/g, '')
        .replace(/[^a-z]/g, '')
        .trim();
      if (seen.has(brand)) return false;
      seen.add(brand);
      return true;
    });

    // Sort by price, mark best deal
    deduped.sort((a, b) => (a.price_numeric || 9999) - (b.price_numeric || 9999));
    if (deduped.length > 0) deduped[0] = { ...deduped[0], is_best_deal: true };

    const response = {
      web_picks: deduped.map(p => ({
        ...p,
        original_price: p.original_price_numeric || null,
        is_best_deal: !!p.is_best_deal,
        currency_code: currency.code,
        currency_symbol: currency.symbol,
      })),
      similar_options: [],
      currency_code: currency.code,
      currency_symbol: currency.symbol,
      location_used: `${city || countryName}, ${countryName}`,
      fetched_at: new Date().toISOString(),
    };

    cacheSet(cacheKey, response);
    return Response.json(response);

  } catch (error) {
    return Response.json({ web_picks: [], similar_options: [], error: error.message }, { status: 500 });
  }
});