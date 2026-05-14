/**
 * NearbyStores — Inventory Agent + Deal Agent running in parallel.
 * Shows ranked local stores: local deal store first, then others sorted by distance.
 */
import { useState, useEffect } from "react";
import { MapPin, Loader2, Star, Navigation, Sparkles, Tag, CheckCircle, Phone, RefreshCw, Store, TrendingDown, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { runInventoryAgent } from "../lib/inventoryAgent";
import { runDealAgent } from "../lib/dealAgent";

const stockColors = {
  "In stock":       "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock":  "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  "Out of stock":   "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

function rankStores(stores, dealRetailers) {
  // Build a set of retailer names that have deals
  const dealNames = new Set(
    (dealRetailers || [])
      .filter(r => r.deal_confirmed || r.discount_pct > 0)
      .map(r => (r.retailer_name || "").toLowerCase())
  );

  return [...stores].sort((a, b) => {
    const aHasDeal = dealNames.has((a.name || "").toLowerCase());
    const bHasDeal = dealNames.has((b.name || "").toLowerCase());
    if (aHasDeal && !bHasDeal) return -1;
    if (!aHasDeal && bHasDeal) return 1;
    return (a.distance_km || 999) - (b.distance_km || 999);
  }).map((s, i) => ({
    ...s,
    is_best_option: i === 0,
    has_local_deal: dealNames.has((s.name || "").toLowerCase()),
    local_deal_info: dealNames.has((s.name || "").toLowerCase())
      ? dealRetailers?.find(r => (r.retailer_name || "").toLowerCase() === (s.name || "").toLowerCase())
      : null,
  }));
}

export default function NearbyStores({
  title = "Nearby Stores",
  maxCount = 6,
  shoe = null,
  selectedSize = null,
  selectedColor = null,
}) {
  const [stores, setStores]           = useState([]);
  const [summary, setSummary]         = useState("");
  const [dealSummary, setDealSummary] = useState("");
  const [loading, setLoading]         = useState(false);
  const [started, setStarted]         = useState(false);
  const [inventoryDone, setInventoryDone] = useState(false);
  const [dealsDone, setDealsDone]     = useState(false);
  const [loc, setLoc]                 = useState(getLocation());

  useEffect(() => {
    // Reset on shoe change so user can re-trigger
    setStarted(false);
    setStores([]);
    setSummary("");
    setDealSummary("");
    setInventoryDone(false);
    setDealsDone(false);
    const unsub = subscribeLocation(setLoc);
    return unsub;
  }, [shoe?.id]);

  const loadAll = async (location) => {
    if (!shoe) return;
    setLoading(true);
    setStores([]);
    setSummary("");
    setDealSummary("");
    setInventoryDone(false);
    setDealsDone(false);

    let inventoryResult = null;
    let dealResult = null;

    const inventoryPromise = runInventoryAgent({
      shoe: { ...shoe, _country: location.country }, city: location.city, size: selectedSize, color: selectedColor,
    }).then(r => {
      inventoryResult = r;
      setSummary(r.summary || "");
      setInventoryDone(true);
      const nearby = (r.nearby_stores || []).slice(0, maxCount);
      const mapped = nearby.map((s, idx) => ({
        id:             `inv_${s.name}_${idx}`,
        name:           s.name,
        address:        s.address || "",
        distance_km:    s.distance_km || null,
        phone:          s.phone || "",
        stock_status:   s.stock_status || "Check in store",
        price:          s.price || null,
        maps_url:       s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address || location.city}`)}`,
        is_best_option: false,
        has_local_deal: false,
        local_deal_info: null,
      }));
      setStores(dealResult ? rankStores(mapped, dealResult.retailers) : mapped);
    }).catch(() => {
      setInventoryDone(true);
      setSummary("");
    });

    const dealPromise = runDealAgent({
      shoe: { ...shoe, _country: location.country }, city: location.city, size: selectedSize, color: selectedColor,
    }).then(r => {
      dealResult = r;
      const hasDeal = r.has_active_deals;
      setDealSummary(hasDeal ? r.summary : "");
      setDealsDone(true);
      setStores(prev => prev.length > 0 ? rankStores(prev, r.retailers) : prev);
    }).catch(() => {
      setDealsDone(true);
    });

    await Promise.allSettled([inventoryPromise, dealPromise]);
    setLoading(false);
  };

  // Not yet started — show prompt
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <MapPin className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground text-center">Find stores carrying this shoe near {loc.city}</p>
        <button
          onClick={() => { setStarted(true); loadAll(loc); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <MapPin className="w-4 h-4" />
          Find Nearby Stores
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">near {loc.city}</span>
      </div>

      {/* Agent status */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${
          inventoryDone ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"
        }`}>
          <Store className="w-3 h-3" />
          Inventory {inventoryDone ? "✓" : <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-0.5" />}
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${
          dealsDone ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"
        }`}>
          <Tag className="w-3 h-3" />
          Local Deals {dealsDone ? "✓" : <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-0.5" />}
        </div>
      </div>

      {summary && !loading && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
      )}

      {dealSummary && dealsDone && (
        <div className="flex items-start gap-2 bg-accent/5 border border-accent/10 rounded-xl p-3 mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}

      {!loading && stores.length > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
          Stores ranked: local deal stores first, then by distance. Call to confirm stock.
        </p>
      )}

      {loading && !inventoryDone ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Scanning stores near {loc.city}…</span>
          </div>
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {stores.map((store, i) => <StoreRow key={store.id || i} store={store} index={i} city={loc.city} />)}
            {stores.length === 0 && !loading && (
              <div className="py-6 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No confirmed stores found near {loc.city}</p>
                <p className="text-xs text-muted-foreground mt-1">The agent couldn't verify physical {shoe?.brand} stores with this shoe in stock near you.</p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${shoe?.brand} store ${loc.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  Search on Google Maps
                </a>
              </div>
            )}
          </div>
        </AnimatePresence>
      )}

      {!loading && (
        <button onClick={() => loadAll(loc)} className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run agents
        </button>
      )}
    </div>
  );
}

function StoreRow({ store, index, city }) {
  const isBest     = store.is_best_option;
  const hasLocalDeal = store.has_local_deal;
  const stockStyle = stockColors[store.stock_status] || stockColors["Check in store"];
  const deal       = store.local_deal_info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border flex gap-3 p-3 transition-all hover:shadow-md ${
        hasLocalDeal
          ? "border-green-400/60 ring-1 ring-green-400/20 shadow-sm shadow-green-400/10"
          : isBest
          ? "border-amber-400/60 ring-1 ring-amber-400/20 shadow-sm shadow-amber-400/10"
          : "border-border/50"
      }`}
    >
      <img
        src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop"
        alt={store.name}
        className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-secondary"
      />
      <div className="flex-1 min-w-0">
        {/* Local deal banner */}
        {hasLocalDeal && (
          <div className="flex items-center gap-1 mb-1 text-[10px] font-bold text-green-700 dark:text-green-400">
            <TrendingDown className="w-3 h-3" />
            Local Deal Found Here
          </div>
        )}

        <div className="flex items-start justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-heading font-semibold text-sm">{store.name}</p>
            {hasLocalDeal && (
              <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">Local Deal</span>
            )}
            {!hasLocalDeal && isBest && (
              <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">Best Option</span>
            )}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${stockStyle}`}>
            {store.stock_status}
          </span>
        </div>

        {/* Price display — deal price takes priority, then store price, then catalog */}
        {(() => {
          const displayPrice = deal?.deal_price || store.price;
          const originalPrice = deal?.original_price || (deal?.deal_price && store.price && store.price > deal.deal_price ? store.price : null);
          if (!displayPrice) return null;
          return (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-bold ${hasLocalDeal ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                ${displayPrice}
              </span>
              {originalPrice && originalPrice > displayPrice && (
                <span className="text-xs text-muted-foreground line-through">${originalPrice}</span>
              )}
              {deal?.discount_pct > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">-{deal.discount_pct}%</span>
              )}
            </div>
          );
        })()}

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {store.distance_km && (
            <span className="text-[10px] text-muted-foreground">{store.distance_km} km away</span>
          )}
          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full">Call to confirm</span>
        </div>

        <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>

        <div className="flex gap-2 mt-2 flex-wrap">
          {store.maps_url ? (
            <a
              href={store.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:opacity-90 transition-opacity ${
                hasLocalDeal ? "bg-green-500 text-white" : isBest ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
              }`}
            >
              <Navigation className="w-3 h-3" />
              {hasLocalDeal ? "Get Deal" : isBest ? "Go Now" : "Maps"}
            </a>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground">
              Check in store
            </span>
          )}
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
              <Phone className="w-3 h-3" />
              Call
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}