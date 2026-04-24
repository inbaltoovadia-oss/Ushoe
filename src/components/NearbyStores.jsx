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
  const [loading, setLoading]         = useState(true);
  const [inventoryDone, setInventoryDone] = useState(false);
  const [dealsDone, setDealsDone]     = useState(false);
  const [loc, setLoc]                 = useState(getLocation());

  useEffect(() => {
    loadAll(loc);
    const unsub = subscribeLocation(newLoc => { setLoc(newLoc); loadAll(newLoc); });
    return unsub;
  }, [shoe?.id, selectedSize, selectedColor]);

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
      shoe, city: location.city, size: selectedSize, color: selectedColor,
    }).then(r => {
      inventoryResult = r;
      setSummary(r.summary);
      setInventoryDone(true);
      const mapped = (r.nearby_stores || []).slice(0, maxCount).map(s => ({
        id:           `inv_${s.name}`,
        name:         s.name,
        address:      s.address,
        distance_km:  s.distance_km,
        phone:        s.phone || "",
        stock_status: s.stock_status || "Check in store",
        maps_url:     `https://www.google.com/maps/search/${encodeURIComponent(s.maps_query || `${s.name} ${s.address}`)}`,
        is_best_option: false,
        has_local_deal: false,
        local_deal_info: null,
      }));
      // Merge with deal data if already available
      setStores(dealResult ? rankStores(mapped, dealResult.retailers) : mapped);
    });

    const dealPromise = runDealAgent({
      shoe, city: location.city, size: selectedSize, color: selectedColor,
    }).then(r => {
      dealResult = r;
      const hasDeal = r.has_active_deals;
      setDealSummary(hasDeal ? r.summary : "");
      setDealsDone(true);
      // Re-rank stores with deal info
      setStores(prev => prev.length > 0 ? rankStores(prev, r.retailers) : prev);
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
              <p className="text-sm text-muted-foreground py-4">No stores found near {loc.city}.</p>
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

        {/* Local deal pricing */}
        {deal && deal.deal_price && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-bold text-green-600 dark:text-green-400">${deal.deal_price}</span>
            {deal.original_price > deal.deal_price && (
              <span className="text-xs text-muted-foreground line-through">${deal.original_price}</span>
            )}
            {deal.discount_pct > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">-{deal.discount_pct}%</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {store.distance_km && (
            <span className="text-[10px] text-muted-foreground">{store.distance_km} km away</span>
          )}
          <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full">Call to confirm</span>
        </div>

        <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>

        <div className="flex gap-2 mt-2">
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