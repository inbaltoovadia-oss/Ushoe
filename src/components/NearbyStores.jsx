import { useState, useEffect } from "react";
import { MapPin, Loader2, Star, Navigation, Sparkles, Zap, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { sortStoresByLocation } from "../lib/storeUtils";

export default function NearbyStores({ title = "Nearby Stores", maxCount = 6, shoe = null, selectedSize = null, selectedColor = null }) {
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

    const [dbStores, aiResult] = await Promise.all([
      base44.entities.Store.list("-rating", 50),
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a shoe store locator AI. The user is in ${location.city} (lat: ${location.lat}, lng: ${location.lng}).
${shoe ? `They want: "${shoe.name}" by ${shoe.brand} (${shoe.category}, $${shoe.price}).` : "They want nearby shoe stores."}
${selectedSize ? `Required size: ${selectedSize}.` : ""}
${selectedColor ? `Required color: ${selectedColor}.` : ""}

List the top ${maxCount} real shoe stores near ${location.city}.
${selectedSize || selectedColor ? `Only include stores WITH stock in size ${selectedSize || "any"}${selectedColor ? ` / ${selectedColor}` : ""}.` : `Prefer stores likely to carry ${shoe ? `${shoe.brand}` : "popular sneakers"}.`}
For each store: provide realistic data, real addresses in ${location.city}, and:
- distance_km: realistic distance in km from city center
- pickup_today: true if in-stock and open today
- open_now: bool
Mark ONE store as is_best_option (best combo of proximity + stock + rating).
Also return a short 1-sentence local summary.`,
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
                  address:        { type: "string" },
                  distance_km:    { type: "number" },
                  rating:         { type: "number" },
                  stock_status:   { type: "string", enum: ["In stock", "Limited stock", "Out of stock", "Check in store"] },
                  maps_search:    { type: "string" },
                  phone:          { type: "string" },
                  pickup_today:   { type: "boolean" },
                  open_now:       { type: "boolean" },
                  is_best_option: { type: "boolean" },
                },
              },
            },
          },
        },
      }),
    ]);

    const sorted = sortStoresByLocation(dbStores, location.lat, location.lng).slice(0, 3);

    const aiStores = (aiResult.stores || []).map((s, i) => ({
      id: `ai_${i}`,
      name: s.name,
      address: s.address,
      city: location.city,
      rating: s.rating || 4.2,
      phone: s.phone || "",
      distance_km: s.distance_km,
      stock_status: s.stock_status || "Check in store",
      pickup_today: s.pickup_today,
      open_now: s.open_now,
      is_best_option: s.is_best_option,
      maps_url: `https://www.google.com/maps/search/${encodeURIComponent(s.maps_search || s.name + " " + s.address)}`,
      image_url: `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop`,
    }));

    const combined = [...aiStores, ...sorted.map(s => ({
      ...s,
      maps_url: `https://www.google.com/maps/search/${encodeURIComponent(s.name + " " + s.address)}`,
    }))];

    // Ensure at most one is_best_option
    let bestSet = false;
    const finalStores = combined.slice(0, maxCount).map(s => {
      if (s.is_best_option && !bestSet) { bestSet = true; return s; }
      return { ...s, is_best_option: false };
    });

    setStores(finalStores);
    setAiSummary(aiResult.summary || "");
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">near {loc.city}</span>
      </div>

      {aiSummary && !loading && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{aiSummary}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Scanning stores near {loc.city}…</span>
          </div>
          {[1,2,3].map(i => <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-2xl" />)}
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
  "In stock":      "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock": "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  "Out of stock":  "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store":"text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

function StoreRow({ store }) {
  const isBest = store.is_best_option;
  const distLabel = store.distance_km != null
    ? `${store.distance_km < 1 ? (store.distance_km * 1000).toFixed(0) + " m" : store.distance_km.toFixed(1) + " km"} away`
    : store.distance != null
      ? `${typeof store.distance === "number" ? store.distance.toFixed(1) + " mi" : store.distance} away`
      : null;

  return (
    <div className={`bg-card rounded-2xl border flex gap-3 p-3 transition-all hover:shadow-md ${
      isBest
        ? "border-amber-400/60 ring-1 ring-amber-400/20 shadow-sm shadow-amber-400/10"
        : "border-border/50"
    }`}>
      <img
        src={store.image_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop"}
        alt={store.name}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-secondary"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-heading font-semibold text-sm">{store.name}</p>
            {isBest && (
              <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                Best Option
              </span>
            )}
          </div>
          {store.stock_status && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${stockColors[store.stock_status] || stockColors["Check in store"]}`}>
              {store.stock_status}
            </span>
          )}
        </div>

        {/* Rating + distance */}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-muted-foreground">{store.rating}</span>
          </div>
          {distLabel && (
            <span className="text-xs font-medium text-primary flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {distLabel}
            </span>
          )}
          {store.pickup_today && (
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-0.5 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5" />
              Pickup today
            </span>
          )}
          {store.open_now === false && (
            <span className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">Closed</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>

        <div className="flex gap-2 mt-2">
          <a
            href={store.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:opacity-90 transition-opacity ${
              isBest
                ? "bg-amber-500 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <Navigation className="w-3 h-3" />
            {isBest ? "Go Now" : "Maps"}
          </a>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-secondary text-foreground rounded-lg hover:bg-secondary/80">
              <Phone className="w-3 h-3" /> Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}