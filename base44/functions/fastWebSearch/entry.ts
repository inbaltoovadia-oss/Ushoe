import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Known retailers by country code — used to pre-filter results
const RETAILERS_BY_REGION = {
  IL: ["Nike.com", "Adidas.com", "Fox", "Castro", "Foot Locker Israel", "Shoeme", "KSP", "Ronit"],
  US: ["Nike.com", "Adidas.com", "Foot Locker", "Finish Line", "Dick's Sporting Goods", "Amazon", "Zappos", "DSW", "Academy Sports"],
  GB: ["Nike.com", "Adidas.com", "JD Sports", "Size?", "Foot Locker UK", "Sports Direct", "ASOS", "Zalando UK"],
  DE: ["Nike.com", "Adidas.com", "Zalando", "About You", "JD Sports DE", "Foot Locker DE"],
  FR: ["Nike.com", "Adidas.com", "Zalando FR", "Foot Locker FR", "JD Sports FR", "Courir"],
  AU: ["Nike.com", "Adidas.com", "JD Sports AU", "The Iconic", "Foot Locker AU", "Rebel Sport"],
  CA: ["Nike.com", "Adidas.com", "Sport Chek", "Foot Locker CA", "Amazon CA", "Sporting Life"],
  DEFAULT: ["Nike.com", "Adidas.com", "Amazon", "Zalando", "Foot Locker"],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, countryCode, lat, lng } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [] });
    }

    const q = query.trim();
    const catHint = category ? ` ${category}` : '';
    const cc = (countryCode || 'US').toUpperCase();
    const countryName = country || 'United States';
    const cityName = city || countryName;

    const knownRetailers = RETAILERS_BY_REGION[cc] || RETAILERS_BY_REGION.DEFAULT;
    const retailerList = knownRetailers.join(', ');

    const locationBlock = `
USER LOCATION: ${cityName}, ${countryName} (country code: ${cc})
COUNTRY-SPECIFIC RETAILERS that operate in ${countryName}: ${retailerList}

STRICT RULES — violations will break the app:
1. ONLY include retailers that actually sell and ship to ${countryName}.
2. Do NOT include US-only retailers if the user is not in the US (e.g., do not show Dick's Sporting Goods, Foot Locker US, Academy Sports, DSW for non-US users).
3. Do NOT include EU-only retailers for non-EU users.
4. Prefer retailers from this list: ${retailerList}
5. If a retailer is unclear, set ships_to_user: false.
6. Prices must be in the local currency or clearly marked USD.
`;

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
              retailer_url: { type: "string" },
              ships_to_user: { type: "boolean" },
              estimated_shipping: { type: "string" },
              estimated_delivery: { type: "string" },
              in_stock: { type: "boolean" },
              is_best_deal: { type: "boolean" },
              price_confidence: { type: "string" },
              discount_percent: { type: "number" },
            },
          },
        },
      },
    };

    const [res1, res2] = await Promise.allSettled([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a shoe price aggregator for ${countryName}.
${locationBlock}

Find up to 5 distinct shoe models matching: "${q}"${catHint} — in stock, available to buy in ${countryName} NOW.
For each: brand, name, current price (real, not MSRP), original_price if on sale, retailer (from the approved list above), retailer_url, ships_to_user (true/false), estimated_shipping, estimated_delivery, in_stock (true/false), is_best_deal (true for cheapest only), price_confidence (high/medium/low), discount_percent.
Focus on Nike, Adidas, New Balance, Jordan, Puma, Hoka, Asics, Saucony, Brooks.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: schema,
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a shoe price aggregator for ${countryName}.
${locationBlock}

Find up to 5 MORE distinct shoe models matching: "${q}"${catHint} — different from popular brands, available in ${countryName}.
Include Vans, Converse, Reebok, Under Armour, Salomon, On Running, Merrell — only if they sell in ${countryName}.
Same fields: brand, name, price, original_price, retailer (approved list), retailer_url, ships_to_user, estimated_shipping, estimated_delivery, in_stock, is_best_deal (false), price_confidence, discount_percent.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: schema,
      }),
    ]);

    const picks1 = (res1.status === 'fulfilled' ? res1.value?.web_picks : null) || [];
    const picks2 = (res2.status === 'fulfilled' ? res2.value?.web_picks : null) || [];

    const all = [...picks1, ...picks2];

    // Deduplicate by brand+name
    const seen = new Set();
    const deduped = all.filter(p => {
      const key = `${(p.brand || '').toLowerCase().trim()}-${(p.name || '').toLowerCase().trim()}`;
      if (seen.has(key) || !p.name || !p.brand) return false;
      seen.add(key);
      return true;
    });

    // Hard filter: remove items explicitly marked as not shipping to user or out of stock
    const available = deduped.filter(p => p.in_stock !== false && p.ships_to_user !== false);

    // If nothing passes, fall back to all but flag them
    const finalPicks = available.length > 0
      ? available
      : deduped.map(p => ({ ...p, price_confidence: 'low', availability_note: `Availability in ${countryName} unconfirmed` }));

    // Ensure exactly one best_deal
    if (!finalPicks.some(p => p.is_best_deal) && finalPicks.length > 0) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    // Add estimated total
    const enriched = finalPicks.slice(0, 10).map(p => {
      const priceNum = parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || 0;
      const shippingNum = p.estimated_shipping
        ? parseFloat(p.estimated_shipping.replace(/[^0-9.]/g, '')) || 0
        : 0;
      const total = priceNum > 0 ? (priceNum + shippingNum).toFixed(2) : null;
      return { ...p, estimated_total: total ? `$${total}` : null };
    });

    return Response.json({ web_picks: enriched, location_used: `${cityName}, ${countryName}` });
  } catch (error) {
    return Response.json({ web_picks: [], error: error.message }, { status: 200 });
  }
});