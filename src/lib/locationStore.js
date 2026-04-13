// Simple location state management
let locationState = {
  city: "New York",
  lat: 40.7128,
  lng: -74.006,
  detected: false,
  listeners: new Set(),
};

export function getLocation() {
  return { city: locationState.city, lat: locationState.lat, lng: locationState.lng, detected: locationState.detected };
}

export function setLocation(city, lat, lng) {
  locationState.city = city;
  locationState.lat = lat;
  locationState.lng = lng;
  locationState.detected = true;
  locationState.listeners.forEach((fn) => fn(getLocation()));
}

export function subscribeLocation(fn) {
  locationState.listeners.add(fn);
  return () => locationState.listeners.delete(fn);
}

export function detectLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getLocation());
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          const city =
            data.address?.city || data.address?.town || data.address?.village || "Unknown";
          setLocation(city, latitude, longitude);
        } catch {
          setLocation("New York", latitude, longitude);
        }
        resolve(getLocation());
      },
      () => {
        resolve(getLocation());
      },
      { timeout: 5000 }
    );
  });
}