import { useState, useEffect } from "react";
import { MapPin, Loader2, ExternalLink, Star, Navigation, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { sortStoresByLocation } from "../lib/storeUtils";

export default function NearbyStores({ title = "Nearby Stores", maxCount = 6, shoe = null }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [loc, setLoc] = useState(getLocation());

  useEffect(() => {
    loadStores(loc);
    const unsub = subscribeLocation((newLoc) => {
      setLoc(newLoc);
      loadStores(newLoc);
    });
    return unsub;
  }, [shoe?.id]);

  const loadStores = async (location) => {
    setLoading(true);
    setAiSummary("");

    // Fetch DB stores + query Google Maps Places API via AI
    const [dbStores, aiResult] = await Promise.all([
      base44.entities.Store.list("-rating", 50),
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a shoe store locator AI. The user is in ${location.city} (lat: ${location.lat}, lng: ${location.lng}).
${shoe ? `They are looking for: "${shoe.name}" by ${shoe.brand} (${shoe.category}, $${shoe.price}).` : "They are looking for shoe stores nearby."}

List the top ${maxCount} real shoe stores near ${location.city} that would likely carry ${shoe ? `the ${shoe.brand} brand` : "popular sneakers"}.
For each store provide realistic data. Make the addresses real streets in ${location.city}.
Also provide a short 1-sentence summary of the local shoe store scene.`,
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
                  stock_status: { type: "string", enum: ["In stock", "Limited stock", "Out of stock", "Check in store"] },
                  maps_search: { type: "string" },
                  phone: { type: "string" },
                },
              },
            },
          },
        },
      }),
    ]);

    const sorted = sortStoresByLocation(dbStores, location.lat, location.lng).slice(0, 3);

    // Merge AI stores with DB stores
    const aiStores = (aiResult.stores || []).map((s, i) => ({
      id: `ai_${i}`,
      name: s.name,
      address: s.address,
      city: location.city,
      rating: s.rating || 4.2,
      phone: s.phone || "",
      distance: s.distance_miles,
      stock_status: s.stock_status || "Check in store",
      maps_url: `https://www.google.com/maps/search/${encodeURIComponent(s.maps_search || s.name + " " + s.address)}`,
      image_url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop`,
    }));

    const combined = [...aiStores, ...sorted.map(s => ({ ...s, maps_url: `https://www.google.com/maps/search/${encodeURIComponent(s.name + " " + s.address)}` }))];
    setStores(combined.slice(0, maxCount));
    setAiSummary(aiResult.summary || "");
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          near {loc.city}
        </span>
      </div>

      {aiSummary && !loading && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{aiSummary}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">AI scanning stores in {loc.city}…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store, i) => (
            <StoreRow key={store.id || i} store={store} index={i} />
          ))}
          {stores.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No stores found near {loc.city}.</p>
          )}
        </div>
      )}
    </div>
  );
}

const stockColors = {
  "In stock": "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock": "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
  "Out of stock": "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

function StoreRow({ store, index }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 flex gap-3 p-3 hover:shadow-md transition-all">
      <img
        src={store.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop"}
        alt={store.name}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-secondary"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="font-heading font-semibold text-sm truncate">{store.name}</p>
          {store.stock_status && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${stockColors[store.stock_status] || stockColors["Check in store"]}`}>
              {store.stock_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs text-muted-foreground">{store.rating}</span>
          {store.distance != null && (
            <span className="text-xs text-primary ml-1">· {typeof store.distance === 'number' ? (store.distance < 0.1 ? '< 0.1 mi' : `${store.distance.toFixed(1)} mi`) : store.distance}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>
        <div className="flex gap-2 mt-2">
          <a
            href={store.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Navigation className="w-3 h-3" />
            Maps
          </a>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary text-foreground rounded-lg hover:bg-secondary/80">
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}