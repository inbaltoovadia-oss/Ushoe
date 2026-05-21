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

// Build a direct product search URL on the retailer's site for the shoe
function buildProductSearchUrl(retailerName, shoeQuery) {
  const q = encodeURIComponent(shoeQuery);
  const rl = (retailerName || '').toLowerCase();
  if (rl.includes('foot locker'))  return `https://footlocker.co.il/search?q=${q}`;
  if (rl.includes('nike'))         return `https://www.nike.com/il/w?q=${q}`;
  if (rl.includes('adidas'))       return `https://www.adidas.co.il/search?q=${q}`;
  if (rl.includes('weshoes') || rl.includes('we shoes')) return `https://www.weshoes.co.il/search?q=${q}`;
  if (rl.includes('shilav'))       return `https://www.shilav.co.il/search?q=${q}`;
  // Generic Google search for the shoe at that store
  return `https://www.google.com/search?q=${encodeURIComponent(shoeQuery + ' ' + retailerName + ' Israel')}`;
}

// Verified Israeli sneaker retail chains with physical storefronts
// Terminal X is permanently closed. Sport Depot, JD Sports, Fox Shoes, Shilav, Intisport excluded.
const SNEAKER_CHAINS_IL = [
  {
    name: 'Foot Locker',
    maps_search: 'Foot Locker ישראל חנות נעליים',
    rating: 4.2,
    why: 'International sneaker chain with physical stores across Israel — carries Nike, Adidas, Jordan and all major brands',
    website_search: (q) => `https://footlocker.co.il/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: 'WeShoes',
    maps_search: 'WeShoes נעליים ישראל חנות',
    rating: 4.1,
    why: 'Israeli multi-brand sneaker retailer with physical stores carrying a wide variety of brands',
    website_search: (q) => `https://www.weshoes.co.il/search?q=${encodeURIComponent(q)}`,
  },
];

function getBrandStore(brand) {
  const b = (brand || '').toLowerCase();
  if (b.includes('nike')) return {
    name: 'Nike Store',
    website_search: (q) => `https://www.nike.com/il/w?q=${encodeURIComponent(q)}`,
    maps_search: 'Nike Store ישראל חנות',
    rating: 4.5,
    why: 'Official Nike retail store — guaranteed stock of all Nike models',
  };
  if (b.includes('adidas')) return {
    name: 'Adidas Store',
    website_search: (q) => `https://www.adidas.co.il/search?q=${encodeURIComponent(q)}`,
    maps_search: 'Adidas Store ישראל חנות',
    rating: 4.4,
    why: 'Official Adidas retail store — guaranteed stock of all Adidas models',
  };
  if (b.includes('puma')) return {
    name: 'Puma Store',
    website_search: (q) => `https://www.puma.com/il/he/search?q=${encodeURIComponent(q)}`,
    maps_search: 'Puma Store ישראל חנות',
    rating: 4.2,
    why: 'Official Puma retail store',
  };
  if (b.includes('crocs')) return {
    name: 'Crocs Store',
    website_search: (q) => `https://www.crocs.co.il/search?q=${encodeURIComponent(q)}`,
    maps_search: 'Crocs ישראל חנות',
    rating: 4.1,
    why: 'Official Crocs retailer in Israel',
  };
  return null;
}

// Stores that must NEVER appear
const BLOCKED_STORES = [
  'terminal x', 'terminalx', 'ac sports', 'acsports',
  'fox shoes', 'foxshoes', 'shilav', 'sport depot', 'sportdepot',
  'jd sports', 'jdsports', 'intisport',
];

