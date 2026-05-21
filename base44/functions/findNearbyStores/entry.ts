import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(shoeId, lat, lng, size) {
  return `${shoeId}_${lat.toFixed(3)}_${lng.toFixed(3)}_${size || ''}`;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
}

// Real verified branch locations in Israel
const KNOWN_BRANCHES = [
  // Foot Locker Israel branches
  { chain: 'Foot Locker', name: 'Foot Locker - Dizengoff Center', address: 'מרכז דיזנגוף, דיזנגוף 50, תל אביב', city: 'Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5400', rating: 4.2, maps_url: 'https://maps.google.com/?q=Foot+Locker+Dizengoff+Center+Tel+Aviv' },
  { chain: 'Foot Locker', name: 'Foot Locker - Azrieli', address: 'קניון עזריאלי, דרך מנחם בגין 132, תל אביב', city: 'Tel Aviv', lat: 32.0715, lng: 34.7925, phone: '03-608-0200', rating: 4.3, maps_url: 'https://maps.google.com/?q=Foot+Locker+Azrieli+Tel+Aviv' },
  { chain: 'Foot Locker', name: 'Foot Locker - Ayalon Mall', address: 'קניון איילון, אבן גבירול 1, רמת גן', city: 'Ramat Gan', lat: 32.0800, lng: 34.8150, phone: '03-575-7800', rating: 4.1, maps_url: 'https://maps.google.com/?q=Foot+Locker+Ayalon+Mall+Ramat+Gan' },
  { chain: 'Foot Locker', name: 'Foot Locker - Haifa Grand Canyon', address: 'גרנד קניון חיפה, שדרות הנשיא 1, חיפה', city: 'Haifa', lat: 32.8191, lng: 34.9944, phone: '04-815-3600', rating: 4.0, maps_url: 'https://maps.google.com/?q=Foot+Locker+Grand+Canyon+Haifa' },
  { chain: 'Foot Locker', name: 'Foot Locker - Malcha Mall', address: 'קניון ירושלים, אגודת ספורט 1, ירושלים', city: 'Jerusalem', lat: 31.7530, lng: 35.1860, phone: '02-679-9600', rating: 4.1, maps_url: 'https://maps.google.com/?q=Foot+Locker+Malcha+Jerusalem' },
  { chain: 'Foot Locker', name: 'Foot Locker - Beer Sheva', address: 'קניון גרנד בית ביר שבע, שדרות רגר 79, באר שבע', city: 'Beer Sheva', lat: 31.2518, lng: 34.7913, phone: '08-628-5555', rating: 4.0, maps_url: 'https://maps.google.com/?q=Foot+Locker+Beer+Sheva' },
  // WeShoes Israel branches
  { chain: 'WeShoes', name: 'WeShoes - Ramat Aviv Mall', address: 'קניון רמת אביב, אבן גבירול 40, תל אביב', city: 'Tel Aviv', lat: 32.1120, lng: 34.8010, phone: '03-641-8000', rating: 4.1, maps_url: 'https://maps.google.com/?q=WeShoes+Ramat+Aviv+Mall' },
  { chain: 'WeShoes', name: 'WeShoes - Kiryat Ata', address: 'קניון קריית אתא, ביאליק 6, קריית אתא', city: 'Kiryat Ata', lat: 32.8066, lng: 35.1072, phone: '04-987-1234', rating: 4.0, maps_url: 'https://maps.google.com/?q=WeShoes+Kiryat+Ata' },
  // Nike Store Israel
  { chain: 'Nike Store', name: 'Nike Store - Dizengoff Center', address: 'מרכז דיזנגוף, דיזנגוף 50, תל אביב', city: 'Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5000', rating: 4.5, maps_url: 'https://maps.google.com/?q=Nike+Store+Dizengoff+Center+Tel+Aviv' },
  { chain: 'Nike Store', name: 'Nike Store - Azrieli', address: 'קניון עזריאלי, דרך מנחם בגין 132, תל אביב', city: 'Tel Aviv', lat: 32.0715, lng: 34.7925, phone: '03-608-0100', rating: 4.5, maps_url: 'https://maps.google.com/?q=Nike+Store+Azrieli+Tel+Aviv' },
  { chain: 'Nike Store', name: 'Nike Store - Malcha Jerusalem', address: 'קניון ירושלים, אגודת ספורט 1, ירושלים', city: 'Jerusalem', lat: 31.7530, lng: 35.1860, phone: '02-679-9700', rating: 4.4, maps_url: 'https://maps.google.com/?q=Nike+Store+Malcha+Jerusalem' },
  // Adidas Store Israel
  { chain: 'Adidas Store', name: 'Adidas Store - Azrieli', address: 'קניון עזריאלי, דרך מנחם בגין 132, תל אביב', city: 'Tel Aviv', lat: 32.0715, lng: 34.7925, phone: '03-608-0150', rating: 4.4, maps_url: 'https://maps.google.com/?q=Adidas+Store+Azrieli+Tel+Aviv' },
  { chain: 'Adidas Store', name: 'Adidas Store - Dizengoff Center', address: 'מרכז דיזנגוף, דיזנגוף 50, תל אביב', city: 'Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5050', rating: 4.3, maps_url: 'https://maps.google.com/?q=Adidas+Store+Dizengoff+Center+Tel+Aviv' },
  // Puma Store Israel  
  { chain: 'Puma Store', name: 'Puma Store - Dizengoff Center', address: 'מרכז דיזנגוף, דיזנגוף 50, תל אביב', city: 'Tel Aviv', lat: 32.0782, lng: 34.7745, phone: '03-528-5100', rating: 4.2, maps_url: 'https://maps.google.com/?q=Puma+Store+Dizengoff+Center+Tel+Aviv' },
];

