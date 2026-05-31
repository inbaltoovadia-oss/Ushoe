import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

// ── Rate limiter ──
const RATE = new Map();
function checkRate(userId) {
  const now = Date.now();
  const e = RATE.get(userId) || { count: 0, start: now };
  if (now - e.start > 60000) { RATE.set(userId, { count: 1, start: now }); return true; }
  if (e.count >= 15) return false;
  e.count++; RATE.set(userId, e); return true;
}

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

// Remove duplicate stores (same name OR very close GPS)
function deduplicateStores(stores) {
  const seen = new Set();
  return stores.filter(s => {
    const nameKey = (s.name || '').toLowerCase().replace(/\s+/g, '');
    if (seen.has(nameKey)) return false;
    // Also check if another store with same GPS already added
    const gpsKey = s.latitude && s.longitude ? `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}` : null;
    if (gpsKey && seen.has(gpsKey)) return false;
    seen.add(nameKey);
    if (gpsKey) seen.add(gpsKey);
    return true;
  });
}

// Build region-aware product search URL
function buildSearchUrl(storeName, shoeFullName, countryCode) {
  const q = encodeURIComponent(shoeFullName);
  const sl = (storeName || '').toLowerCase();
  const cc = (countryCode || 'IL').toUpperCase();

  if (cc === 'IL') {
    if (sl.includes('foot locker') || sl.includes('footlocker')) return `https://footlocker.co.il/search?q=${q}`;
    if (sl.includes('nike')) return `https://www.nike.com/il/w?q=${q}`;
    if (sl.includes('adidas')) return `https://www.adidas.co.il/search?q=${q}`;
    if (sl.includes('puma')) return `https://www.puma.com/il/he/search?q=${q}`;
    if (sl.includes('new balance')) return `https://www.newbalance.co.il/search?q=${q}`;
    if (sl.includes('weshoes') || sl.includes('we shoes')) return `https://www.weshoes.co.il/search?q=${q}`;
    if (sl.includes('intersport')) return `https://www.intersport.co.il/search?q=${q}`;
  } else {
    if (sl.includes('foot locker')) return `https://www.footlocker.com/search?query=${q}`;
    if (sl.includes('nike')) return `https://www.nike.com/w?q=${q}`;
    if (sl.includes('adidas')) return `https://www.adidas.com/us/search?q=${q}`;
    if (sl.includes('finish line')) return `https://www.finishline.com/store/browse/search.jsp?query=${q}`;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Auth check
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!checkRate(user.id)) {
      return Response.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
    }

    const {
      shoe,
      selectedSize = null,
      selectedColor = null,
      cityFallback = null,
      userLat = null,
      userLng = null,
      exactAddress = null,
      countryCode = null,
    } = body;

    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    // Sanitize shoe fields
    const shoeBrand = ((shoe.brand || '').replace(/<[^>]*>/g, '')).trim().slice(0, 100);
    const shoeName = ((shoe.name || '').replace(/<[^>]*>/g, '')).trim().slice(0, 200);
    const shoeColorway = ((shoe.colorway || selectedColor || '').replace(/<[^>]*>/g, '')).trim().slice(0, 100);

    const refLat = userLat && !isNaN(userLat) ? parseFloat(userLat) : null;
    const refLng = userLng && !isNaN(userLng) ? parseFloat(userLng) : null;
    const locationLabel = exactAddress || cityFallback || 'your location';
    const cc = (countryCode || (locationLabel.toLowerCase().includes('israel') || locationLabel.toLowerCase().includes('tel aviv') || locationLabel.toLowerCase().includes('haifa') ? 'IL' : 'US')).toUpperCase();

    const brandLower = shoeBrand.toLowerCase();
    const nameLower = shoeName.toLowerCase();
    const shoeFullName = nameLower.startsWith(brandLower)
      ? `${shoeName}${shoeColorway ? ' ' + shoeColorway : ''}`
      : `${shoeBrand} ${shoeName}${shoeColorway ? ' ' + shoeColorway : ''}`;

    const cacheKey = getCacheKey(shoeFullName, refLat, refLng, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const sizeStr = selectedSize ? ` in US size ${selectedSize}` : '';
    const colorStr = shoeColorway ? `, ${shoeColorway}` : '';

    const hasGps = refLat && refLng;
    const locationContext = hasGps
      ? `GPS coordinates: ${refLat}, ${refLng}\nCity/Address: ${locationLabel}\nCountry: ${cc === 'IL' ? 'Israel' : cc}`
      : `City/Address: ${locationLabel}`;

    const llmCall = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a shoe store locator AI. Find REAL physical stores near the user that carry ${shoeBrand}.

USER LOCATION:
${locationContext}

YOUR PRIORITY: Find stores PHYSICALLY CLOSEST to the GPS coordinates. Search Google Maps NOW for "${shoeBrand} shoe stores near ${locationLabel}".

MANDATORY RULES:
1. ONLY return stores you can VERIFY exist on Google Maps or the official brand store locator. NEVER invent stores.
2. NEVER include a chain that does NOT operate in the user's country.
3. Always provide real GPS coordinates for each store.
4. Remove any duplicate stores (same name or same location).

${cc === 'IL' ? `ISRAEL-VERIFIED STORE DATA:
- JD Sports: NOT in Israel. Never include.
- Foot Locker Israel branches: Dizengoff Center (32.0795, 34.7740), Kanyon Ayalon Ramat Gan (32.0881, 34.8225), Kanyon Haifa (32.8102, 35.0053), Big Fashion Beer Sheva (31.2530, 34.7915), Kanyon Holon (32.0166, 34.7760).
- Nike Israel: Dizengoff Center Tel Aviv, Kanyon Ayalon Ramat Gan.
- Adidas Israel: Dizengoff Center, Kanyon Ayalon, Kanyon Haifa.
- SneakerBox boutique: Beilinson St 1, Tel Aviv (32.0665, 34.7748) — sells Nike, Jordan, Adidas, New Balance.
- Intersport Israel: multiple branches — search for nearest.
- WeShoes Israel: ONLY carries Crocs, HOKA, Blundstone, Native, Kizik. Does NOT carry Nike, Adidas, Jordan, Puma, Converse.

BRAND ROUTING:
- Nike/Jordan: Nike stores, Foot Locker, SneakerBox, Intersport.
- Adidas: Adidas stores, Foot Locker, SneakerBox, Intersport.
- Puma/Converse/Reebok/Vans: Foot Locker Israel.
- HOKA/Crocs/Blundstone: WeShoes Israel.` : ''}

Find up to 6 stores within 25km carrying ${shoeBrand}. Sort by distance — CLOSEST FIRST.
Check if "${shoeFullName}"${sizeStr}${colorStr} is available.

Respond ONLY with valid JSON (no markdown):
{"stores":[{"name":"...","address":"...","latitude":0.0,"longitude":0.0,"phone":"...","website":"...","google_maps_url":"...","hours_today":"...","rating":4.5,"carries_brand":true,"stock_confidence":"high|medium|low","stock_status":"...","price":null,"product_url":null,"reasoning":"..."}]}`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });

    const rawText = await Promise.race([
      llmCall,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Search timed out')), 85000)),
    ]);

    let parsed = { stores: [] };
    if (typeof rawText === 'string') {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]); } catch {} }
    } else if (rawText && typeof rawText === 'object') {
      parsed = rawText;
    }

    const rawStores = (parsed?.stores || []).filter(s => s.name && s.address && s.carries_brand !== false);

    // Calculate distances, filter, de-dup, sort
    const withDistance = rawStores.map(s => ({
      ...s,
      distance_km: (hasGps && s.latitude && s.longitude)
        ? calcDistance(refLat, refLng, s.latitude, s.longitude)
        : null,
    }));

    const filtered = deduplicateStores(
      withDistance
        .filter(s => !s.distance_km || s.distance_km <= 25)
        .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))
    ).slice(0, 6);

    const finalStores = filtered.map((s, i) => {
      let websiteUrl = buildSearchUrl(s.name, shoeFullName, cc);
      if (!websiteUrl) {
        if (s.product_url && s.product_url.startsWith('http') && !s.product_url.includes('google.com')) {
          websiteUrl = s.product_url;
        } else if (s.website && s.website.startsWith('http') && !s.website.includes('google.com')) {
          websiteUrl = s.website;
        }
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
        why: s.reasoning || `${s.name} carries ${shoeBrand}`,
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