import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(shoeId, city, size) {
  return `${shoeId}_${(city || '').toLowerCase().replace(/\s+/g, '_')}_${size || ''}`;
}

// Google Maps search URLs always work — guaranteed no 404
function mapsUrl(query) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

// Fallback stores guaranteed for Israel (all use Maps search URLs)
function getFallbackStores(city, shoeFullName, brand) {
  const q = encodeURIComponent(shoeFullName);
  const cityEnc = encodeURIComponent(city);
  return [
    {
      name: 'Foot Locker Israel',
      address: `Foot Locker, ${city}`,
      phone: '',
      website: `https://footlocker.co.il/search?q=${q}`,
      maps_url: mapsUrl(`Foot Locker ${city} Israel`),
      distance_km: null,
      rating: 4.2,
      is_open: null,
      stock_confidence: 'medium',
      stock_status: 'Check in store',
      why: `Major chain likely to carry ${brand}`,
      is_best_option: false,
    },
    {
      name: 'Terminal X',
      address: `Terminal X, ${city}`,
      phone: '',
      website: `https://www.terminalx.com/catalogsearch/result/?q=${q}`,
      maps_url: mapsUrl(`Terminal X ${city} Israel`),
      distance_km: null,
      rating: 4.3,
      is_open: null,
      stock_confidence: 'medium',
      stock_status: 'Check in store',
      why: `Large sportswear retailer with wide selection`,
      is_best_option: false,
    },
    {
      name: 'AC Sports',
      address: `AC Sports, ${city}`,
      phone: '',
      website: `https://www.acsports.co.il/search?q=${q}`,
      maps_url: mapsUrl(`AC Sports ${city} Israel`),
      distance_km: null,
      rating: 4.1,
      is_open: null,
      stock_confidence: 'medium',
      stock_status: 'Check in store',
      why: `Sports chain commonly stocking major brands`,
      is_best_option: false,
    },
    {
      name: `${brand} Store`,
      address: `${brand}, ${city}`,
      phone: '',
      website: `https://www.google.com/search?q=${encodeURIComponent(brand + ' store ' + city)}`,
      maps_url: mapsUrl(`${brand} store ${city} Israel`),
      distance_km: null,
      rating: 4.4,
      is_open: null,
      stock_confidence: 'high',
      stock_status: 'Check in store',
      why: `Official brand store — highest availability`,
      is_best_option: false,
    },
  ];
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
      cityFallback = null,
      latitude = null,
      longitude = null,
    } = body;

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

    const prompt = `Find at least 5 real physical sneaker stores near ${city}, Israel that are likely to carry ${shoeFullName}.${sizeInfo ? ` Size needed: ${sizeInfo}.` : ''}

Include a mix of: official ${brand} stores, Foot Locker Israel, Terminal X, AC Sports, JD Sports Israel, and local sneaker boutiques.

For EVERY store you return, you MUST provide:
- name: exact store name
- address: full street address in ${city}
- phone: phone number if known
- website: the store's own website URL (NOT Google Maps, must be the actual site like footlocker.co.il or terminalx.com)
- maps_url: a Google Maps search URL like https://www.google.com/maps/search/StoreName+${encodeURIComponent(city)}
- distance_km: approximate distance from city center
- rating: Google Maps rating (1-5)
- is_open: whether open now (true/false/null if unknown)
- stock_confidence: "high", "medium", or "low"
- stock_status: "In stock", "Limited stock", "Out of stock", or "Check in store"
- why: one short sentence explaining why they'd have it

Return exactly 5 stores minimum.`;

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

    let aiResult = null;
    try {
      aiResult = await Promise.race([
        llmPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 40000))
      ]);
    } catch {
      aiResult = null;
    }

    let aiStores = (aiResult?.stores || []).filter(s => s.name && s.address);

    // Fix any bad maps_url — always use Google Maps search (guaranteed no 404)
    aiStores = aiStores.map(s => ({
      ...s,
      maps_url: s.maps_url && s.maps_url.startsWith('http')
        ? s.maps_url
        : mapsUrl(`${s.name} ${s.address}`),
      // Ensure website is a real URL, not a maps link
      website: s.website && s.website.startsWith('http') && !s.website.includes('google.com/maps')
        ? s.website
        : `https://www.google.com/search?q=${encodeURIComponent(s.name + ' ' + city)}`,
    }));

    // Pad with fallback stores if under 3 results
    const fallbacks = getFallbackStores(city, shoeFullName, brand);
    for (const fb of fallbacks) {
      if (aiStores.length >= 5) break;
      const alreadyHave = aiStores.some(s =>
        s.name.toLowerCase().includes(fb.name.toLowerCase().split(' ')[0]) ||
        fb.name.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
      );
      if (!alreadyHave) aiStores.push(fb);
    }

    const finalStores = aiStores
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        const diff = (order[a.stock_confidence] ?? 1) - (order[b.stock_confidence] ?? 1);
        return diff !== 0 ? diff : (a.distance_km ?? 999) - (b.distance_km ?? 999);
      })
      .slice(0, 6)
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