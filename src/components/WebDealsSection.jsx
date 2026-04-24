/**
 * WebDealsSection — non-catalog deals discovered by the Web Deals Agent.
 * Location-aware, verified, live web data only.
 */
import { useState, useEffect } from "react";
import { Globe, ExternalLink, Tag, Loader2, RefreshCw, Zap, Clock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation, subscribeLocation } from "../lib/locationStore";
import { runWebDealsAgent } from "../lib/webDealsAgent";

const confidenceColors = {
  high:   "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
  medium: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
};

export default function WebDealsSection({ query = "" }) {
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [loc, setLoc] = useState(getLocation());

  useEffect(() => {
    load(loc);
    const unsub = subscribeLocation(newLoc => {
      setLoc(newLoc);
      load(newLoc);
    });
    return unsub;
  }, [query]);

  const load = async (location) => {
    setLoading(true);
    const result = await runWebDealsAgent({ city: location.city, query });
    setDeals(result.deals);
    setSummary(result.summary);
    setLoading(false);
  };

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent/10 rounded-xl">
            <Globe className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl">Web Deals</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Live deals near {loc.city} · Not in catalog</p>
          </div>
        </div>
        <button
          onClick={() => load(loc)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {summary && !loading && (
        <div className="flex items-start gap-2 bg-accent/5 border border-accent/10 rounded-xl px-4 py-3 mb-4">
          <Zap className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-secondary/50 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No verified web deals found near {loc.city} right now.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {deals.map((deal, i) => {
                const discount = deal.discount_pct || (deal.original_price ? Math.round((1 - deal.deal_price / deal.original_price) * 100) : 0);
                return (
                  <motion.a
                    key={i}
                    href={deal.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group bg-card border border-border/50 rounded-2xl p-4 hover:shadow-md hover:border-primary/30 transition-all block"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{deal.brand}</span>
                          {deal.confidence && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${confidenceColors[deal.confidence] || ""}`}>
                              {deal.confidence}
                            </span>
                          )}
                          {deal.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{deal.category}</span>
                          )}
                        </div>
                        <p className="font-heading font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {deal.shoe_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {deal.store_name}
                          {deal.deal_expires && (
                            <span className="ml-1 flex items-center gap-0.5 text-amber-600">
                              <Clock className="w-2.5 h-2.5" /> {deal.deal_expires}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-heading font-bold text-lg text-primary">${deal.deal_price}</div>
                        {deal.original_price > deal.deal_price && (
                          <div className="text-xs text-muted-foreground line-through">${deal.original_price}</div>
                        )}
                        {discount > 0 && (
                          <div className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                            -{discount}%
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Ships to {loc.city}</span>
                      <span className="text-[10px] text-primary font-medium flex items-center gap-1 group-hover:underline">
                        View deal <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </motion.a>
                );
              })}
            </AnimatePresence>
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Web Deals Agent sources live web data. Prices and availability may change — verify before purchasing.
          </p>
        </>
      )}
    </section>
  );
}