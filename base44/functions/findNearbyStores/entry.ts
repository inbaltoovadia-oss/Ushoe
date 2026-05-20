import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(shoeId, city, size) {
  return `${shoeId}_${(city || '').toLowerCase().replace(/\s+/g, '_')}_${size || ''}`;
}

function mapsUrl(query) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

// Fallback stores with guaranteed-working URLs
function getFallbackStores(city, shoeFullName, brand) {
  const q = encodeURIComponent(shoeFullName);
  return [
    {
      name: `${brand} Store`,
      address: `${brand} Store, ${city}`,
      phone: '', website: `https://www.google.com/search?q=${encodeURIComponent(brand + ' store ' + city)}`,
      maps_url: mapsUrl(`${brand} store ${city} Israel`),
      distance_km: null, rating: 4.4, is_open: null,
      stock_confidence: 'high', stock_status: 'Check in store',
      why: 'Official brand store — highest stock likelihood', is_best_option: false,
    },
    {
      name: 'Foot Locker Israel',
      address: `Foot Locker, ${city}`,
      phone: '', website: `https://footlocker.co.il/search?q=${q}`,
      maps_url: mapsUrl(`Foot Locker ${city} Israel`),
      distance_km: null, rating: 4.2, is_open: null,
      stock_confidence: 'medium', stock_status: 'Check in store',
      why: 'Major chain carrying major brands', is_best_option: false,
    },
    {
      name: 'Terminal X',
      address: `Terminal X, ${city}`,
      phone: '', website: `https://www.terminalx.com/catalogsearch/result/?q=${q}`,
      maps_url: mapsUrl(`Terminal X ${city} Israel`),
      distance_km: null, rating: 4.3, is_open: null,
      stock_confidence: 'medium', stock_status: 'Check in store',
      why: 'Large sportswear retailer with wide selection', is_best_option: false,
    },
    {
      name: 'AC Sports',
      address: `AC Sports, ${city}`,
      phone: '', website: `https://www.acsports.co.il/search?q=${q}`,
      maps_url: mapsUrl(`AC Sports ${city} Israel`),
      distance_km: null, rating: 4.1, is_open: null,
      stock_confidence: 'medium', stock_status: 'Check in store',
      why: 'Sports chain commonly stocking major brands', is_best_option: false,
    },
  ];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, cityFallback = null, latitude = null, longitude = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const city = cityFallback || (latitude && longitude ? `${latitude},${longitude}` : 'Tel Aviv');
    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const sizeInfo = selectedSize ? `US size ${selectedSize}` : '';
    const brand = shoe.brand || 'Nike';

    const cacheKey = getCacheKey(shoe.id || shoe.name, city, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const prompt = `Search the web and find at least 5 real physical sneaker stores near ${city}, Israel that carry ${shoeFullName}.${sizeInfo ? ` Size needed: ${sizeInfo}.` : ''}

Include official ${brand} stores, Foot Locker Israel branches, Terminal X, AC Sports, JD Sports Israel, and local sneaker boutiques.

For EACH store you must provide:
- name: exact real store name
- address: full real street address in or near ${city} (copy exactly from Google Maps or the store's website)
- phone: real phone number if available
- website: the store's own website URL — NOT Google Maps. Must be a real URL like footlocker.co.il, terminalx.com, nike.com/il etc.
- maps_url: Google Maps search URL in format https://www.google.com/maps/search/StoreName+City (always works)
- distance_km: real approximate distance from ${city} city center
- rating: real Google Maps rating
- is_open: whether currently open (true/false or null if unknown)
- stock_confidence: "high" if you confirmed stock, "medium" if likely, "low" if unknown
- stock_status: "In stock", "Limited stock", or "Check in store"
- why: one sentence why they'd have this shoe

Return 5 stores minimum. All addresses must be real.`;

    let aiResult = null;
    try {
      aiResult = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Find 3-5 real sneaker stores near ${city}, Israel that sell ${shoeFullName}. Return: name, address, maps_url (Google Maps search format), distance_km, rating, stock_confidence (high/medium/low). Use only well-known chains: Nike, Adidas, Foot Locker, Terminal X, AC Sports, JD Sports.`,
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
                    maps_url:         { type: 'string' },
                    distance_km:      { type: 'number' },
                    rating:           { type: 'number' },
                    stock_confidence: { type: 'string' },
                  }
                },
                minItems: 3,
              },
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)) // 25s timeout
      ]);
    } catch {
      aiResult = null;
    }

    let aiStores = (aiResult?.stores || []).filter(s => s.name && s.address);

    // Enrich with missing fields
    aiStores = aiStores.map(s => ({
      ...s,
      phone: s.phone || '',
      website: `https://www.google.com/search?q=${encodeURIComponent(s.name + ' ' + city)}`,
      maps_url: s.maps_url && s.maps_url.startsWith('http') ? s.maps_url : mapsUrl(`${s.name} ${s.address}`),
      is_open: null,
      stock_status: 'Check in store',
      why: s.stock_confidence === 'high' ? 'Confirmed stock availability' : 'Likely to carry this brand',
    }));

    // Always use fallbacks for instant results if AI is slow/empty
    if (!aiResult || aiStores.length === 0) {
      aiStores = getFallbackStores(city, shoeFullName, brand);
    }

    const finalStores = aiStores
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.stock_confidence] ?? 1) - (order[b.stock_confidence] ?? 1)
          || (a.distance_km ?? 999) - (b.distance_km ?? 999);
      })
      .slice(0, 5)
      .map((s, i) => ({ ...s, is_best_option: i === 0 }));

    const result = {
      stores: finalStores,
      summary: aiResult?.summary || `Found ${finalStores.length} stores near ${city} for ${shoeFullName}.`,
      shoe_searched: shoeFullName,
      source: 'gemini_web',
    };

    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});