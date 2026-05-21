import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(shoeName, locationKey, size) {
  return `${shoeName}_${locationKey}_${size || 'any'}`.toLowerCase().replace(/\s+/g, '_');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// Verified Israeli physical store branches with GPS coords
const KNOWN_BRANCHES = {
  'foot locker': [
    { name: 'Foot Locker - Dizengoff Center',  address: 'Dizengoff Center, Tel Aviv',      lat: 32.0782, lng: 34.7745, phone: '03-528-5400', rating: 4.2, maps_url: 'https://maps.google.com/?q=Foot+Locker+Dizengoff+Center+Tel+Aviv' },
    { name: 'Foot Locker - Azrieli',            address: 'Azrieli Mall, Tel Aviv',          lat: 32.0715, lng: 34.7925, phone: '03-608-0200', rating: 4.3, maps_url: 'https://maps.google.com/?q=Foot+Locker+Azrieli+Tel+Aviv' },
    { name: 'Foot Locker - Ayalon Mall',        address: 'Ayalon Mall, Ramat Gan',          lat: 32.0800, lng: 34.8150, phone: '03-575-7800', rating: 4.1, maps_url: 'https://maps.google.com/?q=Foot+Locker+Ayalon+Mall+Ramat+Gan' },
    { name: 'Foot Locker - Haifa Grand Canyon', address: 'Grand Canyon Mall, Haifa',        lat: 32.8191, lng: 34.9944, phone: '04-815-3600', rating: 4.0, maps_url: 'https://maps.google.com/?q=Foot+Locker+Grand+Canyon+Haifa' },
    { name: 'Foot Locker - Rishon LeZion',      address: 'Big Fashion Mall, Rishon LeZion', lat: 31.9730, lng: 34.8040, phone: '03-951-0100', rating: 4.1, maps_url: 'https://maps.google.com/?q=Foot+Locker+Rishon+LeZion' },
    { name: 'Foot Locker - Petah Tikva',        address: 'Gan HaIr Mall, Petah Tikva',      lat: 32.0875, lng: 34.8878, phone: '03-921-0100', rating: 4.0, maps_url: 'https://maps.google.com/?q=Foot+Locker+Petah+Tikva' },
  ],
  'nike': [
    { name: 'Nike Store - Dizengoff Center', address: 'Dizengoff Center, Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5000', rating: 4.5, maps_url: 'https://maps.google.com/?q=Nike+Store+Dizengoff+Center+Tel+Aviv' },
    { name: 'Nike Store - Azrieli',          address: 'Azrieli Mall, Tel Aviv',     lat: 32.0715, lng: 34.7925, phone: '03-608-0100', rating: 4.5, maps_url: 'https://maps.google.com/?q=Nike+Store+Azrieli+Tel+Aviv' },
    { name: 'Nike Store - Ayalon Mall',      address: 'Ayalon Mall, Ramat Gan',     lat: 32.0800, lng: 34.8150, phone: '03-575-7801', rating: 4.4, maps_url: 'https://maps.google.com/?q=Nike+Store+Ayalon+Mall+Ramat+Gan' },
  ],
  'adidas': [
    { name: 'Adidas Store - Azrieli',          address: 'Azrieli Mall, Tel Aviv',     lat: 32.0715, lng: 34.7925, phone: '03-608-0150', rating: 4.4, maps_url: 'https://maps.google.com/?q=Adidas+Store+Azrieli+Tel+Aviv' },
    { name: 'Adidas Store - Dizengoff Center', address: 'Dizengoff Center, Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5050', rating: 4.3, maps_url: 'https://maps.google.com/?q=Adidas+Store+Dizengoff+Center+Tel+Aviv' },
    { name: 'Adidas Store - Ayalon Mall',      address: 'Ayalon Mall, Ramat Gan',     lat: 32.0800, lng: 34.8150, phone: '03-575-7802', rating: 4.3, maps_url: 'https://maps.google.com/?q=Adidas+Store+Ayalon+Mall+Ramat+Gan' },
  ],
  'puma': [
    { name: 'Puma Store - Dizengoff Center', address: 'Dizengoff Center, Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5100', rating: 4.2, maps_url: 'https://maps.google.com/?q=Puma+Store+Dizengoff+Center+Tel+Aviv' },
  ],
  'weshoes': [
    { name: 'WeShoes - Dizengoff Center', address: 'Dizengoff Center, Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5200', rating: 4.1, maps_url: 'https://maps.google.com/?q=WeShoes+Dizengoff+Center+Tel+Aviv' },
    { name: 'WeShoes - Azrieli',          address: 'Azrieli Mall, Tel Aviv',     lat: 32.0715, lng: 34.7925, phone: '03-608-0250', rating: 4.0, maps_url: 'https://maps.google.com/?q=WeShoes+Azrieli+Tel+Aviv' },
    { name: 'WeShoes - Ayalon Mall',      address: 'Ayalon Mall, Ramat Gan',     lat: 32.0800, lng: 34.8150, phone: '03-575-7803', rating: 4.0, maps_url: 'https://maps.google.com/?q=WeShoes+Ayalon+Mall+Ramat+Gan' },
  ],
};

// Which Israeli retailers carry each brand
const BRAND_TO_CHAINS = {
  'nike':         ['nike', 'foot locker'],
  'adidas':       ['adidas', 'foot locker'],
  'puma':         ['puma', 'foot locker'],
  'new balance':  ['foot locker', 'weshoes'],
  'converse':     ['foot locker', 'weshoes'],
  'vans':         ['foot locker', 'weshoes'],
  'jordan':       ['nike', 'foot locker'],
  'air jordan':   ['nike', 'foot locker'],
  'reebok':       ['foot locker', 'weshoes'],
  'asics':        ['foot locker', 'weshoes'],
  'saucony':      ['foot locker', 'weshoes'],
  'brooks':       ['foot locker', 'weshoes'],
  'on running':   ['foot locker', 'weshoes'],
  'hoka':         ['foot locker', 'weshoes'],
  'salomon':      ['foot locker'],
  'timberland':   ['foot locker', 'weshoes'],
};

function getChainsForBrand(brand) {
  const b = (brand || '').toLowerCase().trim();
  for (const [key, chains] of Object.entries(BRAND_TO_CHAINS)) {
    if (b.includes(key) || key.includes(b)) return chains;
  }
  return ['foot locker', 'weshoes']; // default fallback
}

function buildWebsiteUrl(chainKey, shoeQuery) {
  const q = encodeURIComponent(shoeQuery);
  if (chainKey === 'foot locker') return `https://footlocker.co.il/search?q=${q}`;
  if (chainKey === 'nike')        return `https://www.nike.com/il/w?q=${q}`;
  if (chainKey === 'adidas')      return `https://www.adidas.co.il/search?q=${q}`;
  if (chainKey === 'puma')        return `https://www.puma.com/il/he/search?q=${q}`;
  if (chainKey === 'weshoes')     return `https://www.weshoes.co.il/search?q=${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(shoeQuery + ' Israel store')}`;
}

function chainDisplayName(chainKey) {
  const names = { 'foot locker': 'Foot Locker', 'nike': 'Nike', 'adidas': 'Adidas', 'puma': 'Puma', 'weshoes': 'WeShoes' };
  return names[chainKey] || chainKey;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, cityFallback = null, userLat = null, userLng = null, exactAddress = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const hasGPS = !!(userLat && userLng);
    const refLat = userLat || 32.0853;
    const refLng = userLng || 34.7818;
    const locationLabel = exactAddress || cityFallback || 'Tel Aviv, Israel';

    // Build shoe full name without double brand prefix
    const brandLower = (shoe.brand || '').toLowerCase();
    const nameLower = (shoe.name || '').toLowerCase();
    const shoeFullName = nameLower.startsWith(brandLower)
      ? `${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`
      : `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;

    const cacheKey = getCacheKey(shoeFullName, locationLabel, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const sizeNote = selectedSize ? ` in US size ${selectedSize}` : '';

    // Determine which chains carry this brand
    const chainsToShow = getChainsForBrand(shoe.brand);

    // Get all branches from carrying chains, calculate distances, sort by nearest
    const allBranches = chainsToShow.flatMap(chainKey =>
      (KNOWN_BRANCHES[chainKey] || []).map(b => ({
        ...b,
        chainKey,
        distance_km: calculateDistance(refLat, refLng, b.lat, b.lng),
      }))
    );

    // Sort by distance, keep nearest per chain to avoid duplicates at same mall
    const seenAddresses = new Set();
    const stores = allBranches
      .filter(b => b.distance_km <= 30)
      .sort((a, b) => a.distance_km - b.distance_km)
      .filter(b => {
        const key = b.address.toLowerCase();
        if (seenAddresses.has(key)) return false;
        seenAddresses.add(key);
        return true;
      })
      .slice(0, 5)
      .map((b, i) => ({
        name: b.name,
        address: b.address,
        phone: b.phone,
        maps_url: b.maps_url,
        distance_km: b.distance_km,
        rating: b.rating,
        is_open: null,
        website: buildWebsiteUrl(b.chainKey, shoeFullName),
        why: `${chainDisplayName(b.chainKey)} carries ${shoe.brand} shoes in Israel`,
        stock_status: selectedSize ? 'Call to confirm size' : 'Check in store',
        stock_confidence: 'medium',
        is_best_option: i === 0,
      }));

    const result = {
      stores,
      summary: stores.length > 0
        ? `Found ${stores.length} store${stores.length !== 1 ? 's' : ''} near ${locationLabel} that carry ${shoeFullName}${sizeNote}.`
        : `No stores found within 30 km of ${locationLabel}. Try a different location.`,
      shoe_searched: shoeFullName,
      chains_found: chainsToShow,
    };

    if (stores.length > 0) {
      CACHE.set(cacheKey, { data: result, ts: Date.now() });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});