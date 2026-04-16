import { useState, useEffect } from "react";
import { MapPin, Search, Loader2, Star, Navigation, Phone, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import LocationPicker from "../components/LocationPicker";

export default function NearbyStoresPage() {
  const [loc, setLoc] = useState(getLocation());
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const unsub = subscribeLocation((newLoc) => {
      setLoc(newLoc);
    });
    return unsub;
  }, []);

  const searchStores = async (location = loc) => {
    setLoading(true);
    setHasSearched(true);
    setStores([]);
    setAiSummary("");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a shoe store locator. The user is in ${location.city} (lat: ${location.lat}, lng: ${location.lng}).
${searchInput ? `They are looking for: "${searchInput}".` : "They want to find nearby shoe stores."}

List the top 8 real shoe stores near ${location.city}. Include Nike stores, Adidas stores, Foot Locker, Finish Line, DSW, independent sneaker shops, and department stores with shoe sections.
For each store: provide realistic data with real street addresses in ${location.city}, phone number, website, rating (1-5), estimated distance in miles, and store type.
Also provide a short 1-sentence summary of the local shoe store scene in ${location.city}.`,
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
                name: { type: "string" },
                address: { type: "string" },
                distance_miles: { type: "number" },
                rating: { type: "number" },
                phone: { type: "string" },
                website: { type: "string" },
                store_type: { type: "string" },
                hours_today: { type: "string" },
              },
            },
          },
        },
      },
    });

    setStores(res.stores || []);
    setAiSummary(res.summary || "");
    setLoading(false);
  };

  const stockColors = {
    Nike: "bg-black text-white",
    Adidas: "bg-blue-600 text-white",
    "Foot Locker": "bg-red-600 text-white",
    "Finish Line": "bg-blue-800 text-white",
    DSW: "bg-purple-600 text-white",
    Independent: "bg-green-600 text-white",
    "Department Store": "bg-gray-600 text-white",
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
            <h1 className="font-heading font-bold text-3xl">Nearby Stores</h1>
          </div>
          <p className="text-muted-foreground">Find shoe stores near you with live AI-powered search</p>
        </motion.div>

        {/* Search Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center bg-secondary rounded-xl px-4 py-3 gap-2">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchStores()}
                placeholder="Search for Nike, running shoes, sneaker stores…"
                className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLocationPicker(true)}
                className="flex items-center gap-1.5 px-4 py-3 bg-secondary rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <MapPin className="w-4 h-4" />
                {loc.city}
              </button>
              <button
                onClick={() => searchStores()}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Find Stores
              </button>
            </div>
          </div>
        </div>

        {/* Location Picker */}
        {showLocationPicker && (
          <div className="mb-4">
            <LocationPicker onClose={() => { setShowLocationPicker(false); }} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Sparkles className="w-4 h-4 animate-pulse text-primary" />
              AI is scanning shoe stores near {loc.city}…
            </div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-card border border-border animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && (
          <>
            {aiSummary && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-4 mb-4">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{aiSummary}</p>
              </div>
            )}

            {stores.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg">No stores found</h3>
                <p className="text-muted-foreground text-sm mt-1">Try a different search or location</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-1">{stores.length} stores found near {loc.city}</p>
                {stores.map((store, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading font-semibold">{store.name}</h3>
                          {store.store_type && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockColors[store.store_type] || "bg-secondary text-foreground"}`}>
                              {store.store_type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{store.address}</p>
                        {store.hours_today && (
                          <p className="text-xs text-muted-foreground mt-0.5">Today: {store.hours_today}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {store.rating && (
                            <span className="flex items-center gap-1 text-xs">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              {store.rating.toFixed(1)}
                            </span>
                          )}
                          {store.distance_miles != null && (
                            <span className="text-xs text-primary font-medium">
                              {store.distance_miles < 0.1 ? "< 0.1 mi" : `${store.distance_miles.toFixed(1)} mi away`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <a
                          href={`https://www.google.com/maps/search/${encodeURIComponent(store.name + " " + store.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Directions
                        </a>
                        {store.phone && (
                          <a
                            href={`tel:${store.phone}`}
                            className="flex items-center gap-1 text-xs px-3 py-2 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
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
                            className="flex items-center gap-1 text-xs px-3 py-2 bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state before search */}
        {!loading && !hasSearched && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-xl mb-2">Find Shoe Stores Near You</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Search for any type of shoe store or specific brand near {loc.city}
            </p>
            <button
              onClick={() => searchStores()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:opacity-90"
            >
              <Sparkles className="w-4 h-4" />
              Find Stores Near Me
            </button>
          </div>
        )}
      </div>
    </div>
  );
}