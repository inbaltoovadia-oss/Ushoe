import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Brain, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getWishlistIds } from "../../lib/wishlistStore";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";

export default function AIRecommendations() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasoning, setReasoning] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasSignals, setHasSignals] = useState(false);

  useEffect(() => {
    load();
  }, [refreshKey]);

  const load = async () => {
    setLoading(true);
    setReasoning("");

    try {
      // Gather signals in parallel
      const [allShoes, searchHistory, wishlistItems] = await Promise.all([
        base44.entities.Shoe.list("-trending_score", 80),
        base44.entities.SearchHistory.list("-created_date", 10),
        base44.entities.WishlistItem.list("-created_date", 20),
      ]);

      const wishlistIds = Array.from(getWishlistIds());
      const wishlistNames = wishlistItems.map(w => `${w.shoe_brand} ${w.shoe_name}`);
      const recentSearches = searchHistory.map(s => s.query);

      const hasAnySignal = wishlistNames.length > 0 || recentSearches.length > 0;
      setHasSignals(hasAnySignal);

      if (!hasAnySignal) {
        // Fall back to top trending
        setShoes(allShoes.slice(0, 6));
        setReasoning("Start saving shoes to your wishlist or searching to get personalized picks!");
        setLoading(false);
        return;
      }

      const catalog = allShoes
        .filter(s => !wishlistIds.includes(s.id))
        .map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} [${s.category}]`)
        .join("\n");

      const aiRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a personal shoe stylist AI. Based on the user's behavior, recommend 6 shoes from the catalog.

User's Wishlist (shoes they love):
${wishlistNames.length ? wishlistNames.join(", ") : "None yet"}

User's Recent Searches:
${recentSearches.length ? recentSearches.join(", ") : "None yet"}

Shoe Catalog (index: brand name price [category]):
${catalog}

Instructions:
- Pick exactly 6 shoes from the catalog by their index number.
- Infer the user's style, budget range, and preferred categories from their wishlist and searches.
- Vary the picks — don't pick all the same brand/category.
- Write a short 1-sentence personalized reasoning (e.g. "Based on your love of running shoes and Nike...").
- Prioritize shoes they haven't seen or saved yet.`,
        response_json_schema: {
          type: "object",
          properties: {
            reasoning: { type: "string" },
            picks: {
              type: "array",
              items: { type: "number" },
            },
          },
        },
      });

      const picked = (aiRes.picks || [])
        .filter(i => i >= 0 && i < allShoes.filter(s => !wishlistIds.includes(s.id)).length)
        .slice(0, 6)
        .map(i => allShoes.filter(s => !wishlistIds.includes(s.id))[i])
        .filter(Boolean);

      setShoes(picked.length >= 3 ? picked : allShoes.slice(0, 6));
      setReasoning(aiRes.reasoning || "");
    } catch {
      setShoes([]);
    }

    setLoading(false);
  };

  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl">AI Picks For You</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasSignals ? "Personalized based on your wishlist & searches" : "Popular shoes to get you started"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* AI Reasoning */}
        <AnimatePresence>
          {reasoning && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 bg-purple-50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 rounded-2xl px-4 py-3 mb-6"
            >
              <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-800 dark:text-purple-300 leading-relaxed">{reasoning}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : shoes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {shoes.map((shoe, i) => (
              <ShoeCard key={shoe.id} shoe={shoe} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Save shoes to your wishlist to get personalized picks</p>
          </div>
        )}
      </div>
    </section>
  );
}