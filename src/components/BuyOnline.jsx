/**
 * BuyOnline — powered by Deal Agent + Inventory Agent running in parallel.
 * Merges pricing/deals with stock/availability for a unified "Buy Online" view.
 */
import { useState, useEffect } from "react";
import {
  Globe, Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle,
  RefreshCw, TrendingDown, Star, Truck, RotateCcw, Tag, Zap, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import { getLocation } from "../lib/locationStore";
import { runDealAgent } from "../lib/dealAgent";
import { runInventoryAgent } from "../lib/inventoryAgent";

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
  // Build a unified retailer list keyed by name
  const map = {};

  // Seed from deal agent
  for (const r of (dealResult?.retailers || [])) {
    const key = r.retailer_name?.toLowerCase();
    if (!key) continue;
    map[key] = {
      name: r.retailer_name,
      deal_price: r.deal_price,
      original_price: r.original_price,
      discount_pct: r.discount_pct || 0,
      discount_value: r.discount_value || 0,
      shipping_free: r.shipping_free,
      shipping_cost: r.shipping_cost,
      estimated_delivery: r.estimated_delivery,
      coupon_code: r.coupon_code,
      deal_type: r.deal_type,
      confidence: r.confidence,
      deal_confirmed: r.deal_confirmed,
      is_best_deal: r.is_best_deal,
      is_time_limited: r.is_time_limited,
      buy_link: r.buy_link,
      stock_status: null,
      sizes_available: [],
    };
  }

  // Enrich with inventory data
  for (const s of (stockResult?.online_stores || [])) {
    const key = s.name?.toLowerCase();
    if (!key) continue;
    if (map[key]) {
      map[key].stock_status = s.stock_status;
      map[key].sizes_available = s.sizes_available || [];
      if (!map[key].buy_link && s.url) map[key].buy_link = s.url;
    } else {
      map[key] = {
        name: s.name,
        deal_price: null,
        original_price: null,
        discount_pct: 0,
        confidence: "medium",
        deal_confirmed: false,
        is_best_deal: false,
        stock_status: s.stock_status,
        sizes_available: s.sizes_available || [],
        buy_link: s.url,
        shipping_free: null,
      };
    }
  }

  return Object.values(map).sort((a, b) => (a.deal_price || 999) - (b.deal_price || 999));
}

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [retailers, setRetailers] = useState([]);
  const [dealSummary, setDealSummary] = useState("");
  const [stockSummary, setStockSummary] = useState("");
  const [bestPrice, setBestPrice] = useState(null);
  const [hasDeals, setHasDeals] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dealsDone, setDealsDone] = useState(false);
  const [stockDone, setStockDone] = useState(false);
  const loc = getLocation();

  useEffect(() => { load(); }, [shoe?.id, selectedSize, selectedColor]);

  const load = async () => {
    setLoading(true);
    setRetailers([]);
    setDealsDone(false);
    setStockDone(false);
    setDealSummary("");
    setStockSummary("");

    let dealResult = null;
    let stockResult = null;

    // Run both agents in parallel, update UI as each finishes
    const dealPromise = runDealAgent({ shoe, city: loc.city, size: selectedSize, color: selectedColor })
      .then(r => {
        dealResult = r;
        setDealSummary(r.summary);
        setHasDeals(r.has_active_deals);
        setBestPrice(r.best_price_found);
        setDealsDone(true);
        setRetailers(mergeResults(dealResult, stockResult));
      });

    const stockPromise = runInventoryAgent({ shoe, city: loc.city, size: selectedSize, color: selectedColor })
      .then(r => {
        stockResult = r;
        setStockSummary(r.summary);
        setStockDone(true);
        setRetailers(mergeResults(dealResult, stockResult));
      });

    await Promise.allSettled([dealPromise, stockPromise]);
    setLoading(false);
  };

  const agentsReady = dealsDone || stockDone;

  if (!agentsReady && loading) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm text-muted-foreground">
            Running Deal Agent + Inventory Agent in parallel…
          </span>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-secondary/60 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (retailers.length === 0 && !loading) {
    return (
      <div className="text-center py-8">
        <Truck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium">No verified retailers found for {loc.city}</p>
        <p className="text-xs text-muted-foreground mt-1">Agents couldn't confirm availability in your region.</p>
        <button onClick={load} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
          <RefreshCw className="w-3 h-3" /> Retry agents
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Agent status pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${
          dealsDone ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"
        }`}>
          <Tag className="w-3 h-3" />
          Deal Agent {dealsDone ? "✓" : <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-0.5" />}
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium ${
          stockDone ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground"
        }`}>
          <CheckCircle className="w-3 h-3" />
          Inventory Agent {stockDone ? "✓" : <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-0.5" />}
        </div>
        {bestPrice && (
          <div className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
            <TrendingDown className="w-3 h-3" />
            Best found: ${bestPrice}
          </div>
        )}
      </div>

      {/* Deal agent summary */}
      {dealSummary && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5 mb-3">
          <Tag className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{dealSummary}</p>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        Live data from Deal + Inventory agents via web search. Verify on retailer site before purchasing.
      </p>

      <div className="space-y-3">
        {retailers.map((r, i) => {
          const savings = r.discount_value || (r.original_price && r.original_price > r.deal_price ? r.original_price - r.deal_price : 0);
          const stockStyle = stockColors[r.stock_status] || "text-muted-foreground bg-secondary";

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${
                r.is_best_deal
                  ? "border-green-400/60 ring-1 ring-green-400/20 shadow-sm shadow-green-400/10"
                  : "border-border/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading font-semibold text-sm">{r.name}</p>
                    {r.is_best_deal && (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Best Deal
                      </span>
                    )}
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
                        {r.confidence} confidence
                      </span>
                    )}
                  </div>

                  {r.coupon_code && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-primary font-semibold">
                      <Zap className="w-3 h-3" />
                      Coupon: <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded">{r.coupon_code}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  {r.deal_price ? (
                    <>
                      <div className="font-heading font-bold text-xl">${r.deal_price}</div>
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

              {/* Meta row */}
              <div className="flex flex-wrap gap-2 mt-3">
                {r.stock_status && (
                  <span className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${stockStyle}`}>
                    {r.stock_status === "In stock" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    {r.stock_status}
                  </span>
                )}
                <span className="text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                  <Truck className="w-3 h-3" />
                  {r.shipping_free ? "Free shipping" : r.shipping_cost ? `$${r.shipping_cost} shipping` : `Ships to ${loc.city}`}
                </span>
                {r.estimated_delivery && (
                  <span className="text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 bg-secondary text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {r.estimated_delivery}
                  </span>
                )}
                {r.sizes_available?.length > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-lg font-medium bg-secondary text-muted-foreground">
                    Sizes: {r.sizes_available.slice(0, 4).join(", ")}{r.sizes_available.length > 4 ? "…" : ""}
                  </span>
                )}
              </div>

              {r.buy_link && (
                <a
                  href={r.buy_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-90 ${
                    r.is_best_deal ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buy at {r.name}
                </a>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Refresh */}
      <button onClick={load} className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto">
        <RefreshCw className="w-3.5 h-3.5" />
        Re-run agents (refresh data)
      </button>
    </div>
  );
}