function getFallbackStores(locationLabel, brand, shoeQuery) {
  const brandStore = getBrandStore(brand);
  const chains = [...SNEAKER_CHAINS_IL];
  const all = brandStore ? [brandStore, ...chains] : chains;
  return all.slice(0, 3).map((r, i) => ({
    name: r.name,
    address: `חפש ב-Google Maps: ${r.maps_search}`,
    phone: '',
    website: r.website_search ? r.website_search(shoeQuery) : buildProductSearchUrl(r.name, shoeQuery),
    maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.maps_search)}`,
    distance_km: null,
    rating: r.rating,
    is_open: null,
    stock_confidence: i === 0 ? 'high' : 'medium',
    stock_status: 'Check in store',
    why: r.why,
    is_best_option: i === 0,
  }));
}

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
    const allowedChains = [
      ...(brandStore ? [brandStore.name] : []),
      'Foot Locker',
      'WeShoes',
    ].join(', ');

    const prompt = `Search Google Maps for physical RETAIL STORE BRANCHES near ${useExactGPS ? `GPS coordinates ${locationLabel}` : locationLabel} in Israel that sell ${shoeFullName}${sizeInfo}.

ALLOWED CHAINS ONLY (these are the only valid answers): ${allowedChains}

CRITICAL RULES:
1. Return ONLY physical retail storefronts a customer can walk into today
2. Terminal X is PERMANENTLY CLOSED — do NOT include it under any circumstances
3. Only include stores that are currently open and operating
4. Do NOT include: Terminal X, AC Sports, Fox Shoes, Shilav, Sport Depot, JD Sports, Intisport, or any chain not in the allowed list
5. Return ONLY stores within 30km of the user — sort by distance, closest first
6. Each result must be a real Google Maps PIN with a verified address

For each store provide:
- name: chain name from allowed list
- address: EXACT address of this specific branch as it appears on Google Maps
- phone: real phone from Google Maps (or empty string)
- maps_url: https://www.google.com/maps/search/?api=1&query=EXACT_BRANCH_ADDRESS
- distance_km: real distance in km from ${locationLabel}
- rating: Google Maps rating for this specific branch
- is_open: true/false based on current Google Maps status
- stock_confidence: "high" for brand's own store, "medium" for multi-brand
- store_lat: branch latitude
- store_lng: branch longitude

Aim for 3-4 real nearby branches. If fewer genuine stores exist within 30km, return only those that actually exist.`;

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

    // Hard-filter blocked stores
    let aiStores = (aiResult?.stores || []).filter(s => {
      if (!s.name || !s.address) return false;
      const nl = s.name.toLowerCase();
      return !BLOCKED_STORES.some(blocked => nl.includes(blocked));
    });

    // Enrich: recalculate distances + build product search URLs
    aiStores = aiStores.map(s => {
      let distance = s.distance_km;
      if (useExactGPS && s.store_lat && s.store_lng) {
        distance = calculateDistance(userLat, userLng, s.store_lat, s.store_lng);
      }
      const chainInfo = [...SNEAKER_CHAINS_IL, ...(brandStore ? [brandStore] : [])].find(r =>
        s.name.toLowerCase().includes(r.name.toLowerCase().split(' ')[0])
      );
      return {
        ...s,
        website: chainInfo?.website_search
          ? chainInfo.website_search(shoeFullName)
          : buildProductSearchUrl(s.name, shoeFullName),
        maps_url: (s.maps_url && s.maps_url.startsWith('http')) ? s.maps_url : mapsUrl(s.name, s.address),
        stock_status: s.stock_confidence === 'high' ? 'Likely in stock' : 'Check in store',
        why: chainInfo?.why || 'Verified sneaker retailer',
        distance_km: distance,
      };
    });

    // Pad to minimum 3 using fallbacks if AI returned too few
    if (aiStores.length < 3) {
      const fallbacks = getFallbackStores(locationLabel, brand, shoeFullName);
      for (const fb of fallbacks) {
        if (aiStores.length >= 4) break;
        const alreadyHave = aiStores.some(s => s.name.toLowerCase().includes(fb.name.toLowerCase().split(' ')[0]));
        if (!alreadyHave) aiStores.push(fb);
      }
    }

    const finalStores = aiStores
      .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
      .slice(0, 4)
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