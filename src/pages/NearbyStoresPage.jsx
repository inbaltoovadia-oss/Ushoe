import { useState } from "react";
import { MapPin, Search, Loader2, Star, Navigation, Phone, Globe, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

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
  const query = encodeURIComponent(`${store.name} ${store.address}`);
  const isApple = /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return isApple
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/${query}`;
}

export default function NearbyStoresPage() {
  const [locationInput, setLocationInput] = useState("");
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedCity, setSearchedCity] = useState("");
  const [aiSummary, setAiSummary] = useState("");

  const searchStores = async () => {
    const query = locationInput.trim();
    if (!query) return;
    setLoading(true);
    setHasSearched(true);
    setStores([]);
    setAiSummary("");
    setSearchedCity(query);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a shoe store locator AI. The user entered this location: "${query}".

Search for real, physical shoe retail stores of ANY kind within a 25-mile radius of that location. Include all types: major chains (Nike, Adidas, Foot Locker, DSW, JD Sports, Finish Line, DICK'S Sporting Goods, Shoe Carnival, New Balance, Skechers, Vans, Converse, Puma, Reebok), independent shoe stores, boutique sneaker shops, department stores with shoe departments, outlet stores, and any other physical store that primarily sells shoes or has a significant shoe section.

For each store provide:
- name: official store name
- brand: the chain name or "Independent" for standalone stores
- address: full street address
- distance_miles: estimated distance from "${query}" in miles (must be ≤ 25)
- rating: number 1-5
- phone: real phone number if available
- website: store or brand website URL if available
- stock_status: one of "In Stock", "Low Stock", or "Out of Stock" (randomize realistically)
- hours_today: store hours for today

Sort results by distance ascending (closest first). Return up to 10 stores.
If none exist within 25 miles, return an empty stores array.
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
                name:           { type: "string" },
                brand:          { type: "string" },
                address:        { type: "string" },
                distance_miles: { type: "number" },
                rating:         { type: "number" },
                phone:          { type: "string" },
                website:        { type: "string" },
                stock_status:   { type: "string" },
                hours_today:    { type: "string" },
              },
            },
          },
        },
      },
    });

    const sorted = (res.stores || [])
      .filter(s => s.distance_miles <= 25)
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
        </motion.div>

        {/* Location Search Bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <form
            onSubmit={e => { e.preventDefault(); searchStores(); }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex items-center flex-1 bg-card border-2 border-border rounded-2xl px-4 py-3.5 gap-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-lg">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
              <input
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                placeholder="City, zip code, or address…"
                aria-label="Enter your location to find nearby stores"
                className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/50"
              />
              {locationInput && (
                <button type="button" onClick={() => setLocationInput("")} className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none">×</button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !locationInput.trim()}
              aria-label="Search for nearby shoe stores"
              className="flex items-center justify-center gap-2 bg-primary text-white px-7 py-3.5 rounded-2xl text-base font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/25 min-h-[52px] min-w-[160px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? "Searching…" : "Find Stores"}
            </button>
          </form>
        </motion.div>

        {/* Loading Skeletons */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Searching for shoe stores within 25 miles of "{searchedCity}"…
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
                <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                  No stores found nearby — try expanding your search or check online.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {stores.length} store{stores.length !== 1 ? "s" : ""} found within 25 miles of <span className="font-medium text-foreground">{searchedCity}</span> — sorted by distance
                </p>
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
                        transition={{ delay: i * 0.06 }}
                        className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            {/* Name + Brand badge */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-heading font-bold text-base">{store.name}</h3>
                              {store.brand && (
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${brandColor}`}>
                                  {store.brand}
                                </span>
                              )}
                            </div>

                            {/* Address */}
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              {store.address}
                            </p>

                            {/* Hours */}
                            {store.hours_today && (
                              <p className="text-xs text-muted-foreground mt-1 ml-5">{store.hours_today}</p>
                            )}

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {store.distance_miles != null && (
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                                  📍 {store.distance_miles.toFixed(1)} miles away
                                </span>
                              )}
                              {store.rating && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                  {store.rating.toFixed(1)}
                                </span>
                              )}
                              {/* Stock Status */}
                              <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${stock.color}`}>
                                <StockIcon className="w-3 h-3" />
                                {stock.label}
                              </span>
                            </div>
                          </div>

                          {/* Action buttons */}
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
                            <div className="flex gap-2">
                              {store.phone && (
                                <a
                                  href={`tel:${store.phone}`}
                                  className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  Call
                                </a>
                              )}
                              {store.website && (
                                <a
                                  href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-1 text-xs px-3 py-2 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                  Web
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
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
              Enter your city, zip code, or address above to find any shoe store — chains, boutiques, outlets, and more — within 25 miles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}