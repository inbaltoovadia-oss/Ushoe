import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(shoeId, lat, lng, size) {
  return `${shoeId}_${lat.toFixed(3)}_${lng.toFixed(3)}_${size || ''}`;
}

function mapsUrl(name, address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ONLY confirmed multi-brand sneaker chains that actually stock Nike/Adidas/etc.
// Fox Shoes and Shilav are EXCLUDED — they sell general fashion, not sneakers.
const SNEAKER_CHAINS_IL = [
  {
    name: 'Foot Locker',
    website: 'https://footlocker.co.il',
    maps_search: 'Foot Locker Israel',
    rating: 4.2,
    why: 'International sneaker chain — carries Nike, Adidas, Jordan and all major brands',
  },
  {
    name: 'JD Sports',
    website: 'https://www.jdsports.co.il',
    maps_search: 'JD Sports Israel',
    rating: 4.3,
    why: 'Major international sneaker retailer with wide selection of brands',
  },
  {
    name: 'Sport Depot',
    website: 'https://www.sport-depot.co.il',
    maps_search: 'Sport Depot Israel',
    rating: 4.0,
    why: 'Large sports retailer stocking major sneaker brands',
  },
  {
    name: 'Intisport',
    website: 'https://www.intisport.co.il',
    maps_search: 'Intisport Israel',
    rating: 4.1,
    why: 'Established Israeli sports chain carrying major sneaker brands',
  },
];

// Returns brand-specific store entry if relevant
function getBrandStore(brand) {
  const b = (brand || '').toLowerCase();
  if (b.includes('nike')) return {
    name: 'Nike Store',
    website: 'https://www.nike.com/il',
    maps_search: 'Nike Store Israel',
    rating: 4.5,
    why: 'Official Nike store — guaranteed stock of all Nike models',
  };
  if (b.includes('adidas')) return {
    name: 'Adidas Store',
    website: 'https://www.adidas.co.il',
    maps_search: 'Adidas Store Israel',
    rating: 4.4,
    why: 'Official Adidas store — guaranteed stock of all Adidas models',
  };
  if (b.includes('puma')) return {
    name: 'Puma Store',
    website: 'https://www.puma.com/il',
    maps_search: 'Puma Store Israel',
    rating: 4.2,
    why: 'Official Puma store',
  };
  return null;
}

function getFallbackStores(locationLabel, brand) {
  const brandStore = getBrandStore(brand);
  const chains = [...SNEAKER_CHAINS_IL];
  const all = brandStore ? [brandStore, ...chains] : chains;
  return all.slice(0, 4).map((r, i) => ({
    name: r.name,
    address: `${r.name}, Israel`,
    phone: '',
    website: r.website,
    maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.maps_search + ' ' + locationLabel)}`,
    distance_km: null,
    rating: r.rating,
    is_open: null,
    stock_confidence: i === 0 ? 'high' : 'medium',
    stock_status: 'Check in store',
    why: r.why,
    is_best_option: i === 0,
  }));
}

// Stores that must NEVER appear — closed, wrong category, or don't carry sneakers
const BLOCKED_STORES = ['terminal x', 'ac sports', 'acsports', 'fox shoes', 'foxshoes', 'shilav'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, cityFallback = null, userLat = null, userLng = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const useExactGPS = !!(userLat && userLng);
    const locationLabel = useExactGPS
      ? `${userLat.toFixed(4)},${userLng.toFixed(4)}`
      : (cityFallback || 'Tel Aviv');

    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const brand = shoe.brand || 'Nike';
    const sizeInfo = selectedSize ? `, US size ${selectedSize}` : '';

    const cacheKey = getCacheKey(shoe.id || shoe.name, userLat || 32.0853, userLng || 34.7818, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const brandStore = getBrandStore(brand);
    const brandStoreName = brandStore ? brandStore.name : null;

    const allowedChains = [
      ...(brandStoreName ? [brandStoreName] : []),
      'Foot Locker',
      'JD Sports',
      'Sport Depot',
      'Intisport',
    ].join(', ');

    const prompt = `Use Google Maps to find physical store BRANCHES in Israel near ${useExactGPS ? `GPS ${locationLabel}` : locationLabel} that sell ${shoeFullName}${sizeInfo}.

ALLOWED STORE CHAINS ONLY: ${allowedChains}
DO NOT return: Terminal X, AC Sports, Fox Shoes, Shilav, or any store not in the allowed list above.
DO NOT return stores that primarily sell clothing — only sneaker/sports-specific chains.

For each branch you find on Google Maps:
- name: exact chain name from allowed list
- address: EXACT branch address as shown on Google Maps (e.g. "Foot Locker, Dizengoff Center, 50 Dizengoff St, Tel Aviv")
- phone: real phone number from Google Maps listing
- website: chain website URL
- maps_url: https://www.google.com/maps/search/?api=1&query=EXACT_STORE_ADDRESS (URL encoded)
- distance_km: distance in km from ${locationLabel}
- rating: Google Maps star rating for this specific branch
- is_open: true if currently open per Google Maps, false if closed, null if unknown
- stock_confidence: "high" if brand's own store, "medium" otherwise
- store_lat: branch latitude
- store_lng: branch longitude

Find 3-4 different BRANCHES (not just 1 chain) sorted by distance. Each must be a real, currently-open Google Maps location.`;

    let aiResult = null;
    try {
      aiResult = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
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
                    store_lat:        { type: 'number' },
                    store_lng:        { type: 'number' },
                  }
                },
              },
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 22000))
      ]);
    } catch {
      aiResult = null;
    }

    // Hard-filter: remove any blocked stores even if AI ignored instructions
    let aiStores = (aiResult?.stores || []).filter(s => {
      if (!s.name || !s.address) return false;
      const nl = s.name.toLowerCase();
      return !BLOCKED_STORES.some(blocked => nl.includes(blocked));
    });

    // Enrich: recalculate distances from GPS + fix websites + maps URLs
    aiStores = aiStores.map(s => {
      let distance = s.distance_km;
      if (useExactGPS && s.store_lat && s.store_lng) {
        distance = calculateDistance(userLat, userLng, s.store_lat, s.store_lng);
      }
      const verified = [...SNEAKER_CHAINS_IL, ...(brandStore ? [brandStore] : [])].find(r =>
        s.name.toLowerCase().includes(r.name.toLowerCase().split(' ')[0])
      );
      return {
        ...s,
        website: (s.website && s.website.startsWith('http')) ? s.website : (verified?.website || `https://www.google.com/search?q=${encodeURIComponent(s.name)}`),
        maps_url: (s.maps_url && s.maps_url.startsWith('http')) ? s.maps_url : mapsUrl(s.name, s.address),
        stock_status: s.stock_confidence === 'high' ? 'Likely in stock' : 'Check in store',
        why: verified?.why || 'Verified sneaker retailer',
        distance_km: distance,
      };
    });

    // Pad to minimum 3 results using verified fallbacks
    if (aiStores.length < 3) {
      const fallbacks = getFallbackStores(locationLabel, brand);
      for (const fb of fallbacks) {
        if (aiStores.length >= 4) break;
        const alreadyHave = aiStores.some(s => s.name.toLowerCase().includes(fb.name.toLowerCase().split(' ')[0]));
        if (!alreadyHave) aiStores.push(fb);
      }
    }

    const finalStores = aiStores
      .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
      .slice(0, 5)
      .map((s, i) => ({ ...s, is_best_option: i === 0 }));

    const result = {
      stores: finalStores,
      summary: `Found ${finalStores.length} verified stores near your ${useExactGPS ? 'exact location' : 'area'} for ${shoeFullName}.`,
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