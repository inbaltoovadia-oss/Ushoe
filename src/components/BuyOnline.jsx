import { useState, useEffect } from "react";
import { Globe, Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocation } from "../lib/locationStore";
import { motion } from "framer-motion";

const stockColors = {
  "In stock": "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock": "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
  "Out of stock": "text-red-500 bg-red-50 dark:bg-red-950/30",
};

const stockIcons = {
  "In stock": CheckCircle,
  "Limited stock": AlertCircle,
  "Out of stock": XCircle,
};

export default function BuyOnline({ shoe, selectedSize = null, selectedColor = null }) {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const loc = getLocation();

  useEffect(() => { load(); }, [shoe?.id, selectedSize, selectedColor]);

  const load = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the best online retailers currently selling the ${shoe.brand} ${shoe.name} (${shoe.colorway || "any colorway"}, ~$${shoe.price}).
${selectedSize ? `The customer needs size ${selectedSize} specifically.` : ""}
${selectedColor ? `The customer wants the color/colorway: ${selectedColor}.` : ""}
Search Nike.com, Adidas.com, Zappos, Amazon, GOAT, StockX, Foot Locker, DSW, Finish Line, and other major online shoe retailers.
${selectedSize || selectedColor ? `IMPORTANT: Only include retailers that have this shoe in stock in${selectedSize ? ` size ${selectedSize}` : ""}${selectedColor ? ` ${selectedColor}` : ""}. Skip any retailer that doesn't have the exact size${selectedColor ? " and color" : ""} available.` : ""}
For each retailer: check if they ship to ${loc.city}, provide a real buy link, current price, stock status, and any shipping/return highlights.
Mark the best deal. Return up to 8 results.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          retailers: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                price: { type: "number" },
                original_price: { type: "number" },
                stock_status: { type: "string" },
                ships_to_location: { type: "boolean" },
                shipping_info: { type: "string" },
                buy_link: { type: "string" },
                is_best_deal: { type: "boolean" },
                rating: { type: "number" },
              },
            },
          },
        },
      },
    });
    setRetailers((res.retailers || []).sort((a, b) => a.price - b.price));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        <Globe className="w-4 h-4 animate-pulse text-primary" />
        <span className="text-sm">Searching online retailers…</span>
      </div>
    );
  }

  if (retailers.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No online retailers found.</p>;
  }

  return (
    <div className="space-y-3">
      {retailers.map((r, i) => {
        const StockIcon = stockIcons[r.stock_status] || AlertCircle;
        const savings = r.original_price && r.original_price > r.price ? r.original_price - r.price : 0;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${
              r.is_best_deal ? "border-green-400/60 ring-1 ring-green-400/30" : "border-border/50"
            }`}
          >
            {r.is_best_deal && (
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Best Deal
              </div>
            )}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm">{r.name}</p>
                <div className={`flex items-center gap-1.5 text-xs mt-1.5 px-2 py-1 rounded-lg w-fit ${
                  r.ships_to_location === false
                    ? "bg-red-50 dark:bg-red-950/30 text-red-600"
                    : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                }`}>
                  {r.ships_to_location === false ? "❌ Doesn't ship to your location" : "✓ Ships to your location"}
                  {r.shipping_info && <span className="text-muted-foreground ml-1">· {r.shipping_info}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-heading font-bold text-xl">${r.price}</div>
                {savings > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">Save ${savings}</div>
                )}
                {r.stock_status && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 mt-1 ${stockColors[r.stock_status] || "text-muted-foreground bg-secondary"}`}>
                    <StockIcon className="w-3 h-3" />
                    {r.stock_status}
                  </span>
                )}
              </div>
            </div>
            {r.buy_link && (
              <a
                href={r.buy_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 w-fit"
              >
                <ExternalLink className="w-3 h-3" /> Buy Online
              </a>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}