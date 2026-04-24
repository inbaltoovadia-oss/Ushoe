/**
 * NearbyStores — powered by Inventory Agent (stock/location) + Deal Agent (local pricing).
 * Runs both agents in parallel, merges physical store data.
 */
import { useState, useEffect } from "react";
import { MapPin, Loader2, Star, Navigation, Sparkles, Tag, CheckCircle, Phone, RefreshCw } from "lucide-react";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { runInventoryAgent } from "../lib/inventoryAgent";
import { runDealAgent } from "../lib/dealAgent";

const stockColors = {
  "In stock":       "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock":  "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  "Out of stock":   "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

export default function NearbyStores({
  title = "Nearby Stores",
  maxCount = 6,
  shoe = null,
  selectedSize = null,
  selectedColor = null,
}) {
  const [stores, setStores] = useState([]);
  const [summary, setSummary] = useState("");
  const [dealSummary, setDealSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [inventoryDone, setInventoryDone] = useState(false);
  const [loc, setLoc] = useState(getLocation());

  useEffect(() => {
    loadAll(loc);
    const unsub = subscribeLocation(newLoc => {
      setLoc(newLoc);
      loadAll(newLoc);
    });
    return unsub;
  }, [shoe?.id, selectedSize, selectedColor]);

  const loadAll = async (location) => {
    if (!shoe) return;
    setLoading(true);
    setStores([]);
    setSummary("");
    setDealSummary("");
    setInventoryDone(false);

    let inventoryResult = null;

    const inventoryPromise = runInventoryAgent({
      shoe,
      city: location.city,
      size: selectedSize,
      color: selectedColor,
    }).then(r => {
      inventoryResult = r;
      setSummary(r.summary);
      setInventoryDone(true);
      const mapped = (r.nearby_stores || []).slice(0, maxCount).map((s, i) => ({
        id: `inv_${i}`,
        name: s.name,
        address: s.address,
        distance_km: s.distance_km,
        rating: null,
        phone: s.phone || "",
        stock_status: s.stock_status || "Check in store",
        maps_url: `https://www.google.com/maps/search/${encodeURIComponent(s.maps_query || s.name + " " + s.address)}`,
        is_best_option: i === 0,
        local_deal_price: null,
      }));
      setStores(mapped);
    });

    const dealPromise = runDealAgent({
      shoe,
      city: location.city,
      size: selectedSize,
      color: selectedColor,
    }).then(r => {
      setDealSummary(r.has_active_deals ? r.summary : "");
    });

    await Promise.allSettled([inventoryPromise, dealPromise]);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">near {loc.city}</span>
      </div>

      {/* Agent status */}
      <div className="flex gap-2 mb-3">
        <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${
          inventoryDone ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"
        }`}>
          <CheckCircle className="w-3 h-3" />
          Inventory Agent {inventoryDone ? "✓" : <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-0.5" />}
        </div>
      </div>

      {summary && !loading && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
      )}

      {dealSummary && !loading && (
        <div className="flex items-start gap-2 bg-accent/5 border border-accent/10 rounded-xl p-3 mb-3">
          <Tag className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}

      {!loading && stores.length > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          Locations from Inventory Agent via live web search. Call ahead to confirm stock.
        </p>
      )}

      {loading && !inventoryDone ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Inventory Agent scanning stores near {loc.city}…</span>
          </div>
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store, i) => (
            <StoreRow key={store.id || i} store={store} />
          ))}
          {stores.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-4">No stores found near {loc.city}.</p>
          )}
        </div>
      )}

      {!loading && (
        <button
          onClick={() => loadAll(loc)}
          className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run agents
        </button>
      )}
    </div>
  );
}

function StoreRow({ store }) {
  const isBest = store.is_best_option;
  const stockStyle = stockColors[store.stock_status] || stockColors["Check in store"];

  return (
    <div className={`bg-card rounded-2xl border flex gap-3 p-3 transition-all hover:shadow-md ${
      isBest ? "border-amber-400/60 ring-1 ring-amber-400/20 shadow-sm shadow-amber-400/10" : "border-border/50"
    }`}>
      <img
        src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop"
        alt={store.name}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-secondary"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-heading font-semibold text-sm">{store.name}</p>
            {isBest && (
              <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">Best Option</span>
            )}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${stockStyle}`}>
            {store.stock_status}
          </span>
        </div>

        {store.local_deal_price && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-green-600 font-semibold">
            <Tag className="w-3 h-3" /> Local deal: ${store.local_deal_price}
          </div>
        )}

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {store.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs text-muted-foreground">{store.rating}</span>
            </div>
          )}
          {store.distance_km && (
            <span className="text-[10px] text-muted-foreground">{store.distance_km} km away</span>
          )}
          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full">Call to confirm stock</span>
        </div>

        <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>

        <div className="flex gap-2 mt-2">
          <a
            href={store.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:opacity-90 transition-opacity ${
              isBest ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
            }`}
          >
            <Navigation className="w-3 h-3" />
            {isBest ? "Go Now" : "Maps"}
          </a>
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Phone className="w-3 h-3" />
              Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}