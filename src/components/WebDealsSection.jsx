/**
 * WebDealsSection — on-demand web deals via Deal Agent.
 * Only runs when user clicks "Load Web Deals".
 */
import { useState } from "react";
import { Globe, Loader2, ExternalLink, Tag, RefreshCw, TrendingDown, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation } from "../lib/locationStore";
import { runWebDealsAgent } from "../lib/webDealsAgent";

export default function WebDealsSection() {
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const loc = getLocation();

  const load = async () => {
    setLoading(true);
    const result = await runWebDealsAgent({ city: loc.city });
    setSummary(result.summary);
    setDeals(result.deals || []);
    setLoading(false);
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 bg-card border border-border/50 rounded-2xl">
        <Globe className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground text-center">
          Find live web deals shipping to {loc.city}
        </p>
        <button
          onClick={() => { setStarted(true); load(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Globe className="w-4 h-4" />
          Load Web Deals
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Searching live deals near {loc.city}…</span>
        </div>
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">Web Deals Near {loc.city}</h3>
      </div>

      {summary && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-3">
          <Tag className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
      )}

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No verified web deals found for {loc.city}.</p>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map((deal, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-2xl p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{deal.brand}</p>
                    <p className="font-heading font-semibold text-sm leading-snug mt-0.5">{deal.shoe_name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{deal.store_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-heading font-bold text-lg text-green-600 dark:text-green-400">${deal.deal_price}</p>
                    <p className="text-xs text-muted-foreground line-through">${deal.original_price}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {deal.discount_pct > 0 && (
                    <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingDown className="w-2.5 h-2.5" />
                      -{deal.discount_pct}%
                    </span>
                  )}
                  {deal.category && (
                    <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{deal.category}</span>
                  )}
                  {deal.deal_expires && (
                    <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {deal.deal_expires}
                    </span>
                  )}
                </div>

                {/* Always provide a valid link — use store URL if available and valid, else Google Shopping */}
                <a
                  href={
                    deal.store_url && deal.store_url.startsWith("http")
                      ? deal.store_url
                      : `https://www.google.com/search?tbm=shop&q=${encodeURIComponent((deal.brand || "") + " " + (deal.shoe_name || ""))}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                  Get Deal
                </a>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <button
        onClick={load}
        className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Refresh deals
      </button>
    </div>
  );
}