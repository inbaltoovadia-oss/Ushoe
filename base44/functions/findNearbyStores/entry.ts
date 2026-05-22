import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

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
    const colorStr = selectedColor ? `, ${selectedColor} colorway` : (shoe.colorway ? `, ${shoe.colorway}` : '');
    const locationContext = refLat && refLng
      ? `GPS coordinates: ${refLat}, ${refLng} (${locationLabel})`
      : `Location: ${locationLabel}`;

    // STEP 1-3: Use Google Maps (via AI web search) to discover nearby shoe stores
    const discoveryPrompt = `You are a shoe store locator. Use Google Maps and real web data to find physical shoe stores near this location:
${locationContext}

Search for: "shoe stores", "sneaker stores", "athletic footwear stores", "sneaker boutiques" near this location.

Find up to 10 real, physical shoe stores within 25km. Include:
- Chain stores (Nike, Adidas, Foot Locker, JD Sports, WeShoes, etc.)
- Independent sneaker shops
- Mall shoe stores
- Boutique sneaker retailers

For EACH store provide:
- name: exact store name with branch identifier
- address: full street address
- latitude: exact GPS lat of THIS branch
- longitude: exact GPS lng of THIS branch  
- phone: real phone number
- website: store website URL
- google_maps_url: Google Maps link for this specific branch
- hours_today: today's opening hours if available
- rating: Google Maps rating (1-5)

CRITICAL: Use REAL GPS coordinates for each specific branch. Do NOT use the same coordinates for multiple stores.`;

    const discoveryResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: discoveryPrompt,
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
                name:            { type: 'string' },
                address:         { type: 'string' },
                latitude:        { type: 'number' },
                longitude:       { type: 'number' },
                phone:           { type: 'string' },
                website:         { type: 'string' },
                google_maps_url: { type: 'string' },
                hours_today:     { type: 'string' },
                rating:          { type: 'number' },
              }
            }
          }
        }
      }
    });

    const rawStores = (discoveryResult?.stores || []).filter(s => s.name && s.address);
    if (rawStores.length === 0) {
      return Response.json({
        stores: [],
        summary: `No shoe stores found near ${locationLabel}. Try a different location.`,
        shoe_searched: shoeFullName,
      });
    }

    // Add distance calculations
    const storesWithDistance = rawStores.map(s => ({
      ...s,
      distance_km: (refLat && refLng && s.latitude && s.longitude)
        ? calcDistance(refLat, refLng, s.latitude, s.longitude)
        : null,
    })).filter(s => !s.distance_km || s.distance_km <= 30)
      .sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99))
      .slice(0, 8);

    // STEP 4-7: Ask Gemini to check ALL stores in a SINGLE call (much faster than N parallel calls)
    const storeListForCheck = storesWithDistance.map((s, i) =>
      `${i + 1}. ${s.name} — ${s.address}${s.website ? ` (website: ${s.website})` : ''}`
    ).join('\n');

    const bulkStockResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert shoe inventory checker. For each store below, determine if they carry the shoe "${shoeFullName}"${sizeStr}${colorStr}.

Stores to check:
${storeListForCheck}

For EACH store, visit their website or use web search to determine:
- carries_brand: does this store stock the ${shoe.brand} brand at all?
- model_found: is this specific model (${shoeFullName}) listed on their site?
- in_stock: is it actually available to buy?
- price: current price in local currency if found
- product_url: direct URL to the product page (not a search page)
- stock_confidence: "high" (found on site), "medium" (brand carried, model likely), "low" (unsure)
- stock_status: short status string (e.g. "In stock", "Call to confirm", "Check in store")
- reasoning: one-line explanation

IMPORTANT: WeShoes does NOT sell Nike, Adidas, Jordan, Under Armour or Puma. If the brand is one of those and the store is WeShoes, set carries_brand: false.

Return results as an array "store_results" with one object per store in the same order.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          store_results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                carries_brand:    { type: 'boolean' },
                model_found:      { type: 'boolean' },
                in_stock:         { type: 'boolean' },
                price:            { type: 'string' },
                product_url:      { type: 'string' },
                stock_confidence: { type: 'string' },
                stock_status:     { type: 'string' },
                reasoning:        { type: 'string' },
              }
            }
          }
        }
      }
    }).catch(() => null);

    const stockResults = bulkStockResult?.store_results || [];

    // STEP 6: Filter and build final store list
    const finalStores = [];
    for (let i = 0; i < storesWithDistance.length; i++) {
      const store = storesWithDistance[i];
      const stock = stockResults[i];

      // Skip if store confirmed it doesn't carry the brand
      if (stock && stock.carries_brand === false) continue;

      // Build website link: prefer direct product URL, else store search URL
      let websiteUrl = store.website || null;
      if (stock?.product_url && stock.product_url.startsWith('http') && !stock.product_url.includes('google.com')) {
        websiteUrl = stock.product_url;
      } else if (store.website) {
        // Build search URL on the store's website
        const q = encodeURIComponent(shoeFullName);
        if (store.website.includes('footlocker.co.il')) websiteUrl = `https://footlocker.co.il/search?q=${q}`;
        else if (store.website.includes('weshoes')) websiteUrl = `https://www.weshoes.co.il/search?q=${q}`;
        else if (store.website.includes('nike.com')) websiteUrl = `https://www.nike.com/il/w?q=${q}`;
        else if (store.website.includes('adidas')) websiteUrl = `https://www.adidas.co.il/search?q=${q}`;
        else websiteUrl = store.website;
      }

      const confidence = stock?.stock_confidence || 'medium';
      const stockStatus = stock?.in_stock === true
        ? (stock.size_available === false ? 'Size may vary' : 'Check in store')
        : (stock?.stock_status || 'Call to confirm');

      finalStores.push({
        name: store.name,
        address: store.address,
        phone: store.phone || null,
        maps_url: store.google_maps_url || (store.latitude && store.longitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`
          : `https://www.google.com/maps/search/${encodeURIComponent(store.name + ' ' + store.address)}`),
        distance_km: store.distance_km,
        rating: store.rating || null,
        is_open: null,
        hours_today: store.hours_today || null,
        website: websiteUrl,
        price: stock?.price || null,
        why: stock?.reasoning || `${store.name} may carry ${shoeFullName}`,
        stock_status: stockStatus,
        stock_confidence: confidence,
        local_pickup: stock?.local_pickup !== false,
        is_best_option: finalStores.length === 0,
      });

      if (finalStores.length >= 6) break;
    }

    const result = {
      stores: finalStores,
      summary: finalStores.length > 0
        ? `Found ${finalStores.length} store${finalStores.length !== 1 ? 's' : ''} near ${locationLabel} that may carry ${shoeFullName}${sizeStr}.`
        : `No stores found carrying ${shoeFullName} near ${locationLabel}. Try a different location.`,
      shoe_searched: shoeFullName,
    };

    if (finalStores.length > 0) {
      CACHE.set(cacheKey, { data: result, ts: Date.now() });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});