/**
 * BuyOnline — Shows exact-match and similar retailers with local currency pricing.
 * Catalog/homepage prices remain in USD. This component uses local currency only.
 */
import { useState, useEffect } from "react";
import {
  Globe, Loader2, ExternalLink, CheckCircle, RefreshCw,
  TrendingDown, Truck, Tag, Zap, ShieldCheck, XCircle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { runDealAgent } from "../lib/dealAgent";
import SizeStandardToggle, { DisplaySize } from "./SizeStandardToggle";
import LocationInput from "./LocationInput";
import { fromUSSize } from "../lib/sizeConverter";

const SEARCH_STEPS = [
  { label: "Connecting to retailer feeds…",    detail: "Reaching out to local stores" },
  { label: "Searching Nike & brand stores…",   detail: "Checking official brand websites" },
  { label: "Scanning Foot Locker & JD Sports…",detail: "Checking major sneaker retailers" },
  { label: "Verifying live stock & prices…",   detail: "Confirming in-stock items only" },
  { label: "Comparing & ranking deals…",       detail: "Finding you the best price" },
];

function SearchProgress({ retailersSearched = 0, totalRetailers = 5 }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, SEARCH_STEPS.length - 1));
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const step = SEARCH_STEPS[stepIdx];
  const progressPct = Math.max(8, Math.round(((stepIdx + 1) / SEARCH_STEPS.length) * 100));

  return (
    <div className="py-4 space-y-4">
      {/* Step label */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <Globe className="w-5 h-5 text-primary" />
          <Loader2 className="w-3 h-3 text-primary animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-semibold text-foreground"
            >
              {step.label}
            </motion.p>
          </AnimatePresence>
          <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
        </div>
        <span className="text-xs font-bold text-primary">{progressPct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: "8%" }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-2 justify-center">
        {SEARCH_STEPS.map((s, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i < stepIdx ? "w-2 h-2 bg-primary" :
              i === stepIdx ? "w-3 h-3 bg-primary ring-2 ring-primary/30" :
              "w-2 h-2 bg-secondary"
            }`}
          />
        ))}
      </div>

      {/* Skeleton cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-secondary rounded-full animate-pulse" />
            <div className="h-6 w-20 bg-secondary rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-44 bg-secondary/70 rounded-full animate-pulse" />
          <div className="h-10 w-full bg-secondary/40 rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [retailers, setRetailers]         = useState([]);
  const [similarRetailers, setSimilar]    = useState([]);
  const [dealSummary, setDealSummary]     = useState("");
  const [bestPrice, setBestPrice]         = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [loading, setLoading]             = useState(false);
  const [started, setStarted]             = useState(false);
  const [sizeStandard, setSizeStandard]   = useState("US");
  const [loc, setLoc]                     = useState(getLocation());

  useEffect(() => subscribeLocation(setLoc), []);

  useEffect(() => {
    setStarted(false);
    setRetailers([]);
    setSimilar([]);
    setDealSummary("");
  }, [shoe?.id]);

  const load = async () => {
    setLoading(true);
    setRetailers([]);
    setSimilar([]);
    setDealSummary("");
    setBestPrice(null);

    try {
      const result = await runDealAgent({
        shoe: { ...shoe, _country: loc.country, _countryCode: loc.countryCode },
        city: loc.city,
        size: selectedSize,
        color: selectedColor,
        countryCode: loc.countryCode,
        latitude: loc.latitude || null,
        longitude: loc.longitude || null,
        forceRefresh: true,
      });

      setDealSummary(result.summary || "");
      setBestPrice(result.best_price_found);
      setCurrencySymbol(result.currency_symbol || "$");
      setRetailers(result.retailers || []);
      setSimilar(result.similar_retailers || []);
    } catch (err) {
      console.error("BuyOnline load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  if (!started) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <Globe className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center">
            Find the best prices for <strong>{shoe?.name}</strong>
            {selectedSize ? ` (size ${displaySize} ${sizeStandard})` : ""} near {loc.city}
          </p>
          <p className="text-xs text-muted-foreground/70 text-center bg-secondary/60 rounded-xl px-3 py-2">
            💡 Prices shown in your local currency · Only exact-match in-stock results
          </p>
        </div>

        <LocationInput onLocated={() => {}} compact />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
          {selectedSize && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
              Size: {displaySize} {sizeStandard}
            </span>
          )}
        </div>

        <button
          onClick={() => { setStarted(true); load(); }}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Globe className="w-4 h-4" />
          Search Online Prices
        </button>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Or search directly:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Nike IL", url: "https://www.nike.com/il" },
              { name: "Foot Locker IL", url: "https://www.footlocker.co.il" },
              { name: "Adidas IL", url: "https://www.adidas.co.il" },
            ].map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors flex items-center gap-1">
                {r.name} <ExternalLink className="w-2.5 h-2.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
        <LocationInput onLocated={() => { setStarted(false); }} compact />
      </div>

      {loading && <SearchProgress />}

      {!loading && bestPrice && (
        <div className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 font-semibold w-fit">
          <TrendingDown className="w-3 h-3" />
          Best found: {currencySymbol}{bestPrice}
        </div>
      )}

      {!loading && dealSummary && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
          <Tag className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}

      {!loading && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 flex-shrink-0" />
          Prices sourced live · Shown in {currencySymbol} local currency · Confirm before purchase
        </p>
      )}

      {/* Exact Matches */}
      {!loading && retailers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            Exact Matches
          </p>
          <AnimatePresence>
            {retailers.map((r, i) => (
              <RetailerCard key={r.retailer_name + i} retailer={r} index={i}
                shoe={shoe} selectedSize={selectedSize} sizeStandard={sizeStandard}
                city={loc.city} currencySymbol={currencySymbol} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Similar Options */}
      {!loading && similarRetailers.length > 0 && (
        <div className="space-y-3 mt-1">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Similar Options
          </p>
          <AnimatePresence>
            {similarRetailers.map((r, i) => (
              <RetailerCard key={r.retailer_name + i} retailer={r} index={i}
                shoe={shoe} selectedSize={selectedSize} sizeStandard={sizeStandard}
                city={loc.city} currencySymbol={currencySymbol} dimmed />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* No results */}
      {!loading && retailers.length === 0 && similarRetailers.length === 0 && (
        <div className="text-center py-8">
          <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">No results found near {loc.city}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Try adjusting your location or search again.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { name: "Nike IL", url: "https://www.nike.com/il" },
              { name: "Foot Locker IL", url: "https://www.footlocker.co.il" },
            ].map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                {r.name} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <button onClick={load} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run search
        </button>
      )}
    </div>
  );
}

function RetailerCard({ retailer: r, index, shoe, selectedSize, sizeStandard, city, currencySymbol, dimmed = false }) {
  const isBest = r.is_best_deal && !dimmed;
  const hasDeal = r.discount_pct > 0;
  const shipsOk = r.ships_to_location !== false;

  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${
        isBest ? "border-green-400/60 ring-1 ring-green-400/20" :
        dimmed ? "border-border/30 opacity-80" : "border-border/50"
      }`}
    >
      {isBest && (
        <div className="flex items-center gap-1.5 mb-2 text-green-700 dark:text-green-400">
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wide">Best Deal</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-heading font-semibold text-sm">{r.retailer_name}</p>
            {hasDeal && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5" /> {r.discount_pct}% OFF
              </span>
            )}
          </div>

          {r.coupon_code && (
            <div className="flex items-center gap-1.5 text-[10px] text-primary font-semibold mb-1">
              <Zap className="w-3 h-3" />
              Code: <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded">{r.coupon_code}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] mt-1 flex-wrap">
            {shipsOk ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <Truck className="w-3 h-3" />
                Ships to {city}
                {r.shipping_free ? " · Free shipping" : r.shipping_cost ? ` · ${r.shipping_cost}` : ""}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-500 font-medium">
                <XCircle className="w-3 h-3" /> Does not ship to your region
              </span>
            )}
          </div>

          {displaySize && (
            <div className="mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground font-medium">
                Size {displaySize} {sizeStandard}
              </span>
            </div>
          )}

          {r.confidence === "low" && (
            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Price estimate — confirm on site
            </p>
          )}
        </div>

        {/* Price block */}
        <div className="text-right flex-shrink-0">
          {r.deal_price ? (
            <>
              <div className={`font-heading font-bold text-xl ${isBest ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                {currencySymbol}{r.deal_price}
              </div>
              {r.original_price > r.deal_price && (
                <div className="text-xs text-muted-foreground line-through">{currencySymbol}{r.original_price}</div>
              )}
              {r.discount_value > 0 && (
                <div className="text-[10px] text-green-600 dark:text-green-400 font-semibold">Save {currencySymbol}{r.discount_value.toFixed(0)}</div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic">Check site</div>
          )}
        </div>
      </div>

      {r.buy_link ? (
        <a href={r.buy_link} target="_blank" rel="noopener noreferrer"
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] ${
            isBest ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
          }`}>
          <ExternalLink className="w-3.5 h-3.5" />
          {isBest ? `Best Deal at ${r.retailer_name}` : `Buy at ${r.retailer_name}`}
        </a>
      ) : (
        <a href={`https://www.google.com/search?q=${encodeURIComponent((shoe?.brand || "") + " " + (shoe?.name || "") + " " + r.retailer_name + " buy")}`}
          target="_blank" rel="noopener noreferrer"
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/70 transition-all active:scale-[0.98]">
          <ExternalLink className="w-3.5 h-3.5" />
          Search at {r.retailer_name}
        </a>
      )}
    </motion.div>
  );
}