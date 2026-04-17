import { useState, useEffect } from "react";
import { Trophy, MapPin, Zap, ExternalLink, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getLocation } from "../lib/locationStore";

// Surfaces the single best purchase option for a shoe (price + location + stock)
export default function BestDealBanner({ shoe }) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const loc = getLocation();

  useEffect(() => {
    if (!shoe?.id) return;
    let cancelled = false;
    setLoading(true);
    setDeal(null);

    base44.integrations.Core.InvokeLLM({
      prompt: `You are a deal-finder AI. The user is in ${loc.city} and wants to buy: ${shoe.brand} ${shoe.name} ($${shoe.price}, ${shoe.category}).

Find the single BEST option right now — balancing lowest price, stock availability, and proximity to ${loc.city}.
This could be an online retailer OR a local store.

Return ONE result with:
- source_type: "store" or "online"
- name: retailer or store name
- price: number (in USD)
- distance_label: e.g. "1.2 km away" or "Online" 
- pickup_today: boolean (can the user get it today?)
- stock_label: e.g. "In stock", "Limited stock"
- buy_link: real URL
- why: one sentence on why this is the best option`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          source_type:    { type: "string" },
          name:           { type: "string" },
          price:          { type: "number" },
          distance_label: { type: "string" },
          pickup_today:   { type: "boolean" },
          stock_label:    { type: "string" },
          buy_link:       { type: "string" },
          why:            { type: "string" },
        },
      },
    }).then(res => {
      if (!cancelled && res?.name) setDeal(res);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [shoe?.id]);

  return (
    <AnimatePresence>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Finding best deal near {loc.city}…
        </div>
      )}

      {!loading && deal && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-2 border-amber-400/60 dark:border-amber-600/40 rounded-2xl p-4 shadow-lg shadow-amber-400/10"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-amber-500 rounded-lg">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Best Deal Near You</p>
              <p className="font-heading font-bold text-lg leading-tight">{deal.name}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-heading font-bold text-2xl text-amber-700 dark:text-amber-300">${deal.price}</p>
            </div>
          </div>

          {/* Signals row */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="flex items-center gap-1 text-xs font-medium bg-white/70 dark:bg-black/20 px-2.5 py-1 rounded-full text-amber-800 dark:text-amber-300">
              <MapPin className="w-3 h-3" />
              {deal.distance_label}
            </span>
            {deal.pickup_today && (
              <span className="flex items-center gap-1 text-xs font-medium bg-green-100 dark:bg-green-950/40 px-2.5 py-1 rounded-full text-green-700 dark:text-green-400">
                <Zap className="w-3 h-3" />
                Pickup today
              </span>
            )}
            {deal.stock_label && (
              <span className="text-xs font-medium bg-white/70 dark:bg-black/20 px-2.5 py-1 rounded-full text-amber-800 dark:text-amber-300">
                {deal.stock_label}
              </span>
            )}
          </div>

          {/* Why */}
          {deal.why && (
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 italic mb-3">{deal.why}</p>
          )}

          {/* CTA */}
          {deal.buy_link && (
            <a
              href={deal.buy_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-md shadow-amber-400/30"
            >
              <ExternalLink className="w-4 h-4" />
              {deal.source_type === "store" ? "Get Directions" : "Buy Now"}
            </a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}