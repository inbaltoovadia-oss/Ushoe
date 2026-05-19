/**
 * BuyOnline — Rebuilt with:
 * - Size standard toggle (US / EU / UK)
 * - LocationInput with GPS + manual entry
 * - Real retailer data via fastWebSearch backend
 * - Accurate deal badges, shipping info, direct buy links
 */
import { useState, useEffect } from "react";
import {
  Globe, Loader2, ExternalLink, CheckCircle, AlertCircle,
  RefreshCw, TrendingDown, Truck, Tag, Zap, Clock, ShieldCheck, XCircle, Copy, Search, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { runDealAgent } from "../lib/dealAgent";
import { formatLocalPrice, getCurrencyForCountry } from "../lib/currencyConverter";
import SearchingState from "./SearchingState";
import { getRetailersForCountry } from "../lib/retailerDirectory";
import SizeStandardToggle, { DisplaySize } from "./SizeStandardToggle";
import LocationInput from "./LocationInput";
import { fromUSSize } from "../lib/sizeConverter";

function mergeRetailers(dealResult, stockResult) {
  const map = {};

  for (const r of (dealResult?.retailers || [])) {
    const key = (r.retailer_name || "").toLowerCase();
    if (!key) continue;
    map[key] = { ...r, stock_status: null, url: r.buy_link || null };
  }

  for (const s of (stockResult?.online_stores || [])) {
    const key = (s.name || "").toLowerCase();
    if (!key) continue;
    if (map[key]) {
      map[key].stock_status = s.stock_status;
      if (!map[key].url && s.url) map[key].url = s.url;
    } else {
      map[key] = {
        retailer_name:    s.name,
        deal_price:       s.price,
        original_price:   null,
        discount_pct:     0,
        shipping_free:    null,
        confidence:       "medium",
        deal_confirmed:   false,
        is_best_deal:     false,
        ships_to_location: s.ships_to_location,
        stock_status:     s.stock_status,
        url:              s.url,
      };
    }
  }

  return Object.values(map).sort((a, b) => {
    if (a.is_best_deal && !b.is_best_deal) return -1;
    if (!a.is_best_deal && b.is_best_deal) return 1;
    return (a.deal_price || 9999) - (b.deal_price || 9999);
  });
}

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [retailers, setRetailers]     = useState([]);
  const [dealSummary, setDealSummary] = useState("");
  const [bestPrice, setBestPrice]     = useState(null);
  const [loading, setLoading]         = useState(false);
  const [started, setStarted]         = useState(false);
  const [dealsDone, setDealsDone]     = useState(false);
  const [stockDone, setStockDone]     = useState(false);
  const [sizeStandard, setSizeStandard] = useState("US");
  const [loc, setLoc]                 = useState(getLocation());
  const [copied, setCopied]           = useState(false);

  useEffect(() => subscribeLocation(setLoc), []);

  useEffect(() => {
    setStarted(false);
    setRetailers([]);
    setDealsDone(false);
    setStockDone(false);
    setDealSummary("");
    setCopied(false);
  }, [shoe?.id]);

  const load = async () => {
    setLoading(true);
    setRetailers([]);
    setDealsDone(false);
    setStockDone(false);
    setDealSummary("");

    const agentArgs = {
      shoe: { ...shoe, _country: loc.country, _countryCode: loc.countryCode },
      city: loc.city,
      size: selectedSize,
      color: selectedColor,
      countryCode: loc.countryCode,
    };

    // Run only ONE search — deal agent gets all retailer data including stock
    const dealResult = await runDealAgent(agentArgs);
    setDealSummary(dealResult.summary);
    setBestPrice(dealResult.best_price_found);
    setDealsDone(true);
    setStockDone(true);
    setRetailers(mergeRetailers(dealResult, null));
    setLoading(false);
  };

  const directRetailers = getRetailersForCountry(loc.countryCode, shoe?.name, shoe?.brand);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shoe?.name || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Convert selected size for display
  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  if (!started) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col items-center gap-3">
          <Globe className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground text-center">
            Find the best online prices for <strong>{shoe?.name}</strong>{selectedSize ? ` (size ${displaySize} ${sizeStandard})` : ""} near {loc.city}
          </p>
        </div>

        <LocationInput onLocated={() => {}} compact />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
          {selectedSize && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
              Selected: {displaySize} {sizeStandard}
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

        {/* Direct search links */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Or search directly:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Foot Locker IL", url: "https://www.footlocker.co.il" },
              { name: "Farfetch IL", url: "https://www.farfetch.com/il" },
            ].map(r => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors flex items-center gap-1"
              >
                {r.name} <ExternalLink className="w-2.5 h-2.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const agentsReady = dealsDone || stockDone;

  if (!agentsReady && loading) {
    return <SearchingState city={loc.city} shoe={shoe} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SizeStandardToggle standard={sizeStandard} onChange={setSizeStandard} />
        <LocationInput onLocated={() => { setStarted(false); }} compact />
      </div>

      {/* Step-by-step guide */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">How to buy this shoe online:</p>
        </div>
        <ol className="space-y-2 text-xs text-blue-700 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Click a "Buy" button above to visit the retailer's website</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>If a page shows "Not Found" or error, copy the shoe name below:</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-700">
                <span className="text-xs truncate font-medium">{shoe?.name}</span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex-shrink-0"
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold">4.</span>
            <span>Paste it into the retailer's search bar and search again</span>
          </li>
        </ol>
      </div>

      {bestPrice && (
        <div className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 font-semibold w-fit">
          <TrendingDown className="w-3 h-3" />
          Best found: {bestPrice}
        </div>
      )}

      {dealSummary && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
          <Tag className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
        Prices sourced live from retailer sites. Always confirm final price before purchase.
      </p>

      {retailers.length === 0 && !loading && (
        <div className="text-center py-8">
          <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">No retailers found near {loc.city}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Try adjusting your location or search again.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { name: "Foot Locker IL", url: "https://www.footlocker.co.il" },
              { name: "Farfetch IL", url: "https://www.farfetch.com/il" },
            ].map(r => (
              <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                {r.name} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-3">
          {retailers.map((r, i) => (
              <RetailerCard
                key={r.retailer_name + i}
                retailer={r}
                index={i}
                shoe={shoe}
                selectedSize={selectedSize}
                sizeStandard={sizeStandard}
                city={loc.city}
                countryCode={loc.countryCode}
                directRetailers={directRetailers}
              />
          ))}
        </div>
      </AnimatePresence>

      {!loading && (
        <button onClick={load} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          Re-run search
        </button>
      )}
    </div>
  );
}

function RetailerCard({ retailer: r, index, shoe, selectedSize, sizeStandard, city, countryCode, directRetailers }) {
  const isBest = r.is_best_deal;
  const hasDeal = r.discount_pct > 0;
  const shipsOk = r.ships_to_location !== false;

  // Build buy link: prefer agent-provided, then retailer directory
  const directEntry = directRetailers.find(d => d.name.toLowerCase().includes((r.retailer_name || "").toLowerCase().split(" ")[0]) || (r.retailer_name || "").toLowerCase().includes(d.name.toLowerCase().split(" ")[0]));
  const buyLink = r.url || r.buy_link || directEntry?.url || null;

  // Prices are already in the website's local currency - display as-is
  const displayCurrency = r.currency || "USD";

  const stockStyle = {
    "In stock":       "text-green-600 bg-green-50 dark:bg-green-950/30",
    "Limited stock":  "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    "Out of stock":   "text-red-500 bg-red-50 dark:bg-red-950/30",
    "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
  }[r.stock_status] || "text-muted-foreground bg-secondary";

  const displaySize = selectedSize && sizeStandard !== "US"
    ? fromUSSize(selectedSize, sizeStandard, shoe?.gender)
    : selectedSize;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${
        isBest ? "border-green-400/60 ring-1 ring-green-400/20" : "border-border/50"
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
            {r.is_time_limited && (
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Limited Time
              </span>
            )}
          </div>

          {r.coupon_code && (
            <div className="flex items-center gap-1.5 text-[10px] text-primary font-semibold mb-1">
              <Zap className="w-3 h-3" />
              Code: <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded">{r.coupon_code}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] mt-1">
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

          {r.stock_status && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${stockStyle}`}>
                {r.stock_status}
              </span>
              {displaySize && (
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground font-medium">
                  Size {displaySize} {sizeStandard}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price block */}
        <div className="text-right flex-shrink-0">
          {r.deal_price ? (
            <>
              <div className={`font-heading font-bold text-xl ${isBest ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
                {r.price || `${displayCurrency === "ILS" ? "₪" : displayCurrency === "EUR" ? "€" : displayCurrency === "GBP" ? "£" : "$"}${r.deal_price}`}
              </div>
              {r.original_price && r.original_price > r.deal_price && (
                <div className="text-xs text-muted-foreground line-through">
                  {r.original_price}
                </div>
              )}
              {r.discount_value && r.discount_value > 0 && (
                <div className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                  Save {displayCurrency === "ILS" ? "₪" : displayCurrency === "EUR" ? "€" : displayCurrency === "GBP" ? "£" : "$"}{r.discount_value.toFixed(0)}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic">Check site</div>
          )}
        </div>
      </div>

      {buyLink ? (
        <a
          href={buyLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] ${
            isBest ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {isBest ? `Best Deal at ${r.retailer_name}` : `Buy at ${r.retailer_name}`}
        </a>
      ) : (
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent((shoe?.brand || "") + " " + (shoe?.name || "") + " " + r.retailer_name + " buy")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-secondary/70 transition-all active:scale-[0.98]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Search at {r.retailer_name}
        </a>
      )}
    </motion.div>
  );
}