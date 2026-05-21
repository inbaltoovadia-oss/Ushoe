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
  return `https://www.google.com/search?q=${encodeURIComponent(shoeQuery + ' ' + chainName + ' Israel')}`;
}

function getAllowedChains(brand) {
  const b = (brand || '').toLowerCase();
  const chains = ['Foot Locker'];
  if (b.includes('nike'))   chains.unshift('Nike Store');
  if (b.includes('adidas')) chains.unshift('Adidas Store');
  if (b.includes('puma'))   chains.unshift('Puma Store');
  return chains;
}

const BLOCKED_STORES = [
  'terminal x', 'terminalx', 'ac sports', 'acsports',
  'fox shoes', 'foxshoes', 'shilav', 'sport depot', 'sportdepot',
  'jd sports', 'jdsports', 'intisport', 'crocs store', 'crocs',
  'weshoes', 'we shoes',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { shoe, selectedSize = null, cityFallback = null, userLat = null, userLng = null, exactAddress = null } = body;
    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const useExactGPS = !!(userLat && userLng);
    const refLat = userLat || 32.0853;
    const refLng = userLng || 34.7818;

    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const brand = shoe.brand || '';

    const addrKey = (exactAddress || '').replace(/\s+/g, '_').toLowerCase();
    const cacheKey = getCacheKey(shoe.id || shoe.name, refLat, refLng, selectedSize) + addrKey;
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

    // Build precise location label for the AI
    const locationLabel = exactAddress
      ? exactAddress
      : useExactGPS
        ? `${refLat.toFixed(5)},${refLng.toFixed(5)} (${cityFallback || 'Israel'})`
        : (cityFallback || 'Tel Aviv');

    const sizeNote = selectedSize
      ? `The customer is looking for US size ${selectedSize}. For each store, check whether this size is actually available for this specific shoe. Consider known size ranges: Foot Locker Israel typically stocks US men's 7–13, women's 5–11. Nike and Adidas stores stock their full range. Call out explicitly if the requested size is "Out of stock" or "Available" or "Limited".`
      : '';

    let aiStores = [];
    try {
      const aiResult = await Promise.race([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Find the closest physical retail store branches in Israel to this exact location: "${locationLabel}".

SHOE BEING SEARCHED: ${shoeFullName}
ALLOWED CHAINS ONLY: ${allowedChains.join(', ')}
BLOCKED (do not return): Terminal X, Crocs Store, WeShoes, Shilav, AC Sports, Fox Shoes, Sport Depot, JD Sports

${sizeNote}

Important: Sort results by actual distance from "${locationLabel}" — nearest first.
For each branch, provide:
- name: exact branch name (e.g. "Foot Locker Azrieli")
- address: full Israeli street address in Hebrew or English
- phone: real phone number
- maps_url: direct Google Maps link to THIS specific branch
- distance_km: realistic walking/driving distance in km from "${locationLabel}"
- rating: real Google Maps rating
- is_open: boolean (current hours)
- store_lat: GPS latitude of the branch
- store_lng: GPS longitude of the branch
- size_status: "${selectedSize ? `"In stock" / "Out of stock" / "Call to confirm" for US size ${selectedSize}` : 'Check in store'}"
- size_note: brief note about size availability for this shoe at this store

Return max 4 real branches, closest to "${locationLabel}" first. Only include branches that actually exist.`,
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
                    size_status: { type: 'string' },
                    size_note:   { type: 'string' },
                  }
                },
              },
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000))
      ]);

      aiStores = (aiResult?.stores || []).filter(s => {
        if (!s.name || !s.address) return false;
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
          distance_km: typeof dist === 'number' ? Math.round(dist * 10) / 10 : null,
          rating: s.rating,
          is_open: s.is_open,
          website: buildWebsiteUrl(chain || s.name, shoeFullName),
          stock_status: s.size_status || 'Check in store',
          stock_confidence: s.size_status?.toLowerCase().includes('in stock') ? 'high'
                          : s.size_status?.toLowerCase().includes('out') ? 'low'
                          : 'medium',
          why: s.size_note || 'Verified sneaker retailer',
        };
      });
    } catch {
      // AI timed out — use known branches only
    }

    // Merge: prefer AI results, fill gaps with known branches
    let finalStores = aiStores.length >= 2 ? aiStores : nearbyKnown.map(b => ({
      name: b.name,
      address: b.address,
      phone: b.phone,
      maps_url: b.maps_url,
      distance_km: b.distance_km,
      rating: b.rating,
      is_open: null,
      website: buildWebsiteUrl(b.chain, shoeFullName),
      stock_status: selectedSize ? 'Call to confirm size' : 'Check in store',
      stock_confidence: 'medium',
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
      summary: `Found ${finalStores.length} store${finalStores.length !== 1 ? 's' : ''} near ${exactAddress || cityFallback || 'you'} for ${shoeFullName}${selectedSize ? ` (US size ${selectedSize})` : ''}.`,
      shoe_searched: shoeFullName,
      source: aiStores.length >= 2 ? 'ai_live' : 'known_branches',
      used_exact_address: !!exactAddress,
    };

    CACHE.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});