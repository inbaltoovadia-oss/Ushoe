import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Retailers that ONLY operate in specific countries — hard blocklist by country code
const US_ONLY_RETAILERS = ["dick's sporting goods", "dicks sporting goods", "dicks", "academy sports", "academy", "dsw", "finish line", "scheels", "hibbett"];
const UK_ONLY_RETAILERS = ["sports direct", "jd sports uk", "size?"];
const EU_ONLY_RETAILERS = ["about you", "courir", "snipes eu"];
const AU_ONLY_RETAILERS = ["rebel sport", "the iconic"];

// Allowed retailers per country code
const RETAILERS_BY_REGION = {
  IL: ["Nike.com", "Adidas.com", "Foot Locker Israel", "Shoeme", "KSP", "Fox", "Terminator"],
  US: ["Nike.com", "Adidas.com", "Foot Locker", "Finish Line", "Dick's Sporting Goods", "Amazon US", "Zappos", "DSW", "Academy Sports"],
  GB: ["Nike.com", "Adidas.com", "JD Sports", "Sports Direct", "Foot Locker UK", "ASOS", "Zalando UK"],
  DE: ["Nike.com", "Adidas.com", "Zalando", "About You", "JD Sports DE", "Foot Locker DE"],
  FR: ["Nike.com", "Adidas.com", "Zalando FR", "Foot Locker FR", "JD Sports FR", "Courir"],
  AU: ["Nike.com", "Adidas.com", "JD Sports AU", "The Iconic", "Foot Locker AU", "Rebel Sport"],
  CA: ["Nike.com", "Adidas.com", "Sport Chek", "Foot Locker CA", "Amazon CA", "Sporting Life"],
  DEFAULT: ["Nike.com", "Adidas.com", "Zalando", "Foot Locker"],
};

function isRetailerBlocked(retailerName, countryCode) {
  const r = (retailerName || '').toLowerCase();
  const cc = (countryCode || 'US').toUpperCase();

  // Block US-only retailers for non-US users
  if (cc !== 'US' && US_ONLY_RETAILERS.some(b => r.includes(b))) return true;
  // Block UK-only for non-UK
  if (cc !== 'GB' && UK_ONLY_RETAILERS.some(b => r.includes(b))) return true;
  // Block AU-only for non-AU
  if (cc !== 'AU' && AU_ONLY_RETAILERS.some(b => r.includes(b))) return true;

  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, countryCode } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [] });
    }

    const q = query.trim();
    const catHint = category ? ` ${category}` : '';
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;

    const allowedRetailers = RETAILERS_BY_REGION[cc] || RETAILERS_BY_REGION.DEFAULT;
    const retailerList = allowedRetailers.join(', ');

    const prompt = `You are a shoe deal finder. The user is located in ${cityName}, ${countryName} (${cc}).

TASK: Find up to 6 real shoe deals matching "${q}"${catHint} that are:
- Actually available for purchase in ${countryName} RIGHT NOW
- In stock
- Sold by retailers that operate in ${countryName}

APPROVED RETAILERS for ${countryName}: ${retailerList}
DO NOT include: Dick's Sporting Goods, Academy Sports, DSW, Finish Line, Scheels, Hibbett (these are US-only and do not ship to ${countryName}).

For each deal return: brand, name, price (with currency symbol), original_price (if discounted), retailer (exact retailer name), ships_to_user (true), estimated_shipping ("Free" or cost), in_stock (true), is_best_deal (true only for the single cheapest), price_confidence ("high" if verified, "low" if estimated), discount_percent (number, 0 if none).`;

    const schema = {
      type: "object",
      properties: {
        web_picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              brand: { type: "string" },
              price: { type: "string" },
              original_price: { type: "string" },
              retailer: { type: "string" },
              ships_to_user: { type: "boolean" },
              estimated_shipping: { type: "string" },
              in_stock: { type: "boolean" },
              is_best_deal: { type: "boolean" },
              price_confidence: { type: "string" },
              discount_percent: { type: "number" },
            },
          },
        },
      },
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: schema,
    });

    const rawPicks = result?.web_picks || [];

    // Hard post-processing filter — don't trust the AI alone
    const seen = new Set();
    const filtered = rawPicks.filter(p => {
      if (!p.name || !p.brand || !p.retailer) return false;
      // Deduplicate
      const key = `${p.brand.toLowerCase()}-${p.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      // Hard block known region-incompatible retailers
      if (isRetailerBlocked(p.retailer, cc)) return false;
      // Remove out-of-stock or explicitly not shipping
      if (p.in_stock === false) return false;
      if (p.ships_to_user === false) return false;
      return true;
    });

    // Ensure one best_deal
    if (filtered.length > 0 && !filtered.some(p => p.is_best_deal)) {
      const prices = filtered.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) filtered[minIdx] = { ...filtered[minIdx], is_best_deal: true };
    }

    return Response.json({ web_picks: filtered, location_used: `${cityName}, ${countryName}` });
  } catch (error) {
    return Response.json({ web_picks: [], error: error.message });
  }
});