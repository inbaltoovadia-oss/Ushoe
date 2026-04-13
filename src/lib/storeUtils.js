// Haversine distance in miles between two lat/lng points
export function getDistanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Sort stores by distance from user location, attach .distance field
export function sortStoresByLocation(stores, userLat, userLng) {
  return stores
    .map((store) => ({
      ...store,
      distance:
        store.latitude && store.longitude
          ? getDistanceMiles(userLat, userLng, store.latitude, store.longitude)
          : null,
    }))
    .sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
}