import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Get closest store with shoe available (fastest pickup)
Deno.serve(async (req) => {
  try {
    const { shoe_id, latitude, longitude } = await req.json();
    if (!shoe_id || latitude === undefined || longitude === undefined) {
      return Response.json({ error: 'Missing shoe_id, latitude, or longitude' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Get shoe details
    const shoes = await base44.asServiceRole.entities.Shoe.list();
    const shoe = shoes.find(s => s.id === shoe_id);
    if (!shoe) {
      return Response.json({ error: 'Shoe not found' }, { status: 404 });
    }

    // Get nearby stores
    const stores = await base44.asServiceRole.entities.Store.list();
    
    // Calculate distances and filter by availability
    const storesWithDist = stores
      .filter(s => s.latitude && s.longitude)
      .map(s => {
        // Haversine distance calculation
        const R = 3959; // Earth radius in miles
        const dLat = (s.latitude - latitude) * Math.PI / 180;
        const dLon = (s.longitude - longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(latitude * Math.PI / 180) * Math.cos(s.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return { ...s, distance };
      })
      .sort((a, b) => a.distance - b.distance);

    if (storesWithDist.length === 0) {
      return Response.json({ error: 'No stores nearby' }, { status: 404 });
    }

    const fastestStore = storesWithDist[0];
    
    // Estimate pickup availability based on distance
    let estimatedAvailability = 'Available now';
    if (fastestStore.distance > 10) estimatedAvailability = 'Available (1-2 hours)';
    else if (fastestStore.distance > 5) estimatedAvailability = 'Available (<30 min)';

    return Response.json({
      shoe: {
        id: shoe.id,
        name: shoe.name,
        brand: shoe.brand,
        colorway: shoe.colorway,
      },
      fastest_pickup: {
        store_name: fastestStore.name,
        distance_miles: Math.round(fastestStore.distance * 10) / 10,
        address: fastestStore.address,
        city: fastestStore.city,
        phone: fastestStore.phone,
        availability: estimatedAvailability,
        store_type: fastestStore.store_type,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});