import { useState, useEffect } from "react";
import { MapPin, Loader2, Navigation, Star, Phone, ExternalLink, RefreshCw, AlertTriangle, Search, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getLocation, setLocation, detectLocation } from "../lib/locationStore";

const STOCK_COLORS = {
  "In stock": "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200",
  "Limited stock": "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200",
  "Out of stock": "text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200",
};

export default function NearbyStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [location, setLocationState] = useState(getLocation());
  const [cityInput, setCityInput] = useState("");
  const [shoeQuery, setShoeQuery] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [dataAge, setDataAge] = useState(null);
  const [liveDataAvailable, setLiveDataAvailable] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const handleDetectLocation = async () => {
    setLocating(true);
    await detectLocation();
    const loc = getLocation();
    setLocationState(loc);
    setCityInput(loc.city);
    setLocating(false);
    fetchStores(loc, shoeQuery);
  };

  const handleCitySearch = (e) => {
    e.preventDefault();
    if (!cityInput.trim()) return;
    const loc = { city: cityInput.trim(), lat: 0, lng: 0 };
    setLocationState(loc);
    setLocation(loc);
    fetchStores(loc, shoeQuery);
  };

  const fetchStores = async (loc, query) => {
    setLoading(true);
    setAiSummary("");
    setStores([]);
    const searchTarget = query || "sneakers";
    const now = Date.now();

    try {
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real-time shoe store locator. Search the web RIGHT NOW for physical shoe stores near "${loc.city}" that carry "${searchTarget}".

LIVE DATA REQUIREMENTS:
- Search Google Maps, Yelp, and store locators for real stores in ${loc.city}
- Check actual stock availability on retailer websites where possible
- Use only real store names and real addresses in ${loc.city}
- Include Nike, Adidas, Foot Locker, Finish Line, DSW, DICK'S, JD Sports, Snipes, Stadium Goods, boutique sneaker shops
- For each store, check if "${searchTarget}" is in stock if possible

For each store provide:
- Real name, real address in ${loc.city}
- Actual phone number if available
- Real Google Maps URL
- Stock status for "${searchTarget}" (In stock / Limited stock / Out of stock / Check in store)
- Estimated distance from city center
- Store hours if available
- Rating if available

Also provide a summary of shoe availability for "${searchTarget}" in ${loc.city}.
Flag if live stock data was unavailable.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            live_stock_available: { type: "boolean" },
            data_freshness: { type: "string" },
            stores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  distance_miles: { type: "number" },
                  rating: { type: "number" },
                  stock_status: { type: "string" },
                  stock_note: { type: "string" },
                  maps_url: { type: "string" },
                  phone: { type: "string" },
                  hours: { type: "string" },
                  website: { type: "string" },
                  store_type: { type: "string" },
                },
              },
            },
          },
        },
      });

      setStores(aiResult.stores || []);
      setAiSummary(aiResult.summary || "");
      setLiveDataAvailable(aiResult.live_stock_available !== false);
      setLastRefreshed(now);
      setDataAge(aiResult.data_freshness || "Just now");
    } catch {
      setLiveDataAvailable(false);
      setAiSummary("Unable to fetch live store data. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Find Nearby Stores</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Live stock data · Real-time availability</p>
            </div>
          </div>
        </motion.div>

        {/* Search Panel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Shoe search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={shoeQuery}
                onChange={e => setShoeQuery(e.target.value)}
                placeholder="Search for a shoe (e.g. Air Max 90, Ultraboost)"
                className="w-full pl-9 pr-4 py-2.5 bg-secondary border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Location input */}
            <form onSubmit={handleCitySearch} className="flex gap-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  placeholder="City or ZIP code"
                  className="pl-9 pr-4 py-2.5 bg-secondary border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 w-48"
                />
              </div>
              <button type="submit" className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90">
                Search
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={handleDetectLocation}
              disabled={locating}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 text-primary" />}
              {locating ? "Detecting..." : "Use My Location"}
            </button>

            {lastRefreshed && (
              <button
                onClick={() => fetchStores(location, shoeQuery)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            )}

            {lastRefreshed && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-2 bg-secondary/50 rounded-xl">
                <Clock className="w-3 h-3" />
                Updated {new Date(lastRefreshed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Data freshness warning */}
        {!liveDataAvailable && stores.length > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 mb-4 text-sm text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Live stock data unavailable — showing store locations only. Visit stores or call ahead to confirm stock.
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && !loading && (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-4">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">{aiSummary}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Searching live store data in {location.city || "your area"}…</span>
            </div>
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && stores.length === 0 && !aiSummary && (
          <div className="text-center py-24">
            <MapPin className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-xl">Find stores near you</h3>
            <p className="text-muted-foreground mt-2">Enter a shoe name and your city to find nearby stores with live stock info.</p>
            <button
              onClick={handleDetectLocation}
              className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90"
            >
              <Navigation className="w-4 h-4" />
              Detect My Location
            </button>
          </div>
        )}

        {/* Store List */}
        {!loading && stores.length > 0 && (
          <AnimatePresence>
            <div className="space-y-3">
              {stores.map((store, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border/50 rounded-2xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex gap-4">
                    {/* Store icon */}
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-heading font-semibold">{store.name}</h3>
                          {store.store_type && (
                            <span className="text-xs text-muted-foreground">{store.store_type}</span>
                          )}
                        </div>
                        {store.stock_status && (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STOCK_COLORS[store.stock_status] || STOCK_COLORS["Check in store"]}`}>
                            {store.stock_status}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">{store.address}</p>

                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {store.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-muted-foreground">{store.rating}</span>
                          </div>
                        )}
                        {store.distance_miles != null && (
                          <span className="text-xs text-primary font-medium">{store.distance_miles < 0.1 ? "< 0.1 mi" : `${Number(store.distance_miles).toFixed(1)} mi`}</span>
                        )}
                        {store.hours && (
                          <span className="text-xs text-muted-foreground">{store.hours}</span>
                        )}
                      </div>

                      {store.stock_note && (
                        <p className="text-xs text-muted-foreground italic mt-1">{store.stock_note}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={store.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(store.name + " " + store.address)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                        >
                          <Navigation className="w-3 h-3" /> Directions
                        </a>
                        {store.phone && (
                          <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80">
                            <Phone className="w-3 h-3" /> {store.phone}
                          </a>
                        )}
                        {store.website && (
                          <a href={store.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80">
                            <ExternalLink className="w-3 h-3" /> Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}