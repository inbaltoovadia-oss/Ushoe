/**
 * NearbyStores — Google Maps + Gemini AI nearby store finder
 * Uses real Google Maps Places API to find actual nearby stores,
 * then Gemini reasons about which ones likely carry the specific shoe.
 */
import { useState, useEffect } from "react";
import { MapPin, Loader2, Navigation, Sparkles, RefreshCw, ShieldCheck, Phone, Star, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import LocationInput from "./LocationInput";
import { base44 } from "@/api/base44Client";

const CONFIDENCE_STYLES = {
  high:   { bar: "bg-green-500", text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", icon: CheckCircle2, label: "Likely in stock" },
  medium: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", icon: HelpCircle, label: "Possibly in stock" },
  low:    { bar: "bg-red-400",   text: "text-red-500",                       bg: "bg-red-50 dark:bg-red-950/30",   icon: AlertCircle,    label: "Call to confirm" },
};

const SEARCH_STEPS = [
  "📍 Getting your location…",
  "🗺️ Searching nearby sneaker stores on Google Maps…",
  "🧠 Analyzing which stores carry this shoe…",
  "🔍 Checking stock availability…",
  "✅ Ranking best options for you…",
];

function LoadingState({ shoe }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, SEARCH_STEPS.length - 1)), 10000);
    const secTimer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { clearInterval(stepTimer); clearInterval(secTimer); };
  }, []);

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="relative flex-shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
          <Loader2 className="w-3 h-3 text-primary animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-xs font-semibold text-foreground"
            >
              {SEARCH_STEPS[step]}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Finding stores for {shoe?.name} · {elapsed}s
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {SEARCH_STEPS.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${i <= step ? "w-2 h-2 bg-primary" : "w-1.5 h-1.5 bg-secondary"}`} />
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-2 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 w-36 bg-secondary rounded-full" />
            <div className="h-4 w-16 bg-secondary rounded-full" />
          </div>
          <div className="h-3 w-48 bg-secondary/70 rounded-full" />
          <div className="h-8 w-full bg-secondary/40 rounded-xl mt-2" />
        </div>
      ))}
    </div>
  );
}

function StoreCard({ store, index, shoe, selectedSize }) {
  const conf = CONFIDENCE_STYLES[store.stock_confidence] || CONFIDENCE_STYLES.medium;
  const Icon = conf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`bg-card rounded-2xl border p-4 transition-all hover:shadow-md ${
        store.is_best_option ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"
      }`}
    >
      {store.is_best_option && (
        <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-primary">
          <Sparkles className="w-3 h-3" /> Best Option Nearby
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm">{store.name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{store.address}</p>

          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            {store.distance_km != null && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {store.distance_km} km away
              </span>
            )}
            {store.rating && (
              <span className="text-[10px] flex items-center gap-0.5 text-amber-500">
                <Star className="w-2.5 h-2.5 fill-amber-500" /> {store.rating}
              </span>
            )}
            {store.is_open === true && (
              <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">Open now</span>
            )}
            {store.is_open === false && (
              <span className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">Closed</span>
            )}
          </div>
        </div>

        {/* Stock confidence badge */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold flex-shrink-0 ${conf.bg} ${conf.text}`}>
          <Icon className="w-3 h-3" />
          {store.stock_status || conf.label}
        </div>
      </div>

      {/* AI reasoning */}
      {store.why && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1">
          <Sparkles className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
          {store.why}
        </p>
      )}

      {selectedSize && store.stock_status && store.stock_status !== 'Check in store' && (
        <div className={`mt-2 text-[10px] font-semibold px-2 py-1 rounded-lg w-fit flex items-center gap-1 ${conf.bg} ${conf.text}`}>
          <Icon className="w-3 h-3" />
          Size US {selectedSize}: {store.stock_status}
        </div>
      )}
      {selectedSize && (!store.stock_status || store.stock_status === 'Check in store') && (
        <p className="text-[10px] text-muted-foreground mt-1">Call ahead to check US size {selectedSize}</p>
      )}

      {/* Confidence bar */}
      <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${conf.bar}`}
          style={{ width: store.stock_confidence === 'high' ? '90%' : store.stock_confidence === 'medium' ? '55%' : '25%' }} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <a
          href={store.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          <Navigation className="w-3.5 h-3.5" />
          Directions
        </a>
        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-sm font-medium transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
        )}
        {store.website && (
          <a
            href={store.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Website
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function NearbyStores({ title = "Nearby Stores", maxCount = 6, shoe = null, selectedSize = null, selectedColor = null }) {
  const [stores, setStores]         = useState([]);
  const [summary, setSummary]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [started, setStarted]       = useState(false);
  const [error, setError]           = useState(null);
  const [loc, setLoc]               = useState(getLocation());
  const [exactAddress, setExactAddress] = useState("");
  const [resolving, setResolving]   = useState(false);

  useEffect(() => {
    setStarted(false);
    setStores([]);
    const unsub = subscribeLocation(newLoc => { setLoc(newLoc); setStarted(false); });
    return unsub;
  }, [shoe?.id]);

  // Geocode an exact address string → {lat, lng}
  const geocodeAddress = async (addr) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (!data.length) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch { return null; }
  };

  const loadStores = async (location, addressOverride = null) => {
    if (!shoe) return;
    setLoading(true);
    setError(null);
    setStores([]);
    setSummary("");

    try {
      const res = await base44.functions.invoke('findNearbyStores', {
        shoe: {
          id: shoe.id,
          name: shoe.name,
          brand: shoe.brand,
          colorway: shoe.colorway || selectedColor || null,
          category: shoe.category,
          sizes_available: shoe.sizes_available || [],
        },
        userLat: location.lat || location.latitude || null,
        userLng: location.lng || location.longitude || null,
        cityFallback: location.city || null,
        exactAddress: addressOverride || null,
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
      });

      const data = res?.data || {};
      if (data.error) {
        setError("Could not find stores: " + data.error);
      } else if (!data.stores?.length) {
        setError("No stores found near " + (location.city || "your location") + ". Try a different address.");
      } else {
        setStores(data.stores.slice(0, maxCount));
        setSummary(data.summary || "");
      }
    } catch (err) {
      setError("Search timed out or failed. Please try again.");
    }
    setLoading(false);
  };

  const handleStart = async () => {
    // If exact address entered, geocode it and use ONLY those coords (ignore GPS)
    if (exactAddress.trim()) {
      setResolving(true);
      const coords = await geocodeAddress(exactAddress.trim());
      setResolving(false);
      // Use geocoded coords if found, otherwise pass null lat/lng so backend uses the address string
      const locationToUse = coords
        ? { city: exactAddress.trim(), lat: coords.lat, lng: coords.lng }
        : { city: exactAddress.trim(), lat: null, lng: null };
      setStarted(true);
      loadStores(locationToUse, exactAddress.trim());
      return;
    }

    // Otherwise try GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const updatedLoc = { ...loc, lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLoc(updatedLoc);
          setStarted(true);
          loadStores(updatedLoc);
        },
        () => { setStarted(true); loadStores(loc); },
        { timeout: 5000 }
      );
    } else {
      setStarted(true);
      loadStores(loc);
    }
  };

  if (!started) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center">
            Find stores carrying <strong>{shoe?.name}</strong>
            {selectedSize ? ` in size US ${selectedSize}` : ""} near you
          </p>
        </div>

        <LocationInput onLocated={(newLoc) => setLoc(newLoc)} compact />

        {/* Exact address for higher accuracy */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Exact address (optional — for higher accuracy)
          </label>
          <input
            type="text"
            value={exactAddress}
            onChange={e => setExactAddress(e.target.value)}
            placeholder="e.g. 50 Dizengoff St, Tel Aviv"
            className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/50"
          />
        </div>

        <button
          onClick={handleStart}
          disabled={resolving}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
          {resolving ? "Finding location…" : `Find Nearby Stores`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-base">{title}</h3>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">near {exactAddress || loc.city}</span>
        </div>
        <button
          onClick={() => { setStarted(false); setStores([]); }}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <MapPin className="w-3 h-3" /> Change location
        </button>
      </div>

      {loading ? (
        <LoadingState shoe={shoe} />
      ) : error ? (
        <div className="py-4 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <LocationInput onLocated={(newLoc) => { setLoc(newLoc); loadStores(newLoc); }} compact />
        </div>
      ) : (
        <>
          {summary && (
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{summary}</p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 flex-shrink-0" />
            AI-ranked by inventory likelihood · Call ahead to confirm availability
          </p>

          <AnimatePresence>
            <div className="space-y-3">
              {stores.map((store, i) => (
                <StoreCard
                  key={`${store.name}_${i}`}
                  store={store}
                  index={i}
                  shoe={shoe}
                  selectedSize={selectedSize}
                />
              ))}
              {stores.length === 0 && (
                <div className="py-6 text-center space-y-2">
                  <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-medium">No stores found near {loc.city}</p>
                  <p className="text-xs text-muted-foreground">Try a different location or increase radius.</p>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(`${shoe?.brand} store ${loc.city}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <MapPin className="w-3 h-3" /> Search on Google Maps
                  </a>
                </div>
              )}
            </div>
          </AnimatePresence>

          {!loading && (
            <button
              onClick={() => loadStores(loc)}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </>
      )}
    </div>
  );
}