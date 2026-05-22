import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(shoeName, lat, lng, size) {
  return `${shoeName}_${lat?.toFixed(2)}_${lng?.toFixed(2)}_${size || 'any'}`.toLowerCase().replace(/\s+/g, '_');
}

function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, selectedColor = null, cityFallback = null, userLat = null, userLng = null, exactAddress = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const refLat = userLat && !isNaN(userLat) ? parseFloat(userLat) : null;
    const refLng = userLng && !isNaN(userLng) ? parseFloat(userLng) : null;
    const locationLabel = exactAddress || cityFallback || 'your location';

    const brandLower = (shoe.brand || '').toLowerCase();
    const nameLower = (shoe.name || '').toLowerCase();
    const shoeFullName = nameLower.startsWith(brandLower)
      ? `${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`
      : `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;

    const cacheKey = getCacheKey(shoeFullName, refLat, refLng, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const sizeStr = selectedSize ? ` in US size ${selectedSize}` : '';
    const colorStr = selectedColor ? `, ${selectedColor}` : (shoe.colorway ? `, ${shoe.colorway}` : '');
    const locationContext = refLat && refLng
      ? `GPS: ${refLat}, ${refLng} (${locationLabel})`
      : `Location: ${locationLabel}`;

    // SINGLE combined call: find stores AND check stock in one web search — 80s timeout
    const llmCall = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a shoe store locator. Search the web RIGHT NOW to find real, currently-open physical shoe stores near: ${locationContext}

CRITICAL RULES — STRICT ENFORCEMENT:
1. ONLY return stores you can VERIFY exist via a real Google Maps or web search result. Do NOT invent or hallucinate store names, addresses, or phone numbers.
2. If a store chain does NOT officially operate in this country/city (e.g. JD Sports is NOT in Israel), do NOT include it.
3. VERIFY each store's branch actually exists at the address you provide — confirm from Google Maps or the retailer's official store locator.

ISRAEL-SPECIFIC FACTS (if location is in Israel):
- JD Sports does NOT operate in Israel. Do NOT include JD Sports.
- Foot Locker Israel has branches at: Dizengoff Center Tel Aviv, Ayalon Mall Ramat Gan, Kanyon Haifa, Big Fashion Beer Sheva, Kanyon Holon.
- Nike Israel has official stores at: Dizengoff Center Tel Aviv, Kanyon Ayalon Ramat Gan.
- WeShoes has branches at multiple Israeli malls — sells ONLY: Crocs, HOKA, Blundstone, Desigual, Freedom Moses, Kizik, Native Shoes. Does NOT sell Nike, Adidas, Jordan, Puma, New Balance, Converse, Vans.
- Adidas Israel stores at: Dizengoff Center, Kanyon Haifa, Kanyon Ayalon.
- SneakerBox (independent boutique) is at Beilinson St, Tel Aviv.
- Intersport has multiple Israeli branches.

BRAND RULES:
- Nike stores only sell Nike and Jordan brand.
- Adidas stores only sell Adidas and Originals.
- Foot Locker sells: Nike, Jordan, Adidas, Converse, New Balance, Puma, Under Armour, Vans, Reebok.
- WeShoes sells ONLY: Crocs, HOKA, Blundstone, Desigual, Freedom Moses, Kizik, Native Shoes.

Find up to 5 stores within 20km that:
1. Actually exist and are currently open as a business
2. Actually carry the ${shoe.brand} brand (enforcing brand rules above)

For each VERIFIED store, also check whether "${shoeFullName}"${sizeStr}${colorStr} is currently available.

Return for each store:
- name: exact store name and branch
- address: verified full street address
- latitude: GPS latitude
- longitude: GPS longitude  
- phone: real phone number (null if not found)
- website: official website
- google_maps_url: Google Maps link
- hours_today: today's hours
- rating: Google Maps rating
- carries_brand: true/false
- stock_confidence: "high" if verified on site, "medium" if brand is carried, "low" if uncertain
- stock_status: "In stock", "Check in store", or "Call to confirm"
- price: local currency price if found
- product_url: direct product URL or search URL
- reasoning: one sentence why this store likely has the shoe

ONLY include stores where carries_brand is true AND you verified the store actually exists.`,
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
                latitude:         { type: 'number' },
                longitude:        { type: 'number' },
                phone:            { type: 'string' },
                website:          { type: 'string' },
                google_maps_url:  { type: 'string' },
                hours_today:      { type: 'string' },
                rating:           { type: 'number' },
                carries_brand:    { type: 'boolean' },
                stock_confidence: { type: 'string' },
                stock_status:     { type: 'string' },
                price:            { type: 'string' },
                product_url:      { type: 'string' },
                reasoning:        { type: 'string' },
              }
            }
          }
        }
      }
    });

    const result = await Promise.race([
      llmCall,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Search timed out after 85 seconds')), 85000)),
    ]);

    const rawStores = (result?.stores || []).filter(s => s.name && s.address && s.carries_brand !== false);

    // Sort by distance and cap at 6
    const finalStores = rawStores.map(s => ({
      ...s,
      distance_km: (refLat && refLng && s.latitude && s.longitude)
        ? calcDistance(refLat, refLng, s.latitude, s.longitude)
        : null,
    }))
    .filter(s => !s.distance_km || s.distance_km <= 25)
    .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))
    .slice(0, 6)
    .map((s, i) => {
      // Build best website URL
      const q = encodeURIComponent(shoeFullName);
      let websiteUrl = s.product_url || s.website || null;
      if (!websiteUrl || websiteUrl.includes('google.com')) {
        if (s.website?.includes('footlocker.co.il')) websiteUrl = `https://footlocker.co.il/search?q=${q}`;
        else if (s.website?.includes('nike.com')) websiteUrl = `https://www.nike.com/il/w?q=${q}`;
        else if (s.website?.includes('adidas')) websiteUrl = `https://www.adidas.co.il/search?q=${q}`;
        else if (s.website?.includes('weshoes')) websiteUrl = `https://www.weshoes.co.il/search?q=${q}`;
        else websiteUrl = s.website || null;
      }

      return {
        name: s.name,
        address: s.address,
        phone: s.phone || null,
        maps_url: s.google_maps_url || (s.latitude && s.longitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`
          : `https://www.google.com/maps/search/${encodeURIComponent(s.name + ' ' + s.address)}`),
        distance_km: s.distance_km,
        rating: s.rating || null,
        is_open: null,
        hours_today: s.hours_today || null,
        website: websiteUrl,
        price: s.price || null,
        why: s.reasoning || `${s.name} carries ${shoe.brand}`,
        stock_status: s.stock_status || 'Check in store',
        stock_confidence: s.stock_confidence || 'medium',
        local_pickup: true,
        is_best_option: i === 0,
      };
    });

    const response = {
      stores: finalStores,
      summary: finalStores.length > 0
        ? `Found ${finalStores.length} store${finalStores.length !== 1 ? 's' : ''} near ${locationLabel} that carry ${shoeFullName}${sizeStr}.`
        : `No stores found carrying ${shoeFullName} near ${locationLabel}.`,
      shoe_searched: shoeFullName,
    };

    if (finalStores.length > 0) {
      CACHE.set(cacheKey, { data: response, ts: Date.now() });
    }

    return Response.json(response);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});