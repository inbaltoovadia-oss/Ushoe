import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

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

// ── Rate limiter ──
const RATE = new Map();
function checkRate(userId) {
  const now = Date.now();
  const e = RATE.get(userId) || { count: 0, start: now };
  if (now - e.start > 60000) { RATE.set(userId, { count: 1, start: now }); return true; }
  if (e.count >= 20) return false;
  e.count++; RATE.set(userId, e); return true;
}

// ── Build deep-link product URL for a retailer ──
function buildProductUrl(retailerName, query, countryCode, rawLink) {
  const rl = (retailerName || '').toLowerCase();
  const q = encodeURIComponent(query);
  const cc = (countryCode || 'US').toUpperCase();

  // Never trust AI-hallucinated direct product URLs — they often 404.
  // We only use AI-provided links as a last resort when we have no known search URL for the retailer.

  if (cc === 'IL') {
    if (rl.includes('foot locker') || rl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (rl.includes('weshoes') || rl.includes('we shoes')) return `https://www.weshoes.co.il/search?q=${q}`;
    if (rl.includes('adidas')) return `https://www.adidas.co.il/search?q=${q}`;
    if (rl.includes('nike')) return `https://www.nike.com/il/w?q=${q}`;
    if (rl.includes('puma')) return `https://www.puma.com/il/he/search?q=${q}`;
    if (rl.includes('new balance')) return `https://www.newbalance.co.il/search?q=${q}`;
    if (rl.includes('converse')) return `https://www.converse.com/il/en/search?q=${q}`;
  } else if (cc === 'GB') {
    if (rl.includes('foot locker')) return `https://www.footlocker.co.uk/search?query=${q}`;
    if (rl.includes('jd sports')) return `https://www.jdsports.co.uk/search/?query=${q}`;
    if (rl.includes('nike')) return `https://www.nike.com/gb/w?q=${q}`;
    if (rl.includes('adidas')) return `https://www.adidas.co.uk/search?q=${q}`;
    if (rl.includes('size')) return `https://www.size.co.uk/search?q=${q}`;
  } else if (['DE','FR','ES','IT','NL','BE','AT','PL','SE'].includes(cc)) {
    if (rl.includes('foot locker')) return `https://www.footlocker.eu/en/search?query=${q}`;
    if (rl.includes('zalando')) return `https://www.zalando.com/catalog/?q=${q}`;
    if (rl.includes('nike')) return `https://www.nike.com/de/w?q=${q}`;
    if (rl.includes('adidas')) return `https://www.adidas.com/de/search?q=${q}`;
  } else {
    // US default
    if (rl.includes('foot locker')) return `https://www.footlocker.com/search?query=${q}`;
    if (rl.includes('zappos')) return `https://www.zappos.com/search/term/${q}`;
    if (rl.includes('finish line')) return `https://www.finishline.com/store/browse/search.jsp?query=${q}`;
    if (rl.includes('dsw')) return `https://www.dsw.com/en/us/search?q=${q}`;
    if (rl.includes('amazon')) return `https://www.amazon.com/s?k=${q}`;
    if (rl.includes('nike')) return `https://www.nike.com/w?q=${q}`;
    if (rl.includes('adidas')) return `https://www.adidas.com/us/search?q=${q}`;
    if (rl.includes('stockx')) return `https://stockx.com/search?s=${q}`;
    if (rl.includes('goat')) return `https://www.goat.com/search?query=${q}`;
  }
  return null;
}

// Brands WeShoes Israel carries
const WESHOES_BRANDS = ['crocs', 'hoka', 'blundstone', 'desigual', 'freedom moses', 'kizik', 'native'];

// Get region-aware retailers based on brand and country
function getRegionRetailers(query, brand, countryCode) {
  const b = (brand || query || '').toLowerCase();
  const q = encodeURIComponent(query);
  const cc = (countryCode || 'US').toUpperCase();

  if (cc === 'IL') {
    const retailers = [];
    if (b.includes('nike') || b.includes('jordan')) retailers.push({ name: 'Nike Israel', domain: 'nike.com/il', searchUrl: `https://www.nike.com/il/w?q=${q}` });
    if (b.includes('adidas') || b.includes('yeezy')) retailers.push({ name: 'Adidas Israel', domain: 'adidas.co.il', searchUrl: `https://www.adidas.co.il/search?q=${q}` });
    if (b.includes('puma')) retailers.push({ name: 'Puma Israel', domain: 'puma.com/il', searchUrl: `https://www.puma.com/il/he/search?q=${q}` });
    if (b.includes('new balance')) retailers.push({ name: 'New Balance Israel', domain: 'newbalance.co.il', searchUrl: `https://www.newbalance.co.il/search?q=${q}` });
    const noFL = ['birkenstock', 'ecco', 'merrell', 'salomon', 'crocs', 'ugg', 'hoka'];
    if (!noFL.some(x => b.includes(x))) retailers.push({ name: 'Foot Locker Israel', domain: 'footlocker.co.il', searchUrl: `https://footlocker.co.il/search?q=${q}` });
    if (WESHOES_BRANDS.some(w => b.includes(w))) retailers.push({ name: 'WeShoes Israel', domain: 'weshoes.co.il', searchUrl: `https://www.weshoes.co.il/search?q=${q}` });
    // Farfetch ships to Israel for luxury/designer sneakers
    retailers.push({ name: 'Farfetch', domain: 'farfetch.com', searchUrl: `https://www.farfetch.com/il/shopping/men/search/items.aspx?q=${q}` });
    if (retailers.length === 1) retailers.unshift({ name: 'Foot Locker Israel', domain: 'footlocker.co.il', searchUrl: `https://footlocker.co.il/search?q=${q}` });
    return retailers;
  }

  if (cc === 'GB') {
    const retailers = [
      { name: 'Foot Locker UK', domain: 'footlocker.co.uk', searchUrl: `https://www.footlocker.co.uk/search?query=${q}` },
      { name: 'JD Sports', domain: 'jdsports.co.uk', searchUrl: `https://www.jdsports.co.uk/search/?query=${q}` },
    ];
    if (b.includes('nike')) retailers.unshift({ name: 'Nike UK', domain: 'nike.com/gb', searchUrl: `https://www.nike.com/gb/w?q=${q}` });
    if (b.includes('adidas')) retailers.unshift({ name: 'Adidas UK', domain: 'adidas.co.uk', searchUrl: `https://www.adidas.co.uk/search?q=${q}` });
    return retailers;
  }

  // US default
  const retailers = [
    { name: 'Foot Locker', domain: 'footlocker.com', searchUrl: `https://www.footlocker.com/search?query=${q}` },
    { name: 'Zappos', domain: 'zappos.com', searchUrl: `https://www.zappos.com/search/term/${q}` },
    { name: 'DSW', domain: 'dsw.com', searchUrl: `https://www.dsw.com/en/us/search?q=${q}` },
  ];
  if (b.includes('nike')) retailers.unshift({ name: 'Nike.com', domain: 'nike.com', searchUrl: `https://www.nike.com/w?q=${q}` });
  if (b.includes('adidas')) retailers.unshift({ name: 'Adidas.com', domain: 'adidas.com', searchUrl: `https://www.adidas.com/us/search?q=${q}` });
  return retailers;
}

// De-duplicate by retailer name
function deduplicateByRetailer(picks) {
  const seen = new Set();
  return picks.filter(p => {
    const key = (p.retailer || '').toLowerCase().split(' ')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

Deno.serve(async (req) => {
  let parsedBody = {};
  try { parsedBody = await req.json(); } catch {}

  const {
    query, city, country, countryCode, brand = '',
    selectedSize = null, userLat = null, userLng = null
  } = parsedBody;

  // Sanitize inputs
  const q = (query || '').replace(/<[^>]*>/g, '').trim().slice(0, 200);
  const cc = (countryCode || 'US').toUpperCase().slice(0, 2);
  const countryName = (country || 'United States').slice(0, 100);
  const cityName = (city || countryName).slice(0, 100);

  try {
    const base44 = createClientFromRequest(req);

    // Auth check
    const user = await base44.auth.me();
    if (!user) return Response.json({ web_picks: [], nearby_stores: [] });

    if (!checkRate(user.id)) {
      return Response.json({ web_picks: [], nearby_stores: [], error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!q) return Response.json({ web_picks: [], nearby_stores: [] });

    const cacheKey = `${q}::${cc}::${selectedSize || 'any'}`.toLowerCase().replace(/\s+/g, '_');
    const cached = cacheGet(cacheKey);
    if (cached) return Response.json({ ...cached, cached: true });

    const sizeNote = selectedSize ? `US size ${selectedSize}` : '';
    let finalPicks = [];

    // Single broad search for all regions
    const retailers = getRegionRetailers(q, brand, cc);
    const retailerDomains = retailers.map(r => r.domain).join(', ');
    const currencyHint = cc === 'IL' ? 'ILS (₪)' : cc === 'GB' ? 'GBP (£)' : 'USD ($)';

    const result = await Promise.race([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Search online RIGHT NOW for the EXACT shoe model: "${q}"${sizeNote ? ` in ${sizeNote}` : ''}.

USER REGION: ${countryName} (${cc}) — prices must be in ${currencyHint}.

CHECK THESE RETAILERS: ${retailerDomains}

CRITICAL RULES:
1. You MUST search for the EXACT model name "${q}". Do NOT return results for similar shoes.
2. ONLY return a retailer if that specific model is listed and available on their site RIGHT NOW.
3. A retailer showing up in a Google search for the brand does NOT mean they carry this specific shoe.
4. If you cannot confirm the exact shoe is available at a retailer, DO NOT include that retailer.
5. Return DIRECT search page URLs for that exact model — not homepages.
6. Prices must be real, current prices in local currency (${currencyHint}).
7. Do NOT repeat the same retailer.

Return JSON with "web_picks" array. Each item: retailer, price (with currency symbol), original_price, buy_link, in_stock (boolean), discount_percent (integer).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            web_picks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  retailer: { type: 'string' },
                  price: { type: 'string' },
                  original_price: { type: 'string' },
                  buy_link: { type: 'string' },
                  in_stock: { type: 'boolean' },
                  discount_percent: { type: 'number' },
                }
              }
            }
          }
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 55000))
    ]);

    const currency = cc === 'IL' ? 'ILS' : cc === 'GB' ? 'GBP' : 'USD';
    finalPicks = deduplicateByRetailer(
      (result?.web_picks || [])
        .filter(p => p.price && parseFloat((p.price || '').replace(/[^0-9.]/g, '')) > 0)
        .map(p => {
          // Always prefer our hardcoded search URLs — they are guaranteed valid.
          // Only use the AI-supplied link when we truly have no mapping for this retailer.
          const knownLink = buildProductUrl(p.retailer, q, cc, null);
          const link = knownLink || retailers.find(r => r.name.toLowerCase().includes((p.retailer || '').toLowerCase().split(' ')[0]))?.searchUrl || null;
          return link ? { ...p, currency, brand, name: q, ships_to_user: true, is_best_deal: false, price_confidence: 'medium', buy_link: link } : null;
        })
        .filter(Boolean)
    );

    // Mark best deal
    if (finalPicks.length > 0) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0 && prices[minIdx] < Infinity) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    // Fallback search links if AI found nothing
    let fallbackPicks = [];
    if (finalPicks.length === 0) {
      const retailers = getRegionRetailers(q, brand, cc);
      fallbackPicks = retailers.map((r, i) => ({
        retailer: r.name, name: q, brand, currency: cc === 'IL' ? 'ILS' : cc === 'GB' ? 'GBP' : 'USD',
        price: null, buy_link: r.searchUrl, in_stock: null, ships_to_user: true,
        is_best_deal: i === 0, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true,
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
    const fq = encodeURIComponent(q);
    const cc2 = (countryCode || 'US').toUpperCase();
    const fallback = cc2 === 'IL' ? [
      { retailer: 'Foot Locker Israel', buy_link: `https://footlocker.co.il/search?q=${fq}`, price: null, name: q, brand, currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: true, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
      { retailer: 'Nike Israel', buy_link: `https://www.nike.com/il/w?q=${fq}`, price: null, name: q, brand, currency: 'ILS', in_stock: null, ships_to_user: true, is_best_deal: false, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
    ] : [
      { retailer: 'Foot Locker', buy_link: `https://www.footlocker.com/search?query=${fq}`, price: null, name: q, brand, currency: 'USD', in_stock: null, ships_to_user: true, is_best_deal: true, price_confidence: 'low', discount_percent: 0, is_fallback_search_link: true },
    ];
    return Response.json({ web_picks: fallback, nearby_stores: [], timed_out: true, used_fallback: true });
  }
});