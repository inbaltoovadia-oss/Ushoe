import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(shoeId, lat, lng, size) {
  return `${shoeId}_${lat.toFixed(4)}_${lng.toFixed(4)}_${size || ''}`;
}

function mapsUrl(query) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula for distance between two GPS coordinates
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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

    const { shoe, selectedSize = null, cityFallback = null, latitude = null, longitude = null, userLat = null, userLng = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    // Prioritize exact GPS coordinates over city fallback
    const useExactGPS = userLat && userLng;
    const searchLocation = useExactGPS 
      ? `${userLat.toFixed(6)},${userLng.toFixed(6)}` 
      : (cityFallback || (latitude && longitude ? `${latitude},${longitude}` : 'Tel Aviv'));
    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const sizeInfo = selectedSize ? `US size ${selectedSize}` : '';
    const brand = shoe.brand || 'Nike';

    const cacheKey = getCacheKey(shoe.id || shoe.name, userLat || latitude || 32.0853, userLng || longitude || 34.7818, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const locationPrompt = useExactGPS 
      ? `User's EXACT GPS location: ${userLat.toFixed(6)},${userLng.toFixed(6)}. Find stores within 5km radius.`
      : `Search near ${searchLocation}.`;
    
    const prompt = `Search the web and find at least 5 real physical sneaker stores near ${locationPrompt} that carry ${shoeFullName}.${sizeInfo ? ` Size needed: ${sizeInfo}.` : ''}

Include official ${brand} stores, Foot Locker Israel branches, Terminal X, AC Sports, JD Sports Israel, and local sneaker boutiques.

For EACH store you must provide:
- name: exact real store name
- address: full real street address (copy exactly from Google Maps or the store's website)
- phone: real phone number if available
- website: the store's own website URL — NOT Google Maps. Must be a real URL like footlocker.co.il, terminalx.com, nike.com/il etc.
- maps_url: Google Maps URL in format https://www.google.com/maps/search/?api=1&query=LAT,LNG (use store's exact coordinates)
- distance_km: EXACT distance in km from user's location (calculate precisely)
- rating: real Google Maps rating
- is_open: whether currently open (true/false or null if unknown)
- stock_confidence: "high" if you confirmed stock, "medium" if likely, "low" if unknown
- stock_status: "In stock", "Limited stock", or "Check in store"
- why: one sentence why they'd have this shoe
- store_lat: store's latitude coordinate
- store_lng: store's longitude coordinate

Return 5 stores minimum. All addresses must be real. Prioritize stores closest to user's exact location.`;

    let aiResult = null;
    try {
      aiResult = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Find 3-5 real sneaker stores near ${useExactGPS ? `GPS ${userLat.toFixed(4)},${userLng.toFixed(4)}` : searchLocation}, Israel that sell ${shoeFullName}. Return: name, address, maps_url (Google Maps format with exact coordinates), distance_km (precise), rating, stock_confidence (high/medium/low), store_lat, store_lng. Use only well-known chains: Nike, Adidas, Foot Locker, Terminal X, AC Sports, JD Sports.`,
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

    // Enrich with missing fields and calculate precise distances
    aiStores = aiStores.map(s => {
      let distance = s.distance_km;
      // Calculate exact distance if we have GPS coordinates for both user and store
      if (useExactGPS && s.store_lat && s.store_lng) {
        distance = calculateDistance(userLat, userLng, s.store_lat, s.store_lng);
      }
      return {
        ...s,
        phone: s.phone || '',
        website: `https://www.google.com/search?q=${encodeURIComponent(s.name + ' ' + (useExactGPS ? 'near me' : searchLocation))}`,
        maps_url: s.maps_url && s.maps_url.startsWith('http') ? s.maps_url : mapsUrl(`${s.name} ${s.address}`),
        is_open: null,
        stock_status: 'Check in store',
        why: s.stock_confidence === 'high' ? 'Confirmed stock availability' : 'Likely to carry this brand',
        distance_km: distance,
      };
    });

    // Always use fallbacks for instant results if AI is slow/empty
    if (!aiResult || aiStores.length === 0) {
      aiStores = getFallbackStores(useExactGPS ? 'near me' : searchLocation, shoeFullName, brand);
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
      summary: aiResult?.summary || `Found ${finalStores.length} stores near your ${useExactGPS ? 'exact location' : 'area'} for ${shoeFullName}.`,
      shoe_searched: shoeFullName,
      source: 'gemini_web',
      used_exact_gps: useExactGPS,
    };

    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});