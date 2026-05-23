import { useState } from "react";
import { Globe, Loader2, ExternalLink, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import FindNearbyNonCatalog from "./FindNearbyNonCatalog";

export default function WebShoeSearch({ query }) {
  const [tab, setTab] = useState("buy"); // "buy" | "nearby"
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query?.trim()) return;
    setLoading(true);
    setSearched(true);

    const res = await base44.functions.invoke("fastWebSearch", {
      query: query + " shoes buy",
      city: "",
      country: "Israel",
      countryCode: "IL",
      category: "",
    });

    const data = res?.data || {};
    setResults(data.web_picks || []);
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="font-heading font-semibold text-base">Search the Web</span>
        <span className="text-xs text-muted-foreground">
          — can't find "<span className="font-medium text-foreground">{query}</span>" in our catalog?
        </span>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-5 w-fit">
        <button
          onClick={() => setTab("buy")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "buy"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> Buy Online
        </button>
        <button
          onClick={() => setTab("nearby")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "nearby"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" /> Find Nearby
        </button>
      </div>

      {/* Buy Online tab */}
      {tab === "buy" && (
        <>
          {!searched ? (
            <button
              onClick={search}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Globe className="w-4 h-4" /> Search Web for "{query}"
            </button>
          ) : (
            <>
              {loading && (
                <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Searching the web…</span>
                </div>
              )}

              <AnimatePresence>
                {results && !loading && (
                  <div className="space-y-3">
                    {results.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No web results found. Try a more specific search term.
                      </p>
                    )}
                    {results.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.retailer || r.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {r.price && <span className="text-primary font-bold text-sm">{r.price}</span>}
                            {r.discount_percent > 0 && (
                              <span className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">
                                {r.discount_percent}% OFF
                              </span>
                            )}
                            {r.estimated_shipping && (
                              <span className="text-xs text-muted-foreground">{r.estimated_shipping}</span>
                            )}
                          </div>
                        </div>
                        {r.buy_link && (
                          <a
                            href={r.buy_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </motion.div>
                    ))}

                    {/* Fallback links */}
                    <div className="pt-2 border-t border-border flex gap-2 flex-wrap">
                      <p className="w-full text-xs text-muted-foreground mb-1">Also search on:</p>
                      <a href="https://www.footlocker.co.il" target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors flex items-center gap-1">
                        Foot Locker IL <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                      </a>
                      <a href="https://www.farfetch.com/il" target="_blank" rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors flex items-center gap-1">
                        Farfetch IL <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                      </a>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </>
          )}
        </>
      )}

      {/* Find Nearby tab */}
      {tab === "nearby" && (
        <FindNearbyNonCatalog query={query} />
      )}
    </div>
  );
}