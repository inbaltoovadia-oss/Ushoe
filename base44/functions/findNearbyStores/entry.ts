/**
 * findNearbyStores — Gemini AI web search to find + rank nearby sneaker stores
 * Single LLM call for speed. Results cached 10 minutes by location.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(shoeId, city, size) {
  return `${shoeId}_${(city || '').toLowerCase().replace(/\s+/g, '_')}_${size || ''}`;
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
    } = body;

    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const city = cityFallback || (latitude && longitude ? `${latitude},${longitude}` : 'unknown location');
    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const sizeInfo = selectedSize ? `US size ${selectedSize}` : '';

    // Cache check
    const cacheKey = getCacheKey(shoe.id || shoe.name, city, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const prompt = `Find 5 real sneaker stores near ${city} that stock ${shoeFullName}.${sizeInfo ? ` Size: ${sizeInfo}.` : ''}
Include official ${shoe.brand} stores, Foot Locker, JD Sports, and local sneaker boutiques.
For each store provide: name, address, phone, website (the store's own URL if it has one), maps_url (Google Maps search URL), distance_km from city center, rating, stock_confidence (high/medium/low), stock_status, why (≤10 words), is_open.`;

    const llmPromise = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
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
    });

    const aiResult = await Promise.race([
      llmPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Store search timeout")), 38000))
    ]);

    const finalStores = (aiResult.stores || [])
      .filter(s => s.name && s.address)
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        const diff = (order[a.stock_confidence] ?? 1) - (order[b.stock_confidence] ?? 1);
        return diff !== 0 ? diff : (a.distance_km ?? 999) - (b.distance_km ?? 999);
      })
      .slice(0, 6)
      .map((s, i) => ({
        ...s,
        maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(s.name + ' ' + s.address)}`,
        is_best_option: i === 0,
      }));

    const result = {
      stores: finalStores,
      summary: aiResult.summary || `Found ${finalStores.length} stores near ${city} for ${shoeFullName}.`,
      shoe_searched: shoeFullName,
      source: 'gemini_web',
    };

    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});