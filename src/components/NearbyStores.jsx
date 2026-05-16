/**
 * NearbyStores — Rebuilt with:
 * - LocationInput (GPS + manual city/zip)
 * - Size standard toggle (US / EU / UK)
 * - Accurate inventory matching via agents
 * - Deal-first ranking
 */
import { useState, useEffect } from "react";
import { MapPin, Loader2, Navigation, Sparkles, Tag, RefreshCw, TrendingDown, ShieldCheck, Phone } from "lucide-react";
import SearchingState from "./SearchingState";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { runDealAgent } from "../lib/dealAgent";
import SizeStandardToggle, { DisplaySize } from "./SizeStandardToggle";
import LocationInput from "./LocationInput";
import { fromUSSize } from "../lib/sizeConverter";

const stockColors = {
  "In stock":       "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock":  "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  "Out of stock":   "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

function rankStores(stores, dealRetailers = []) {
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
      ? (dealRetailers || []).find(r => (r.retailer_name || "").toLowerCase() === (s.name || "").toLowerCase())
      : null,
  }));
}

export default function NearbyStores({ title = "Nearby Stores", maxCount = 6, shoe = null, selectedSize = null, selectedColor = null }) {
  const [stores, setStores]           = useState([]);
  const [summary, setSummary]         = useState("");
  const [dealSummary, setDealSummary] = useState("");
  const [loading, setLoading]         = useState(false);
  const [started, setStarted]         = useState(false);
  const [inventoryDone, setInventoryDone] = useState(false);
  const [dealsDone, setDealsDone]     = useState(false);
  const [loc, setLoc]                 = useState(getLocation());
  const [maxDistance, setMaxDistance] = useState(20);
  const [sizeStandard, setSizeStandard] = useState("US");

  useEffect(() => {
    setStarted(false);
    setStores([]);
    setSummary("");
    setDealSummary("");
    setInventoryDone(false);
    setDealsDone(false);
    const unsub = subscribeLocation(newLoc => {
      setLoc(newLoc);
      // Auto-reload if we already started and location changed
      setStarted(false);
    });
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

    const agentArgs = {
      shoe: { ...shoe, _country: location.country, _countryCode: location.countryCode },
      city: location.city,
      size: selectedSize,
      color: selectedColor,
      countryCode: location.countryCode,
    };

    // Single call returns both deals AND nearby_stores
    const result = await runDealAgent(agentArgs);

    setInventoryDone(true);
    setDealsDone(true);
    setDealSummary(result.has_active_deals ? result.summary : "");

    const nearby = (result.nearby_stores || []).slice(0, maxCount).map((s, idx) => ({
      id: `ns_${s.name}_${idx}`,
      name: s.name,
      address: s.address || "",
      distance_km: s.distance_km || null,
      phone: s.phone || "",
      stock_status: s.stock_status || "Check in store",
      price: null,
      maps_url: s.maps_url,
      is_best_option: false,
      has_local_deal: false,
      local_deal_info: null,
    }));

    setStores(rankStores(nearby, result.retailers));
    setSummary(result.summary || "");
    setLoading(false);
  };

  const DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
  const filteredStores = stores.filter(s => !s.distance_km || s.distance_km <= maxDistance);

  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  if (!started) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center">
            Find stores carrying <strong>{shoe?.name}</strong>{displaySize ? ` in size ${displaySize} ${sizeStandard}` : ""} near you
          </p>
        </div>

        <LocationInput onLocated={(newLoc) => setLoc(newLoc)} compact />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Max dist:</span>
            {DISTANCE_OPTIONS.map(d => (
              <button key={d} onClick={() => setMaxDistance(d)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                maxDistance === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}>{d}km</button>
            ))}
          </div>
        </div>

        <button
          onClick={() => { setStarted(true); loadAll(loc); }}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Find Nearby Stores in {loc.city}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">{title}</h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">near {loc.city}</span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
        <LocationInput onLocated={(newLoc) => { setLoc(newLoc); setStarted(false); }} compact />
      </div>

      {/* Distance filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground">Max dist:</span>
        {DISTANCE_OPTIONS.map(d => (
          <button key={d} onClick={() => setMaxDistance(d)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
            maxDistance === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
          }`}>{d}km</button>
        ))}
      </div>

      {!dealsDone && (
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-medium w-fit">
          <Loader2 className="w-3 h-3 animate-spin" />
          Finding stores &amp; deals…
        </div>
      )}
      {dealsDone && (
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium w-fit">
          <Tag className="w-3 h-3" />
          Results ready ✓
        </div>
      )}

      {summary && !loading && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
      )}

      {dealSummary && dealsDone && (
        <div className="flex items-start gap-2 bg-accent/5 border border-accent/10 rounded-xl p-3">
          <TrendingDown className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
        Deal stores shown first, then nearest. Call ahead to confirm stock.
      </p>

      {loading && !inventoryDone ? (
        <SearchingState city={loc.city} shoe={shoe} />
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filteredStores.map((store, i) => (
              <StoreCard
                key={store.id || i}
                store={store}
                index={i}
                shoe={shoe}
                selectedSize={selectedSize}
                sizeStandard={sizeStandard}
                city={loc.city}
              />
            ))}
            {filteredStores.length === 0 && !loading && (
              <div className="py-6 text-center">
                <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium">No stores confirmed near {loc.city}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Try increasing the max distance or changing location.</p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(`${shoe?.brand} shoes ${loc.city}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <MapPin className="w-3 h-3" /> Search on Google Maps
                </a>
              </div>
            )}
          </div>
        </AnimatePresence>
      )}

      {!loading && (
        <button onClick={() => loadAll(loc)} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run search
        </button>
      )}
    </div>
  );
}

function StoreCard({ store, index, shoe, selectedSize, sizeStandard, city }) {
  const isBest = store.is_best_option;
  const hasLocalDeal = store.has_local_deal;
  const stockStyle = stockColors[store.stock_status] || stockColors["Check in store"];
  const deal = store.local_deal_info;

  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border p-4 transition-all hover:shadow-md ${
        hasLocalDeal
          ? "border-green-400/60 ring-1 ring-green-400/20"
          : isBest
          ? "border-amber-400/60 ring-1 ring-amber-400/20"
          : "border-border/50"
      }`}
    >
      {hasLocalDeal && (
        <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-green-700 dark:text-green-400">
          <TrendingDown className="w-3 h-3" /> Local Deal Found Here
        </div>
      )}

      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-heading font-semibold text-sm">{store.name}</p>
            {hasLocalDeal && <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">Deal</span>}
            {!hasLocalDeal && isBest && <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">Closest</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {store.distance_km && <span className="text-[10px] text-muted-foreground">{store.distance_km} km away</span>}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${stockStyle}`}>{store.stock_status}</span>
            {displaySize && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">Size {displaySize} {sizeStandard}</span>
            )}
            <span className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded-full">Call to confirm</span>
          </div>
        </div>

        {/* Price */}
        {(() => {
          const displayPrice = deal?.deal_price || store.price;
          const originalPrice = deal?.original_price;
          if (!displayPrice) return null;
          return (
            <div className="text-right flex-shrink-0">
              <span className={`text-lg font-bold font-heading ${hasLocalDeal ? "text-green-600 dark:text-green-400" : ""}`}>${displayPrice}</span>
              {originalPrice && originalPrice > displayPrice && (
                <div className="text-xs text-muted-foreground line-through">${originalPrice}</div>
              )}
            </div>
          );
        })()}
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        <a
          href={store.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.98] ${
            hasLocalDeal ? "bg-green-500 text-white" : isBest ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          {hasLocalDeal ? "Get Deal & Directions" : "Get Directions"}
        </a>
        {store.phone && (
          <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-sm font-medium transition-colors">
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
        )}
      </div>
    </motion.div>
  );
}