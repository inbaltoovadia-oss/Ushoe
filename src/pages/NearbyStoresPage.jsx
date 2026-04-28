import { useState, lazy, Suspense } from "react";
import { MapPin, Search, Loader2, Star, Navigation, Globe, CheckCircle, AlertTriangle, XCircle, List, Map } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import LocationButton from "../components/LocationButton";
import { useEffect } from "react";

const StoreMap = lazy(() => import("../components/StoreMap"));

const BRAND_COLORS = {
  "Nike": "bg-black text-white",
  "Adidas": "bg-blue-800 text-white",
  "Foot Locker": "bg-red-600 text-white",
  "Finish Line": "bg-blue-700 text-white",
  "DICK'S Sporting Goods": "bg-green-700 text-white",
  "JD Sports": "bg-yellow-400 text-black",
  "Shoe Carnival": "bg-orange-500 text-white",
  "DSW": "bg-purple-600 text-white",
  "New Balance": "bg-gray-700 text-white",
  "Skechers": "bg-blue-600 text-white",
  "Vans": "bg-red-700 text-white",
  "Converse": "bg-red-500 text-white",
  "Puma": "bg-zinc-800 text-white",
  "Reebok": "bg-red-800 text-white",
};

const STOCK_CONFIG = {
  "In Stock":     { icon: CheckCircle,   color: "text-green-300 bg-green-950/40 border border-green-700/50",  label: "High Stock" },
  "Low Stock":    { icon: AlertTriangle, color: "text-amber-400 bg-amber-950/40 border border-amber-800/40",  label: "Low Stock" },
  "Out of Stock": { icon: XCircle,       color: "text-red-400 bg-red-950/40 border border-red-800/40",        label: "Out of Stock" },
};

