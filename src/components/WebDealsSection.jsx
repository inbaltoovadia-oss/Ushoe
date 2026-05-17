/**
 * WebDealsSection — on-demand web deals via Deal Agent.
 * Only shows deals confirmed to ship to the user's location.
 */
import { useState, useEffect } from "react";
import { Globe, Loader2, Tag, RefreshCw, TrendingDown, Clock, Zap, ShieldCheck, ExternalLink, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLocation } from "../lib/locationStore";
import { runWebDealsAgent } from "../lib/webDealsAgent";

const SEARCH_STEPS = [
  "🌐 Connecting to live retailer feeds…",
  "🔍 Scanning for active deals in your region…",
  "💰 Comparing prices across retailers…",
  "📦 Verifying shipping to your location…",
  "✨ Finalizing results…",
];



function LoadingCaption({ city }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [caption, setCaption] = useState(SEARCH_STEPS[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx(i => {
        const next = Math.min(i + 1, SEARCH_STEPS.length - 1);
        setCaption(SEARCH_STEPS[next]);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="relative flex-shrink-0">
          <Globe className="w-5 h-5 text-primary" />
          <Loader2 className="w-3 h-3 text-primary animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={caption}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-semibold text-foreground"
            >
              {caption}
            </motion.p>
          </AnimatePresence>
          <p className="text-[10px] text-muted-foreground mt-0.5">Searching live deals for {city}</p>
        </div>
        <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {SEARCH_STEPS.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-500 ${i <= stepIdx ? "w-2 h-2 bg-primary" : "w-1.5 h-1.5 bg-secondary"}`} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-border/40 p-4 space-y-3 overflow-hidden relative">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-secondary rounded-full animate-pulse" />
            <div className="h-6 w-16 bg-secondary rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-secondary/70 rounded-full animate-pulse" />
          <div className="h-9 w-full bg-secondary/40 rounded-xl animate-pulse mt-1" />
        </div>
      ))}
    </div>
  );
}

function CopyNameButton({ name }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(name).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all"
      style={copied
        ? { background: "rgba(16,185,129,0.12)", color: "#34D399", border: "1px solid rgba(16,185,129,0.25)" }
        : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
      }
      title="Copy shoe name"
    >
      {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      {copied ? "Copied!" : "Copy name"}
    </button>
  );
}

export default function WebDealsSection() {
  const [deals, setDeals] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const loc = getLocation();

  const load = async () => {
    setLoading(true);
    setDeals([]);
    setSummary("");
    const result = await runWebDealsAgent({ city: loc.city });
    setSummary(result.summary);
    // Strict: only keep deals explicitly confirmed to ship to user's country
    const filtered = (result.deals || []).filter(d => d.ships_to_country !== false);
    setDeals(filtered);
    setLoading(false);
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 bg-card border border-border/50 rounded-2xl">
        <Globe className="w-8 h-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground text-center">
          Find live web deals shipping to <strong>{loc.city}</strong>
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

  if (loading) return <LoadingCaption city={loc.city} />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-lg">Web Deals — Ships to {loc.city}</h3>
      </div>

      {summary && (
        <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-3 mb-3">
          <Tag className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-4">
        <ShieldCheck className="w-3 h-3 flex-shrink-0" />
        Only showing deals confirmed to ship to {loc.country || loc.city}. Confirm final price on retailer's site.
      </p>

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
                className="bg-card border border-border/50 rounded-2xl p-4 hover:shadow-md transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{deal.brand}</p>
                    <p className="font-heading font-semibold text-sm leading-snug mt-0.5">{deal.shoe_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground">{deal.store_name}</p>
                      <CopyNameButton name={`${deal.brand} ${deal.shoe_name}`} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-heading font-bold text-lg text-green-600 dark:text-green-400">
                      {deal.currency && deal.currency !== "USD" ? deal.currency + " " : "$"}{deal.deal_price}
                    </p>
                    {deal.original_price && (
                      <p className="text-xs text-muted-foreground line-through">
                        {deal.currency && deal.currency !== "USD" ? deal.currency + " " : "$"}{deal.original_price}
                      </p>
                    )}
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
                  <span className="text-[10px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Ships to you
                  </span>
                </div>

                <div className="mt-auto">
                  {deal.buy_link || deal.store_url ? (
                    <a
                      href={deal.buy_link || deal.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Buy at {deal.store_name}
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(deal.shoe_name + " " + deal.store_name + " buy")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Find at {deal.store_name}
                    </a>
                  )}
                </div>
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