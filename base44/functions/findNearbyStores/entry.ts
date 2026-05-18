/**
 * findNearbyStores — Google Maps Places API + Gemini AI inventory reasoning
 * 
 * Flow:
 * 1. Try Google Maps Places Text Search for real nearby stores
 * 2. Fallback: Single Gemini call (web search + ranking combined) for speed
 * 3. Return ranked results with AI confidence scores
 * 
 * Target: < 8 seconds
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCacheKey(shoeId, lat, lon, size, color) {
  const latR = Math.round(lat * 100) / 100;
  const lonR = Math.round(lon * 100) / 100;
  return `${shoeId}_${latR}_${lonR}_${size || ''}_${color || ''}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function textSearchPlaces(lat, lon, query, apiKey, radius = 15000) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lon}&radius=${radius}&key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return data.results || [];
}

async function getPlaceDetails(placeId, apiKey) {
  const fields = 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,url';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  const data = await res.json();
  return data.result || null;
}

async function geocodeCity(city, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  const data = await res.json();
  const loc = data.results?.[0]?.geometry?.location;
  return loc ? { lat: loc.lat, lon: loc.lng } : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      shoe,
      latitude,
      longitude,
      selectedSize = null,
      selectedColor = null,
      radiusKm = 15,
      cityFallback = null,
    } = body;

    if (!shoe) return Response.json({ error: 'Missing shoe data' }, { status: 400 });

    const MAPS_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const shoeFullName = `${shoe.brand} ${shoe.name}${shoe.colorway ? ' ' + shoe.colorway : ''}`;
    const sizeInfo = selectedSize ? `US size ${selectedSize}` : '';

    // Resolve coordinates
    let finalLat = latitude;
    let finalLon = longitude;
    if ((!finalLat || !finalLon) && cityFallback && MAPS_KEY) {
      const coords = await geocodeCity(cityFallback, MAPS_KEY).catch(() => null);
      if (coords) { finalLat = coords.lat; finalLon = coords.lon; }
    }

    // Cache check
    if (finalLat && finalLon) {
      const cacheKey = getCacheKey(shoe.id || shoe.name, finalLat, finalLon, selectedSize, selectedColor);
      const cached = CACHE.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return Response.json({ ...cached.data, cached: true });
      }
    }

    const radiusMeters = radiusKm * 1000;
    let storeList = [];
    let mapsWorked = false;

    // ── Strategy 1: Google Maps Places API ──────────────────────────────
    if (MAPS_KEY && finalLat && finalLon) {
      try {
        const [r1, r2] = await Promise.all([
          textSearchPlaces(finalLat, finalLon, `${shoe.brand} shoe store`, MAPS_KEY, radiusMeters),
          textSearchPlaces(finalLat, finalLon, 'sneaker store', MAPS_KEY, radiusMeters),
        ]);

        const seenIds = new Set();
        const allPlaces = [];
        for (const place of [...r1, ...r2]) {
          if (!seenIds.has(place.place_id)) {
            seenIds.add(place.place_id);
            allPlaces.push(place);
          }
        }

        if (allPlaces.length > 0) {
          mapsWorked = true;
          const placesWithDist = allPlaces
            .filter(p => p.geometry?.location)
            .map(p => ({
              ...p,
              distanceKm: haversineKm(finalLat, finalLon, p.geometry.location.lat, p.geometry.location.lng),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 8);

          const details = await Promise.all(
            placesWithDist.slice(0, 6).map(p => getPlaceDetails(p.place_id, MAPS_KEY).catch(() => null))
          );

          storeList = placesWithDist.slice(0, 6).map((place, i) => {
            const d = details[i];
            return {
              name: place.name,
              address: d?.formatted_address || place.formatted_address || place.vicinity || '',
              phone: d?.formatted_phone_number || '',
              website: d?.website || '',
              maps_url: d?.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
              distanceKm: Math.round(place.distanceKm * 10) / 10,
              rating: d?.rating || place.rating || null,
              is_open: d?.opening_hours?.open_now ?? null,
              types: place.types || [],
            };
          });
        }
      } catch (_) { /* Maps API unavailable, fall through */ }
    }

    // ── Strategy 2: Single combined Gemini call (find + rank together) ──
    if (storeList.length === 0) {
      const city = cityFallback || 'the user\'s location';

      const combinedPrompt = `Find 4-6 real sneaker stores near ${city} that carry ${shoe.brand} shoes (specifically ${shoeFullName}).${sizeInfo ? ` Size: ${sizeInfo}.` : ''}

Include official ${shoe.brand} stores, Foot Locker, JD Sports, and local sneaker shops.
For each store: name, address (${city}), phone, maps_url (Google Maps search link), distance_km from city center, rating, stock_confidence (high/medium/low), stock_status, why (one sentence), include=true.

Real stores only. Be concise.`;

      const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: combinedPrompt,
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
                  stock_status:     { type: 'string' },
                  why:              { type: 'string' },
                  include:          { type: 'boolean' },
                }
              }
            },
            summary: { type: 'string' },
          }
        }
      });

      const finalStores = (aiResult.stores || [])
        .filter(s => s.include !== false && s.name && s.address)
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          const diff = (order[a.stock_confidence] ?? 1) - (order[b.stock_confidence] ?? 1);
          if (diff !== 0) return diff;
          return (a.distance_km ?? 999) - (b.distance_km ?? 999);
        })
        .slice(0, 6)
        .map((s, i) => ({
          ...s,
          maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(s.name + ' ' + s.address)}`,
          is_best_option: i === 0,
        }));

      const result = {
        stores: finalStores,
        summary: aiResult.summary || `Found ${finalStores.length} stores near ${city} for ${shoeFullName}.`,
        shoe_searched: shoeFullName,
        source: 'gemini_web',
      };

      if (finalLat && finalLon) {
        const cacheKey = getCacheKey(shoe.id || shoe.name, finalLat, finalLon, selectedSize, selectedColor);
        CACHE.set(cacheKey, { data: result, ts: Date.now() });
      }

      return Response.json(result);
    }

    // ── Gemini ranking of Google Maps results ────────────────────────────
    const rankPrompt = `Sneaker inventory expert. Rank these nearby stores for likelihood of carrying: ${shoeFullName}
${sizeInfo ? `Size needed: ${sizeInfo}` : ''}

STORES:
${storeList.map((s, i) => `${i}. "${s.name}" | ${s.address} | ${s.distanceKm}km | Rating: ${s.rating || 'N/A'}`).join('\n')}

For each store:
- stock_confidence: "high"=official ${shoe.brand}/major chain, "medium"=general sneaker store, "low"=unlikely
- stock_status: "Likely in stock" / "Possibly in stock" / "Call to confirm"
- why: one sentence
- include: true/false (exclude non-shoe stores)

Max 6 stores with include=true.`;

    const rankResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: rankPrompt,
      model: 'gemini_3_flash',
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          stores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index:            { type: 'number' },
                stock_confidence: { type: 'string' },
                stock_status:     { type: 'string' },
                why:              { type: 'string' },
                include:          { type: 'boolean' },
              }
            }
          },
          summary: { type: 'string' },
        }
      }
    });

    const finalStores = (rankResult.stores || [])
      .filter(ai => ai.include !== false)
      .map(ai => {
        const store = storeList[ai.index ?? 0] || storeList[0];
        return {
          name: store.name,
          address: store.address,
          phone: store.phone || '',
          website: store.website || '',
          maps_url: store.maps_url,
          distance_km: store.distanceKm ?? null,
          rating: store.rating || null,
          is_open: store.is_open ?? null,
          stock_status: ai.stock_status || 'Call to confirm',
          stock_confidence: ai.stock_confidence || 'medium',
          why: ai.why || '',
          is_best_option: false,
        };
      })
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        const diff = (order[a.stock_confidence] ?? 1) - (order[b.stock_confidence] ?? 1);
        if (diff !== 0) return diff;
        return (a.distance_km ?? 999) - (b.distance_km ?? 999);
      })
      .slice(0, 6);

    if (finalStores.length > 0) finalStores[0].is_best_option = true;

    const result = {
      stores: finalStores,
      summary: rankResult.summary || `Found ${finalStores.length} stores near you carrying ${shoe.brand} shoes.`,
      shoe_searched: shoeFullName,
      source: 'google_maps',
    };

    if (finalLat && finalLon) {
      const cacheKey = getCacheKey(shoe.id || shoe.name, finalLat, finalLon, selectedSize, selectedColor);
      CACHE.set(cacheKey, { data: result, ts: Date.now() });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});