function getDirectionsUrl(store) {
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  if (store.latitude && store.longitude) {
    return isApple
      ? `https://maps.apple.com/?daddr=${store.latitude},${store.longitude}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}&travelmode=driving`;
  }
  const dest = encodeURIComponent(`${store.name}, ${store.address}`);
  return isApple
    ? `https://maps.apple.com/?daddr=${dest}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

// Haversine formula — returns straight-line distance in miles
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode a free-text location to lat/lng using Nominatim
async function geocodeLocation(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Geocode a store address to get its real lat/lng
async function geocodeStoreAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function NearbyStoresPage() {
  const [locationInput, setLocationInput] = useState(getLocation().city !== "New York" ? getLocation().city : "");

  // Auto-fill from stored location
  useEffect(() => {
    return subscribeLocation(loc => {
      if (loc.detected && loc.city) setLocationInput(loc.city);
    });
  }, []);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedCity, setSearchedCity] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // "list" | "map"
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(null);

  const searchStores = async () => {
    const query = locationInput.trim();
    if (!query) return;
    setLoading(true);
    setHasSearched(true);
    setStores([]);
    setAiSummary("");
    setSearchedCity(query);
    setUserCoords(null);
    setSelectedStoreIndex(null);

    // Geocode user location + AI search in parallel
    const [res, coords] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a shoe store locator AI. The user entered this location: "${query}".

Search for real, physical shoe retail stores of ANY kind within a 25-mile radius of that location. Include all types: major chains (Nike, Adidas, Foot Locker, DSW, JD Sports, Finish Line, DICK'S Sporting Goods, Shoe Carnival, New Balance, Skechers, Vans, Converse, Puma, Reebok), independent shoe stores, boutique sneaker shops, department stores with shoe departments, outlet stores, and any other physical store that primarily sells shoes or has a significant shoe section.

CRITICAL: Each store MUST have a unique, accurate latitude and longitude. Do NOT return the same coordinates for multiple stores. Use the store's actual physical GPS location.

For each store provide:
- name: official store name
- brand: the chain name or "Independent" for standalone stores
- address: full street address including city and state/country
- latitude: precise GPS latitude of THIS specific store location
- longitude: precise GPS longitude of THIS specific store location
- rating: number 1-5 based on real reviews if available
- phone: real, dialable phone number
- website: store or brand website URL if available
- stock_status: one of "In Stock", "Low Stock", or "Out of Stock"
- hours_today: store hours for today

Return up to 10 stores. If none exist within 25 miles, return an empty stores array.
Also return a short 1-sentence summary about the shoe store scene in that area.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            stores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name:         { type: "string" },
                  brand:        { type: "string" },
                  address:      { type: "string" },
                  latitude:     { type: "number" },
                  longitude:    { type: "number" },
                  rating:       { type: "number" },
                  phone:        { type: "string" },
                  website:      { type: "string" },
                  stock_status: { type: "string" },
                  hours_today:  { type: "string" },
                },
              },
            },
          },
        },
      }),
      geocodeLocation(query),
    ]);

    const userCoordinates = coords;
    if (userCoordinates) setUserCoords(userCoordinates);

    const aiStores = res.stores || [];

    // For each store: if AI gave coords that are clearly wrong (same as user or missing),
    // geocode the address via Nominatim to get real coordinates.
    // We stagger requests slightly to be polite to Nominatim's rate limit.
    const storesWithCoords = await Promise.all(
      aiStores.map(async (store, i) => {
        let lat = store.latitude;
        let lng = store.longitude;

        // Detect if AI coords look wrong: same as user, or missing
        const sameAsUser = userCoordinates &&
          Math.abs(lat - userCoordinates.lat) < 0.001 &&
          Math.abs(lng - userCoordinates.lng) < 0.001;

        if (!lat || !lng || sameAsUser) {
          // Add small delay to avoid Nominatim rate limiting
          await new Promise(r => setTimeout(r, i * 200));
          const geocoded = await geocodeStoreAddress(store.address);
          if (geocoded) { lat = geocoded.lat; lng = geocoded.lng; }
        }

        const distance = userCoordinates && lat && lng
          ? haversineDistance(userCoordinates.lat, userCoordinates.lng, lat, lng)
          : null;

        return { ...store, latitude: lat, longitude: lng, distance_miles: distance };
      })
    );

    const sorted = storesWithCoords
      .filter(s => s.distance_miles == null || s.distance_miles <= 30)
      .sort((a, b) => (a.distance_miles ?? 99) - (b.distance_miles ?? 99));

    setStores(sorted);
    setAiSummary(res.summary || "");
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl">Store Finder</h1>
          </div>
          <p className="text-muted-foreground text-sm">Find any shoe store — chains, boutiques, outlets, and more — within 25 miles of you</p>
          <div className="mt-3">
            <LocationButton onLocationSet={loc => setLocationInput(loc.city)} />
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <form onSubmit={e => { e.preventDefault(); searchStores(); }} className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center flex-1 bg-card border-2 border-border rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-lg">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <input
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                placeholder="City, zip code, or address…"
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50"
              />
              {locationInput && (
                <button type="button" onClick={() => setLocationInput("")} className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">×</button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !locationInput.trim()}
              className="flex items-center justify-center gap-2 bg-primary text-white px-7 py-3.5 rounded-2xl text-base font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25 min-h-[52px] min-w-[160px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? "Searching…" : "Find Stores"}
            </button>
          </form>
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Searching for shoe stores near "{searchedCity}" and calculating real distances…
              </div>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-36 bg-card border border-border animate-pulse rounded-2xl" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {!loading && hasSearched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {aiSummary && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-4 mb-5">
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{aiSummary}</p>
              </div>
            )}

            {stores.length === 0 ? (
              <div className="text-center py-20 bg-card border border-border rounded-2xl">
                <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg">No stores found nearby</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">Try a different location or expand your search.</p>
              </div>
            ) : (
              <>
                {/* Results header + view toggle */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {stores.length} store{stores.length !== 1 ? "s" : ""} found near <span className="font-medium text-foreground">{searchedCity}</span>
                    {userCoords && <span className="text-green-600 ml-1 text-xs">· distances calculated accurately</span>}
                  </p>
                  {/* List / Map toggle */}
                  <div className="flex bg-secondary rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "list" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="w-3.5 h-3.5" /> List
                    </button>
                    <button
                      onClick={() => setViewMode("map")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === "map" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Map className="w-3.5 h-3.5" /> Map
                    </button>
                  </div>
                </div>

                {/* Map View */}
                {viewMode === "map" && (
                  <div className="mb-6">
                    <Suspense fallback={<div className="h-[520px] bg-card border border-border rounded-2xl animate-pulse flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading map…</div>}>
                      <StoreMap
                        stores={stores}
                        userCoords={userCoords}
                        selectedIndex={selectedStoreIndex}
                        onSelectStore={setSelectedStoreIndex}
                      />
                    </Suspense>
                    {selectedStoreIndex != null && stores[selectedStoreIndex] && (
                      <motion.div
                        key={selectedStoreIndex}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 bg-card border border-primary/30 rounded-2xl p-4 flex items-start justify-between gap-4 flex-wrap"
                      >
                        <div>
                          <p className="font-heading font-bold text-sm">{stores[selectedStoreIndex].name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{stores[selectedStoreIndex].address}</p>

                        </div>
                        <a
                          href={getDirectionsUrl(stores[selectedStoreIndex])}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Directions
                        </a>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-4">
                    {stores.map((store, i) => {
                      const brandColor = BRAND_COLORS[store.brand] || "bg-secondary text-foreground";
                      const stock = STOCK_CONFIG[store.stock_status] || STOCK_CONFIG["In Stock"];
                      const StockIcon = stock.icon;

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-heading font-bold text-base">{store.name}</h3>
                                {store.brand && (
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${brandColor}`}>{store.brand}</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {store.address}
                              </p>
                              {store.hours_today && (
                                <p className="text-xs text-muted-foreground mt-1 ml-5">{store.hours_today}</p>
                              )}
                              <div className="flex items-center gap-3 mt-3 flex-wrap">
  
                                {store.rating && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    {store.rating.toFixed(1)}
                                  </span>
                                )}
                                <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${stock.color}`}>
                                  <StockIcon className="w-3 h-3" />
                                  {stock.label}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <a
                                href={getDirectionsUrl(store)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                Get Directions
                              </a>
                              {store.website && (
                                <a
                                  href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1 text-xs px-3 py-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                                >
                                  <Globe className="w-3.5 h-3.5" /> Website
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Pre-search empty state */}
        {!loading && !hasSearched && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-xl mb-2">Find Shoe Stores Near You</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Enter your city, zip code, or address above to find shoe stores within 25 miles — with an interactive map view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}