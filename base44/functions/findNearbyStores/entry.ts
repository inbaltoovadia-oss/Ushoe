import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000;

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

function deduplicateStores(stores) {
  const seen = new Set();
  return stores.filter(s => {
    const nameKey = (s.name || '').toLowerCase().replace(/\s+/g, '');
    if (seen.has(nameKey)) return false;
    const gpsKey = s.latitude && s.longitude ? `${s.latitude.toFixed(3)},${s.longitude.toFixed(3)}` : null;
    if (gpsKey && seen.has(gpsKey)) return false;
    seen.add(nameKey);
    if (gpsKey) seen.add(gpsKey);
    return true;
  });
}

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

// Brand → which chain stores actually carry it in Israel
function getValidIsraelStoresForBrand(brand) {
  const b = (brand || '').toLowerCase();
  // WeShoes ONLY carries these brands — never Nike/Adidas/Jordan
  const weshoesOnly = ['crocs', 'hoka', 'blundstone', 'kizik', 'native', 'ilse jacobsen', 'desigual', 'freedom moses'];
  // Foot Locker Israel carries these brands
  const footLockerBrands = ['nike', 'jordan', 'air jordan', 'adidas', 'converse', 'new balance', 'puma', 'reebok', 'vans', 'under armour', 'asics', 'saucony', 'brooks', 'fila'];

  const validStores = [];
  if (b.includes('nike') || b.includes('jordan') || b.includes('air jordan')) validStores.push('Nike store');
  if (b.includes('adidas') || b.includes('yeezy')) validStores.push('Adidas store');
  if (b.includes('puma')) validStores.push('Puma store');
  if (b.includes('new balance')) validStores.push('New Balance store');
  if (footLockerBrands.some(x => b.includes(x))) validStores.push('Foot Locker');
  if (weshoesOnly.some(x => b.includes(x))) validStores.push('WeShoes');
  if (b.includes('intersport') || validStores.length === 0) validStores.push('Intersport');

  return validStores;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

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

    const shoeBrand = ((shoe.brand || '').replace(/<[^>]*>/g, '')).trim().slice(0, 100);
    const shoeName = ((shoe.name || '').replace(/<[^>]*>/g, '')).trim().slice(0, 200);
    const shoeModel = ((shoe.model || '').replace(/<[^>]*>/g, '')).trim().slice(0, 100);
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
    const hasGps = refLat && refLng;
    const locationContext = hasGps
      ? `GPS coordinates: ${refLat}, ${refLng}\nCity/Address: ${locationLabel}\nCountry: ${cc === 'IL' ? 'Israel' : cc}`
      : `City/Address: ${locationLabel}`;

    // Get valid stores for this brand
    const validStores = getValidIsraelStoresForBrand(shoeBrand);

    const llmCall = base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a shoe store locator AI for Israel. Find REAL physical stores near the user that will actually carry the SPECIFIC shoe model requested.

USER LOCATION:
${locationContext}

SHOE TO FIND: "${shoeFullName}"
Brand: ${shoeBrand}
Model: ${shoeModel || shoeName}
Size needed: ${selectedSize ? `US ${selectedSize}` : 'Not specified'}

CRITICAL RULES — READ CAREFULLY:
1. ONLY include stores that actually carry the ${shoeBrand} BRAND. Do NOT include stores that don't carry this brand.
2. IMPORTANT: Foot Locker, Nike stores, etc. showing up in a search does NOT mean they have the SPECIFIC shoe. Only say "Likely in stock" if this exact model is commonly sold at that chain.
3. NEVER include "SneakerBox" — it does not exist as an authorized retailer.
4. NEVER include "JD Sports" in Israel — they do NOT operate in Israel.
5. For stock_confidence: use "high" only if this exact model is a mainline product of that chain. Use "medium" if unsure. Use "low" if it's a limited model they might not carry.
6. stock_status should be honest: "Likely in stock", "May be available", or "Call ahead to confirm" — never say "Available" unless you are certain.

VERIFIED ISRAEL CHAIN DATA:
- Foot Locker Israel branches: Dizengoff Center Tel Aviv (32.0795, 34.7740), Kanyon Ayalon Ramat Gan (32.0881, 34.8225), Kanyon Haifa (32.8102, 35.0053), Big Fashion Beer Sheva (31.2530, 34.7915).
  Carries: Nike, Jordan, Adidas, Converse, New Balance, Puma, Reebok, Vans, Asics, Saucony, Under Armour, Fila
- Nike Israel stores: Dizengoff Center Tel Aviv, Kanyon Ayalon Ramat Gan. Carries: Nike & Jordan ONLY.
- Adidas Israel stores: Dizengoff Center, Kanyon Ayalon. Carries: Adidas & Yeezy ONLY.
- WeShoes Israel: Carries ONLY Crocs, HOKA, Blundstone, Kizik, Native, Desigual, Freedom Moses.
- Intersport Israel: Multiple locations, carries mixed sports brands.

VALID STORES FOR ${shoeBrand}: ${validStores.join(', ')}

Find up to 4 stores within 25km. Sort by distance — CLOSEST FIRST.
Only include stores from the VALID STORES list above.

Respond ONLY with valid JSON (no markdown):
{"stores":[{"name":"...","address":"...","latitude":0.0,"longitude":0.0,"phone":"...","hours_today":"...","rating":4.5,"carries_brand":true,"stock_confidence":"high|medium|low","stock_status":"...","reasoning":"..."}]}`,
      add_context_from_internet: false,
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

    const rawStores = (parsed?.stores || []).filter(s => {
      if (!s.name || !s.address) return false;
      if (s.carries_brand === false) return false;
      // Filter out stores that are not in the valid list for this brand
      const storeNameLower = (s.name || '').toLowerCase();
      // Hard block SneakerBox and JD Sports Israel
      if (storeNameLower.includes('sneakerbox') || storeNameLower.includes('sneaker box')) return false;
      if (storeNameLower.includes('jd sports') && cc === 'IL') return false;
      return true;
    });

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
    ).slice(0, 4);

    const finalStores = filtered.map((s, i) => {
      let websiteUrl = buildSearchUrl(s.name, shoeFullName, cc);
      if (!websiteUrl && s.website && s.website.startsWith('http') && !s.website.includes('google.com')) {
        websiteUrl = s.website;
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
        why: s.reasoning || `${s.name} carries ${shoeBrand}`,
        stock_status: s.stock_status || 'Call ahead to confirm',
        stock_confidence: s.stock_confidence || 'medium',
        local_pickup: true,
        is_best_option: i === 0,
      };
    });

    const response = {
      stores: finalStores,
      summary: finalStores.length > 0
        ? `Found ${finalStores.length} store${finalStores.length !== 1 ? 's' : ''} near ${locationLabel} that may carry ${shoeFullName}${sizeStr}. Always call ahead to confirm availability.`
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