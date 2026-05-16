/**
 * LiveTrendsSection — powered by Trend Agent (14-day cache).
 * Shows real-world hype scores, brand momentum, and macro trend themes.
 * Only calls the LLM once per 2 weeks per city.
 */
import { useState, useEffect } from "react";
import { TrendingUp, Flame, Zap, ArrowUpRight, RefreshCw, Loader2, Globe, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { runTrendAgent } from "../lib/trendAgent";
import { getLocation } from "../lib/locationStore";

const momentumColor = {
  rising:   "text-green-600 bg-green-50 dark:bg-green-950/30",
  stable:   "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  declining:"text-red-500 bg-red-50 dark:bg-red-950/30",
};

export default function LiveTrendsSection() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const loc = getLocation();

  const load = async (force = false) => {
    setLoading(true);
    if (force) {
      // Clear the cache entry so the agent re-fetches
      try {
        const PREFIX = "ushoe_agent_";
        Object.keys(localStorage)
          .filter(k => k.startsWith(`${PREFIX}trends_`))
          .forEach(k => localStorage.removeItem(k));
      } catch (_) {}
    }
    const result = await runTrendAgent({ city: loc.city });
    setData(result);
    setLoading(false);
  };

  if (!started) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-3 text-center">
        <Globe className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Load real-world trend data from sneaker communities & resale platforms</p>
        <p className="text-[10px] text-muted-foreground/60">Refreshes every 2 weeks · Results cached locally</p>
        <button
          onClick={() => { setStarted(true); load(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <TrendingUp className="w-4 h-4" />
          Load Live Trends
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Trend Agent scanning sneaker communities…</p>
        <p className="text-[10px] text-muted-foreground/60">This takes ~10 seconds but results are cached for 2 weeks</p>
      </div>
    );
  }

  if (!data) return null;

  const refreshedDate = data.refreshed_at
    ? new Date(data.refreshed_at).toLocaleDateString()
    : "recently";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground">Last updated: {refreshedDate} · Cached 14 days</span>
          </div>
          <button onClick={() => load(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-3 h-3" /> Force refresh
          </button>
        </div>

        {/* Summary */}
        {data.summary && (
          <div className="bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3">
            <p className="text-sm text-muted-foreground">{data.summary}</p>
          </div>
        )}

        {/* Trend Themes */}
        {data.trend_themes?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.trend_themes.map((theme, i) => (
              <span key={i} className="text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" />{theme}
              </span>
            ))}
          </div>
        )}

        {/* Top Trending Shoes */}
        {data.top_shoes?.length > 0 && (
          <div>
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-accent" /> Hottest Right Now
            </h3>
            <div className="space-y-2">
              {data.top_shoes.map((shoe, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 bg-card border border-border/50 rounded-2xl p-3"
                >
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : "bg-secondary text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{shoe.brand} {shoe.name}</p>
                      <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground">{shoe.category}</span>
                      {shoe.release_recency === "recent" && (
                        <span className="text-[10px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">New Drop</span>
                      )}
                      {shoe.release_recency === "upcoming" && (
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium">Upcoming</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{shoe.reason_trending}</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-accent font-bold text-sm">
                      <ArrowUpRight className="w-3 h-3" />
                      {shoe.hype_score}
                    </div>
                    {shoe.avg_resale_price && (
                      <p className="text-[10px] text-muted-foreground">Resale ~${shoe.avg_resale_price}</p>
                    )}
                    {shoe.buy_url && (
                      <a
                        href={shoe.buy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] flex items-center gap-0.5 text-primary hover:underline font-medium"
                      >
                        Buy <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Brand Momentum */}
        {data.top_brands?.length > 0 && (
          <div>
            <h3 className="font-heading font-semibold text-sm mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Brand Momentum
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.top_brands.map((b, i) => (
                <div key={i} className="bg-card border border-border/50 rounded-2xl px-3 py-2 flex items-center gap-2">
                  <span className="font-semibold text-sm">{b.brand}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${momentumColor[b.momentum] || momentumColor.stable}`}>
                    {b.momentum}
                  </span>
                  <span className="text-[10px] text-muted-foreground max-w-[120px] truncate">{b.key_reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}