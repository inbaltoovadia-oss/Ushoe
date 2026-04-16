import { useState, useEffect } from "react";
import { Globe, Loader2, Star, Navigation, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getLocation } from "../lib/locationStore";
import { motion } from "framer-motion";

const stockColors = {
  "In stock": "text-green-600 bg-green-50 dark:bg-green-950/30",
  "Limited stock": "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
  "Out of stock": "text-red-500 bg-red-50 dark:bg-red-950/30",
  "Check in store": "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
};

const stockIcons = {
  "In stock": CheckCircle,
  "Limited stock": AlertCircle,
  "Out of stock": XCircle,
  "Check in store": AlertCircle,
};

export default function CompareStores({ shoe }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const loc = getLocation();

  useEffect(() => { load(); }, [shoe?.id]);

  const load = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Find all stores and online retailers selling the ${shoe.brand} ${shoe.name} near or shipping to ${loc.city}.
      Search major physical retailers, brand stores, outlets, AND online stores (Nike.com, Adidas.com, Zappos, Amazon, GOAT, StockX, Foot Locker online, etc).
      For each store include real pricing, stock status, and whether this exact shoe (${shoe.colorway || "any colorway"}, price ~$${shoe.price}) is available.
      For physical stores: include real address near ${loc.city}.
      For online stores: set is_online to true, check if they ship to ${loc.city} / that region, and note the shipping info.
      Highlight the best deal.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          stores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                price: { type: "number" },
                original_price: { type: "number" },
                stock_status: { type: "string" },
                distance_miles: { type: "number" },
                rating: { type: "number" },
                is_best_deal: { type: "boolean" },
                is_online: { type: "boolean" },
                ships_to_location: { type: "boolean" },
                shipping_info: { type: "string" },
                buy_link: { type: "string" },
                phone: { type: "string" },
              },
            },
          },
        },
      },
    });
    setStores((res.stores || []).sort((a, b) => a.price - b.price));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        <Globe className="w-4 h-4 animate-pulse text-primary" />
        <span className="text-sm">AI scanning stores near {loc.city}…</span>
      </div>
    );
  }

  if (stores.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No stores found near {loc.city}.</p>;
  }

  return (
    <div className="space-y-3">
      {stores.map((store, i) => {
        const StockIcon = stockIcons[store.stock_status] || AlertCircle;
        const savings = store.original_price && store.original_price > store.price
          ? store.original_price - store.price : 0;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-card border rounded-2xl p-4 transition-all hover:shadow-md ${
              store.is_best_deal ? "border-green-400/60 ring-1 ring-green-400/30" : "border-border/50"
            }`}
          >
            {store.is_best_deal && (
              <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Best Deal
              </div>
            )}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-semibold text-sm">{store.name}</p>
                  {store.is_online && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-full font-medium">Online</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{store.is_online ? "Online retailer" : store.address}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {store.rating && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {store.rating}
                    </span>
                  )}
                  {store.distance_miles != null && (
                    <span className="text-xs text-primary font-medium">{store.distance_miles.toFixed(1)} mi</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-heading font-bold text-xl">${store.price}</div>
                {savings > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">Save ${savings}</div>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 mt-1 ${stockColors[store.stock_status] || stockColors["Check in store"]}`}>
                  <StockIcon className="w-3 h-3" />
                  {store.stock_status}
                </span>
              </div>
            </div>
            {/* Shipping info for online stores */}
            {store.is_online && (
              <div className={`flex items-center gap-1.5 text-xs mt-2 px-2 py-1 rounded-lg w-fit ${
                store.ships_to_location === false
                  ? "bg-red-50 dark:bg-red-950/30 text-red-600"
                  : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
              }`}>
                {store.ships_to_location === false ? "❌ Doesn't ship to your location" : "✓ Ships to your location"}
                {store.shipping_info && <span className="text-muted-foreground ml-1">· {store.shipping_info}</span>}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              {!store.is_online && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Navigation className="w-3 h-3" /> Directions
                </a>
              )}
              {store.buy_link && (
                <a
                  href={store.buy_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  <ExternalLink className="w-3 h-3" /> {store.is_online ? "Buy Online" : "Buy Here"}
                </a>
              )}
              {!store.is_online && store.phone && (
                <a href={`tel:${store.phone}`} className="text-xs px-3 py-1.5 bg-secondary text-foreground rounded-lg hover:bg-secondary/80">
                  Call
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}