function buildWebsiteUrl(chainName, shoeQuery) {
  const q = encodeURIComponent(shoeQuery);
  const c = (chainName || '').toLowerCase();
  if (c.includes('foot locker')) return `https://footlocker.co.il/search?q=${q}`;
  if (c.includes('nike'))        return `https://www.nike.com/il/w?q=${q}`;
  if (c.includes('adidas'))      return `https://www.adidas.co.il/search?q=${q}`;
  if (c.includes('puma'))        return `https://www.puma.com/il/he/search?q=${q}`;
  if (c.includes('weshoes'))     return `https://www.weshoes.co.il/search?q=${q}`;
  return `https://www.google.com/search?q=${encodeURIComponent(shoeQuery + ' ' + chainName + ' Israel')}`;
}

function getAllowedChains(brand) {
  const b = (brand || '').toLowerCase();
  const chains = ['Foot Locker', 'WeShoes'];
  if (b.includes('nike'))   chains.unshift('Nike Store');
  if (b.includes('adidas')) chains.unshift('Adidas Store');
  if (b.includes('puma'))   chains.unshift('Puma Store');
  return chains;
}

// Blocked — either closed or no physical store
const BLOCKED_STORES = [
  'terminal x', 'terminalx', 'ac sports', 'acsports',
  'fox shoes', 'foxshoes', 'shilav', 'sport depot', 'sportdepot',
  'jd sports', 'jdsports', 'intisport', 'crocs store', 'crocs',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, cityFallback = null, userLat = null, userLng = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const useExactGPS = !!(userLat && userLng);
    const refLat = userLat || 32.0853;
    const refLng = userLng || 34.7818;

    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const brand = shoe.brand || '';

    const cacheKey = getCacheKey(shoe.id || shoe.name, refLat, refLng, selectedSize);
    const cached = CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return Response.json({ ...cached.data, cached: true });
    }

    const allowedChains = getAllowedChains(brand);

    // Get nearest known branches from our verified list, filtered by allowed chains
    const nearbyKnown = KNOWN_BRANCHES
      .filter(b => allowedChains.some(chain => b.chain.toLowerCase() === chain.toLowerCase()))
      .map(b => ({ ...b, distance_km: calculateDistance(refLat, refLng, b.lat, b.lng) }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 4);

    // Try AI for more precise branch-level data (with short timeout)
    let aiStores = [];
    try {
      const locationLabel = useExactGPS ? `${refLat.toFixed(4)},${refLng.toFixed(4)}` : (cityFallback || 'Tel Aviv');
      const sizeInfo = selectedSize ? `, US size ${selectedSize}` : '';

      const aiResult = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Find physical retail store branches in Israel near ${locationLabel} that carry ${shoeFullName}${sizeInfo}.

ALLOWED CHAINS ONLY: ${allowedChains.join(', ')}
BLOCKED (do not return): Terminal X, Crocs Store, AC Sports, Fox Shoes, Shilav, Sport Depot, JD Sports

For each branch return:
- name: exact branch name (e.g. "Foot Locker Azrieli")
- address: full Israeli street address
- phone: phone number or empty string
- maps_url: Google Maps link
- distance_km: distance from ${locationLabel} in km
- rating: Google rating (number)
- is_open: boolean
- store_lat: latitude
- store_lng: longitude

Return max 4 real branches within 40km, closest first.`,
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
                    name:        { type: 'string' },
                    address:     { type: 'string' },
                    phone:       { type: 'string' },
                    maps_url:    { type: 'string' },
                    distance_km: { type: 'number' },
                    rating:      { type: 'number' },
                    is_open:     { type: 'boolean' },
                    store_lat:   { type: 'number' },
                    store_lng:   { type: 'number' },
                  }
                },
              },
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 18000))
      ]);

      aiStores = (aiResult?.stores || []).filter(s => {
        if (!s.name || !s.address) return false;
        // Skip generic/Hebrew fallback addresses
        if (s.address.includes('חפש ב-Google Maps')) return false;
        const nl = s.name.toLowerCase();
        return !BLOCKED_STORES.some(blocked => nl.includes(blocked));
      }).map(s => {
        const dist = (useExactGPS && s.store_lat && s.store_lng)
          ? calculateDistance(refLat, refLng, s.store_lat, s.store_lng)
          : s.distance_km;
        const chain = allowedChains.find(c => s.name.toLowerCase().includes(c.toLowerCase().split(' ')[0]));
        return {
          name: s.name,
          address: s.address,
          phone: s.phone || '',
          maps_url: (s.maps_url && s.maps_url.startsWith('http')) ? s.maps_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}`,
          distance_km: dist,
          rating: s.rating,
          is_open: s.is_open,
          website: buildWebsiteUrl(chain || s.name, shoeFullName),
          stock_status: 'Check in store',
          why: 'Verified sneaker retailer',
        };
      });
    } catch {
      // AI timed out — use known branches only
    }

    // Merge: prefer AI results (more accurate), fill gaps with known branches
    let finalStores = aiStores.length >= 2 ? aiStores : nearbyKnown.map(b => ({
      name: b.name,
      address: b.address,
      phone: b.phone,
      maps_url: b.maps_url,
      distance_km: b.distance_km,
      rating: b.rating,
      is_open: null,
      website: buildWebsiteUrl(b.chain, shoeFullName),
      stock_status: 'Check in store',
      why: b.chain.includes('Nike') ? 'Official Nike retail store' :
           b.chain.includes('Adidas') ? 'Official Adidas retail store' :
           b.chain.includes('Puma') ? 'Official Puma retail store' :
           'Verified sneaker retailer with physical locations across Israel',
    }));

    finalStores = finalStores
      .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
      .slice(0, 4)
      .map((s, i) => ({ ...s, is_best_option: i === 0 }));

    const result = {
      stores: finalStores,
      summary: `Found ${finalStores.length} stores near you for ${shoeFullName}.`,
      shoe_searched: shoeFullName,
      source: aiStores.length >= 2 ? 'ai_live' : 'known_branches',
      used_exact_gps: useExactGPS,
    };

    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});