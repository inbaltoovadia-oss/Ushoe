import { useState, useEffect } from "react";
import { Globe, Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle, RefreshCw, TrendingDown, Star, Truck, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocation } from "../lib/locationStore";
import { motion } from "framer-motion";

const stockConfig = {
  "In stock":      { color: "text-green-600 bg-green-50 dark:bg-green-950/30", Icon: CheckCircle },
  "Limited stock": { color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", Icon: AlertCircle },
  "Out of stock":  { color: "text-red-500 bg-red-50 dark:bg-red-950/30",       Icon: XCircle },
};

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState(null);
  const loc = getLocation();

  useEffect(() => { load(); }, [shoe?.id, selectedSize, selectedColor]);

  const load = async () => {
    setLoading(true);
    setRetailers([]);
    setPriceRange(null);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the best online retailers currently selling the ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}, listed at ~$${shoe.price}.
${selectedSize ? `Customer needs size: ${selectedSize}.` : ""}
${selectedColor ? `Customer wants color/colorway: ${selectedColor}.` : ""}
Search Nike.com, Adidas.com, Zappos, Amazon, GOAT, StockX, Foot Locker, DSW, Finish Line, Hibbett, and other major retailers.
${selectedSize || selectedColor ? `Only include retailers with this shoe in stock in size ${selectedSize || "any"}${selectedColor ? ` in ${selectedColor}` : ""}.` : ""}
For each retailer provide: name, price (number), original_price if discounted, stock_status ("In stock"/"Limited stock"/"Out of stock"), ships_to_location (bool, based on ${loc.city}), shipping_info (e.g. "Free shipping"), return_policy (e.g. "60-day returns"), buy_link (real URL), retailer_rating (1-5), is_best_deal (bool — mark the one with best price+stock).
Return up to 8 results sorted by price ascending.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          retailers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:             { type: "string" },
                price:            { type: "number" },
                original_price:   { type: "number" },
                stock_status:     { type: "string" },
                ships_to_location:{ type: "boolean" },
                shipping_info:    { type: "string" },
                return_policy:    { type: "string" },
                buy_link:         { type: "string" },
                retailer_rating:  { type: "number" },
                is_best_deal:     { type: "boolean" },
              },
            },
          },
        },
      },
    });

    const sorted = (res.retailers || []).sort((a, b) => (a.price || 0) - (b.price || 0));
    setRetailers(sorted);

    if (sorted.length > 1) {
      const prices = sorted.map(r => r.price).filter(Boolean);
      setPriceRange({ min: Math.min(...prices), max: Math.max(...prices) });
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Globe className="w-4 h-4 animate-pulse text-primary" />
          <span className="text-sm">Searching online retailers for best prices…</span>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-secondary/60 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (retailers.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No online retailers found for this shoe.</p>
        <button onClick={load} className="mt-3 text-xs text-primary hover:underline flex items-center gap-1 mx-auto">
          <RefreshCw className="w-3 h-3" /> Try again
        </button>
      </div>
    );
  }

  const bestPrice = Math.min(...retailers.map(r => r.price).filter(Boolean));

  return (
    <div>
      {/* Price range summary */}
      {priceRange && (
        <div className="flex items-center justify-between mb-4 bg-secondary/50 rounded-2xl px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Price range: </span>
            <span className="font-heading font-bold text-primary">${priceRange.min}</span>
            <span className="text-muted-foreground"> – </span>
            <span className="font-heading font-semibold">${priceRange.max}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            Best: ${bestPrice}
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}

      <div className="space-y-3">
        {retailers.map((r, i) => {
          const stock = stockConfig[r.stock_status] || { color: "text-muted-foreground bg-secondary", Icon: AlertCircle };
          const StockIcon = stock.Icon;
          const savings = r.original_price && r.original_price > r.price ? r.original_price - r.price : 0;
          const isLowest = r.price === bestPrice;

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
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-heading font-semibold text-sm">{r.name}</p>
                    {r.is_best_deal && (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Best Deal
                      </span>
                    )}
                    {isLowest && !r.is_best_deal && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                        Lowest Price
                      </span>
                    )}
                  </div>

                  {/* Retailer rating */}
                  {r.retailer_rating && (
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3 h-3 ${idx < Math.floor(r.retailer_rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-1">{r.retailer_rating}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <div className="font-heading font-bold text-xl">${r.price}</div>
                  {r.original_price > r.price && (
                    <div className="text-xs text-muted-foreground line-through">${r.original_price}</div>
                  )}
                  {savings > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold">Save ${savings}</div>
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Stock status */}
                <span className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${stock.color}`}>
                  <StockIcon className="w-3 h-3" />
                  {r.stock_status}
                </span>

                {/* Ships to */}
                <span className={`text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${
                  r.ships_to_location === false
                    ? "bg-red-50 dark:bg-red-950/30 text-red-600"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                }`}>
                  <Truck className="w-3 h-3" />
                  {r.ships_to_location === false ? `No shipping to ${loc.city}` : r.shipping_info || `Ships to ${loc.city}`}
                </span>

                {/* Return policy */}
                {r.return_policy && (
                  <span className="text-[10px] px-2 py-1 rounded-lg font-medium flex items-center gap-1 bg-secondary text-muted-foreground">
                    <RotateCcw className="w-3 h-3" />
                    {r.return_policy}
                  </span>
                )}
              </div>

              {/* CTA */}
              {r.buy_link && (
                <a
                  href={r.buy_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-90 ${
                    r.is_best_deal
                      ? "bg-green-500 text-white"
                      : "bg-primary text-primary-foreground"
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
    </div>
  );
}