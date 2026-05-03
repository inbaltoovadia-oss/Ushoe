/**
 * BuyOnline — Deal Agent + Inventory Agent + Shipping Validation running in parallel.
 * Shows ranked retailer list: best deal first, then other verified stores.
 * Shipping validation filters out region-blocked retailers.
 */
import { useState, useEffect } from "react";
import {
  Globe, Loader2, ExternalLink, CheckCircle, AlertCircle,
  RefreshCw, TrendingDown, Truck, Tag, Zap, Clock, ShieldCheck, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation } from "../lib/locationStore";
import { runDealAgent } from "../lib/dealAgent";
import { runInventoryAgent } from "../lib/inventoryAgent";
import { runShippingAgent, mergeShippingValidation } from "../lib/shippingAgent";
import AuthenticityBadge from "./AuthenticityBadge";
import DeliveryConfidenceBadges from "./DeliveryConfidenceBadges";

const confidenceBadge = {
  high:   "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
  medium: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
  low:    "bg-secondary text-muted-foreground",
};

const stockColors = {
  "In stock":       "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock":  "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  "Out of stock":   "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

function mergeResults(dealResult, stockResult) {
  const map = {};

  for (const r of (dealResult?.retailers || [])) {
    const key = (r.retailer_name || "").toLowerCase();
    if (!key) continue;
    map[key] = {
      name:               r.retailer_name,
      deal_price:         r.deal_price,
      original_price:     r.original_price,
      discount_pct:       r.discount_pct || 0,
      discount_value:     r.discount_value || 0,
      shipping_free:      r.shipping_free,
      shipping_cost:      r.shipping_cost,
      estimated_delivery: r.estimated_delivery,
      coupon_code:        r.coupon_code,
      deal_type:          r.deal_type,
      confidence:         r.confidence,
      deal_confirmed:     r.deal_confirmed,
      is_best_deal:       r.is_best_deal,
      is_time_limited:    r.is_time_limited,
      ships_to_location:  r.ships_to_location,
      buy_link:           r.buy_link,
      stock_status:       null,
      sizes_available:    [],
      shipping_validated: false,
    };
  }

  for (const s of (stockResult?.online_stores || [])) {
    const key = (s.name || "").toLowerCase();
    if (!key) continue;
    if (map[key]) {
      map[key].stock_status    = s.stock_status;
      map[key].sizes_available = s.sizes_available || [];
      if (!map[key].buy_link && s.url) map[key].buy_link = s.url;
    } else {
      map[key] = {
        name:               s.name,
        deal_price:         null,
        original_price:     null,
        discount_pct:       0,
        confidence:         "medium",
        deal_confirmed:     false,
        is_best_deal:       false,
        stock_status:       s.stock_status,
        sizes_available:    s.sizes_available || [],
        buy_link:           s.url,
        ships_to_location:  s.ships_to_location,
        shipping_free:      null,
        shipping_validated: false,
      };
    }
  }

  // Sort: best deal first, then by price
  return Object.values(map).sort((a, b) => {
    if (a.is_best_deal && !b.is_best_deal) return -1;
    if (!a.is_best_deal && b.is_best_deal) return 1;
    return (a.deal_price || 999) - (b.deal_price || 999);
  });
}

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [retailers, setRetailers]       = useState([]);
  const [dealSummary, setDealSummary]   = useState("");
  const [stockSummary, setStockSummary] = useState("");
  const [shippingSummary, setShippingSummary] = useState("");
  const [bestPrice, setBestPrice]       = useState(null);
  const [hasDeals, setHasDeals]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [started, setStarted]           = useState(false);
  const [dealsDone, setDealsDone]       = useState(false);
  const [stockDone, setStockDone]       = useState(false);
  const [shippingDone, setShippingDone] = useState(false);
  const loc = getLocation();

  // Reset when shoe changes so user can re-trigger
  useEffect(() => {
    setStarted(false);
    setRetailers([]);
    setDealsDone(false);
    setStockDone(false);
    setShippingDone(false);
    setDealSummary("");
    setStockSummary("");
    setShippingSummary("");
  }, [shoe?.id]);

  const load = async () => {
    setLoading(true);
    setRetailers([]);
    setDealsDone(false);
    setStockDone(false);
    setShippingDone(false);
    setDealSummary("");
    setStockSummary("");
    setShippingSummary("");

    let dealResult = null;
    let stockResult = null;
    let shippingResult = null;

    const dealPromise = runDealAgent({ shoe: { ...shoe, _country: loc.country }, city: loc.city, size: selectedSize, color: selectedColor })
      .then(r => {
        dealResult = r;
        setDealSummary(r.summary);
        setHasDeals(r.has_active_deals);
        setBestPrice(r.best_price_found);
        setDealsDone(true);
        setRetailers(mergeResults(dealResult, stockResult));
      });

    const stockPromise = runInventoryAgent({ shoe: { ...shoe, _country: loc.country }, city: loc.city, size: selectedSize, color: selectedColor })
      .then(r => {
        stockResult = r;
        setStockSummary(r.summary);
        setStockDone(true);
        setRetailers(mergeResults(dealResult, stockResult));
      });

    // Run shipping validation after deals/stock initiate (needs retailer list)
    const shippingPromise = Promise.allSettled([dealPromise, stockPromise]).then(async () => {
      const allRetailers = [
        ...(dealResult?.retailers || []),
        ...(stockResult?.online_stores || []).map(s => ({ retailer_name: s.name })),
      ];
      shippingResult = await runShippingAgent({
        shoe, country: loc.country, city: loc.city, retailers: allRetailers,
      });
      setShippingSummary(shippingResult.summary);
      setShippingDone(true);

      // Re-merge with shipping validation applied
      const merged = mergeResults(dealResult, stockResult);
      const validated = mergeShippingValidation(merged, shippingResult);
      setRetailers(validated.length > 0 ? validated : merged);
    });

    await Promise.allSettled([dealPromise, stockPromise, shippingPromise]);
    setLoading(false);
  };

  const agentsReady = dealsDone || stockDone;

  // Not yet started — show a prompt button
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Globe className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground text-center">Find the best online prices for this shoe near {loc.city}</p>
        <button
          onClick={() => { setStarted(true); load(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Globe className="w-4 h-4" />
          Search Online Prices
        </button>
      </div>
    );
  }

  if (!agentsReady && loading) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1.5">
            {[0, 150, 300].map(d => (
              <div key={d} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">Running Deal + Inventory + Shipping agents…</span>
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-secondary/60 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  if (retailers.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <Truck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium">No verified retailers found for {loc.city}</p>
        <p className="text-xs text-muted-foreground mt-1">Agents couldn't confirm availability in your region.</p>
        <button onClick={() => load()} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Agent status pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { done: dealsDone,     icon: Tag,         label: "Deal Agent" },
          { done: stockDone,     icon: CheckCircle, label: "Inventory Agent" },
          { done: shippingDone,  icon: ShieldCheck, label: "Shipping Validator" },
        ].map(({ done, icon: Icon, label }) => (
          <div key={label} className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${
            done ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"
          }`}>
            <Icon className="w-3 h-3" />
            {label} {done ? "✓" : <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-0.5" />}
          </div>
        ))}
        {bestPrice && (
          <div className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            <TrendingDown className="w-3 h-3" />
            Best: ${bestPrice}
          </div>
        )}
      </div>

      {/* Summaries */}
      {dealSummary && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5 mb-2">
          <Tag className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}
      {shippingSummary && shippingDone && (
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl px-3 py-2.5 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{shippingSummary}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        Results verified by Deal + Inventory + Shipping agents. Always confirm on retailer site.
      </p>

      {/* Retailer list */}
      <div className="space-y-3">
        <AnimatePresence>
          {retailers.map((r, i) => {
            const savings = r.discount_value || (r.original_price && r.original_price > r.deal_price ? r.original_price - r.deal_price : 0);
            const stockStyle = stockColors[r.stock_status] || "text-muted-foreground bg-secondary";
            const isBest = r.is_best_deal;
            const shipsOk = r.ships_to_region !== false && r.ships_to_location !== false;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${
                  isBest
                    ? "border-green-400/60 ring-1 ring-green-400/20 shadow-sm shadow-green-400/10"
                    : "border-border/50"
                }`}
              >
                {/* Best deal header banner */}
                {isBest && (
                  <div className="flex items-center gap-1.5 mb-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wide">Best Deal — Verified</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold text-sm">{r.name}</p>
                      <AuthenticityBadge retailerName={r.name} compact />
                      {r.deal_type === "clearance" && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">Clearance</span>
                      )}
                      {r.is_time_limited && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Limited Time
                        </span>
                      )}
                      {r.confidence && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceBadge[r.confidence] || confidenceBadge.low}`}>
                          {r.confidence}
                        </span>
                      )}
                    </div>

                    {r.coupon_code && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-primary font-semibold">
                        <Zap className="w-3 h-3" />
                        Coupon: <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded">{r.coupon_code}</span>
                      </div>
                    )}

                    <DeliveryConfidenceBadges
                      retailerName={r.name}
                      shippingFree={r.shipping_free}
                      estimatedDelivery={r.estimated_delivery}
                      shipsToLocation={r.ships_to_location}
                    />
                    {/* Shipping status */}
                    <div className="mt-1.5 flex items-center gap-1 text-[10px]">
                      {shipsOk ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <Truck className="w-3 h-3" />
                          Ships to {loc.city}
                          {r.estimated_delivery ? ` · ${r.estimated_delivery}` : ""}
                        </span>
                      ) : r.ships_to_region === false ? (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <XCircle className="w-3 h-3" /> Does not ship to your region
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {r.shipping_free ? "Free shipping" : r.shipping_cost ? `$${r.shipping_cost} shipping` : "Shipping TBD"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    {r.deal_price ? (
                      <>
                        <div className={`font-heading font-bold text-xl ${isBest ? "text-green-600 dark:text-green-400" : ""}`}>
                          ${r.deal_price}
                        </div>
                        {r.original_price > r.deal_price && (
                          <div className="text-xs text-muted-foreground line-through">${r.original_price}</div>
                        )}
                        {savings > 0 && (
                          <div className="text-xs text-green-600 dark:text-green-400 font-semibold">Save ${savings.toFixed(0)}</div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">Price N/A</div>
                    )}
                  </div>
                </div>

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.stock_status && (
                    <span className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${stockStyle}`}>
                      {r.stock_status === "In stock" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {r.stock_status}
                    </span>
                  )}
                  {r.sizes_available?.length > 0 && (
                    <span className="text-[10px] px-2 py-1 rounded-lg font-medium bg-secondary text-muted-foreground">
                      Sizes: {r.sizes_available.slice(0, 4).join(", ")}{r.sizes_available.length > 4 ? "…" : ""}
                    </span>
                  )}
                  {r.pickup_available && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-medium">
                      Pickup available
                    </span>
                  )}
                </div>

                {r.buy_link && (
                  <a
                    href={r.buy_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-90 ${
                      isBest ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isBest ? `Best Deal at ${r.name}` : `Buy at ${r.name}`}
                  </a>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button onClick={load} className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
        <RefreshCw className="w-3.5 h-3.5" />
        Re-run all agents
      </button>
    </div>
  );
}