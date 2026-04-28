// Enhanced location state management with permission tracking + reverse geocode
const STORAGE_KEY = "ushoe_location_v1";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const persisted = loadPersisted();

let locationState = {
  city: persisted?.city || "New York",
  country: persisted?.country || "United States",
  countryCode: persisted?.countryCode || "US",
  lat: persisted?.lat || 40.7128,
  lng: persisted?.lng || -74.006,
  detected: persisted?.detected || false,
  permission: "unknown", // "unknown" | "granted" | "denied" | "unavailable"
  loading: false,
  listeners: new Set(),
};

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      city: locationState.city,
      country: locationState.country,
      countryCode: locationState.countryCode,
      lat: locationState.lat,
      lng: locationState.lng,
      detected: locationState.detected,
    }));
  } catch {}
}

function notify() {
  locationState.listeners.forEach((fn) => fn(getLocation()));
}

export function getLocation() {
  return {
    city: locationState.city,
    country: locationState.country,
    countryCode: locationState.countryCode,
    lat: locationState.lat,
    lng: locationState.lng,
    detected: locationState.detected,
    permission: locationState.permission,
    loading: locationState.loading,
  };
}

export function setLocation(city, lat, lng, country = "", countryCode = "") {
  locationState.city = city;
  locationState.lat = lat;
  locationState.lng = lng;
  locationState.country = country || locationState.country;
  locationState.countryCode = countryCode || locationState.countryCode;
  locationState.detected = true;
  locationState.loading = false;
  locationState.permission = "granted";
  persist();
  notify();
}

export function subscribeLocation(fn) {
  locationState.listeners.add(fn);
  return () => locationState.listeners.delete(fn);
}

/**
 * detectLocation — silently tries geolocation (no prompt).
 * Only called at startup if permission was already granted.
 */
export function detectLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      locationState.permission = "unavailable";
      notify();
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
          const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
          const country = data.address?.country || "";
          const countryCode = (data.address?.country_code || "").toUpperCase();
          setLocation(city, latitude, longitude, country, countryCode);
        } catch {
          setLocation("New York", latitude, longitude, "United States", "US");
        }
        resolve(getLocation());
      },
      () => resolve(getLocation()),
      { timeout: 5000, maximumAge: 300000 } // accept 5-min-old position
    );
  });
}

/**
 * requestLocation — user-triggered. Shows browser prompt, tracks state.
 */
export async function requestLocation() {
  if (!navigator.geolocation) {
    locationState.permission = "unavailable";
    notify();
    return getLocation();
  }

  locationState.loading = true;
  notify();

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "Unknown";
          const country = data.address?.country || "";
          const countryCode = (data.address?.country_code || "").toUpperCase();
          setLocation(city, latitude, longitude, country, countryCode);
        } catch {
          setLocation("New York", latitude, longitude, "United States", "US");
        }
        resolve(getLocation());
      },
      (err) => {
        locationState.loading = false;
        locationState.permission = err.code === 1 ? "denied" : "unavailable";
        notify();
        resolve(getLocation());
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}