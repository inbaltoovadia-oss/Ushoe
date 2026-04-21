import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fast parallel web search — returns results quickly by running 2 shorter queries simultaneously
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { query, category } = await req.json();

    if (!query || !query.trim()) {
      return Response.json({ web_picks: [] });
    }

    const q = query.trim();
    const catHint = category ? ` ${category}` : '';

    // Run two focused queries in parallel for speed
    const [res1, res2] = await Promise.allSettled([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Find 5 distinct shoe models matching: "${q}"${catHint} available online NOW.
Return brand, name, exact price in USD (e.g. "$119.95"), retailer, is_best_deal (true for cheapest), image_url.
Focus on Nike, Adidas, New Balance, Jordan, Puma, Hoka, Asics, Saucony, Brooks.`,
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
                  retailer: { type: "string" },
                  is_best_deal: { type: "boolean" },
                  image_url: { type: "string" },
                },
              },
            },
          },
        },
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Find 5 MORE distinct shoe models matching: "${q}"${catHint} — different brands and models than the most popular ones.
Include lesser-known but quality brands: Vans, Converse, Reebok, Under Armour, Salomon, On Running, Merrell, New Balance.
Return brand, name, exact price in USD, retailer, is_best_deal (false for all), image_url.`,
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
                  retailer: { type: "string" },
                  is_best_deal: { type: "boolean" },
                  image_url: { type: "string" },
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
    const deduped = all.filter(p => {
      const key = `${(p.brand || '').toLowerCase().trim()}-${(p.name || '').toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return p.name && p.brand;
    });

    // Ensure exactly one best_deal (cheapest)
    if (!deduped.some(p => p.is_best_deal) && deduped.length > 0) {
      const prices = deduped.map(p => parseFloat((p.price || '0').replace(/[^0-9.]/g, '')) || Infinity);
      const minIdx = prices.indexOf(Math.min(...prices));
      if (minIdx >= 0) deduped[minIdx] = { ...deduped[minIdx], is_best_deal: true };
    }

    return Response.json({ web_picks: deduped.slice(0, 10) });
  } catch (error) {
    return Response.json({ web_picks: [], error: error.message }, { status: 200 });
  }
});