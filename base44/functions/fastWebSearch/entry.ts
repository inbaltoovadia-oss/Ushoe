import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Location-aware, real-time priced web search for shoes
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category, city, country, lat, lng } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [] });
    }

    const q = query.trim();
    const catHint = category ? ` ${category}` : '';

    // Build a rich location context string
    const locationCtx = city
      ? `The user is located in ${city}${country ? ', ' + country : ''}${lat ? ` (lat:${lat}, lng:${lng})` : ''}.`
      : 'Location unknown, assume US-based user.';

    const locationFilter = city
      ? `CRITICAL: Only include retailers that ship to or have stores near ${city}${country ? ', ' + country : ''}. Exclude region-locked or unavailable deals.`
      : 'Only include major retailers with broad availability (US/international).';

    // Run two focused queries in parallel
    const [res1, res2] = await Promise.allSettled([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a real-time shoe price aggregator.
${locationCtx}
${locationFilter}

Find up to 5 distinct shoe models matching: "${q}"${catHint} that are IN STOCK and available to buy RIGHT NOW.

For each result provide:
- brand: exact brand name
- name: exact model name  
- price: current sale price as string e.g. "$119.95" (must be real current price, not MSRP if on sale)
- original_price: original MSRP if discounted, otherwise same as price
- retailer: store name (e.g. "Nike.com", "Foot Locker", "Amazon")
- retailer_url: direct product page URL if available
- ships_to_user: true if ships to user's location, false if not
- estimated_shipping: shipping cost string e.g. "Free", "$7.99", or "Unknown"
- estimated_delivery: delivery estimate e.g. "2-4 days", "1 week"
- in_stock: true or false
- is_best_deal: true only for the single cheapest available option
- price_confidence: "high" if verified from live source, "medium" if approximate, "low" if uncertain
- discount_percent: integer discount percentage if on sale, else 0

Focus on: Nike, Adidas, New Balance, Jordan, Puma, Hoka, Asics, Saucony, Brooks.
Only return items that are genuinely in stock and accessible to the user.`,
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
        },
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are a real-time shoe price aggregator.
${locationCtx}
${locationFilter}

Find up to 5 MORE distinct shoe models matching: "${q}"${catHint} — different brands and models than the most popular ones.
Include: Vans, Converse, Reebok, Under Armour, Salomon, On Running, Merrell, New Balance.

Same requirements — only IN STOCK items available to the user. Return:
- brand, name, price (current, real), original_price, retailer, retailer_url
- ships_to_user, estimated_shipping, estimated_delivery, in_stock
- is_best_deal (false for all in this batch), price_confidence, discount_percent`,
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
        },
      }),
    ]);

    const picks1 = (res1.status === 'fulfilled' ? res1.value?.web_picks : null) || [];
    const picks2 = (res2.status === 'fulfilled' ? res2.value?.web_picks : null) || [];

    // Merge and deduplicate
    const all = [...picks1, ...picks2];
    const seen = new Set();
    let deduped = all.filter(p => {
      const key = `${(p.brand || '').toLowerCase().trim()}-${(p.name || '').toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return p.name && p.brand;
    });

    // Filter out items explicitly not in stock or not shipping to user
    const available = deduped.filter(p => p.in_stock !== false && p.ships_to_user !== false);
    // If filtering leaves nothing, fall back to all (but mark uncertain)
    const finalPicks = available.length > 0 ? available : deduped.map(p => ({
      ...p,
      price_confidence: 'low',
      availability_note: 'Availability in your region unconfirmed',
    }));

    // Ensure exactly one best_deal (cheapest available)
    const hasBestDeal = finalPicks.some(p => p.is_best_deal);
    if (!hasBestDeal && finalPicks.length > 0) {
      const prices = finalPicks.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) finalPicks[minIdx] = { ...finalPicks[minIdx], is_best_deal: true };
    }

    // Compute estimated total (price + shipping) for each pick
    const enriched = finalPicks.slice(0, 10).map(p => {
      const priceNum = parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || 0;
      const shippingNum = p.estimated_shipping
        ? parseFloat(p.estimated_shipping.replace(/[^0-9.]/g, '')) || 0
        : 0;
      const total = priceNum > 0 ? `$${(priceNum + shippingNum).toFixed(2)}` : null;
      return { ...p, estimated_total: total };
    });

    return Response.json({ web_picks: enriched, location_used: city || null });
  } catch (error) {
    return Response.json({ web_picks: [], error: error.message }, { status: 200 });
  }
});