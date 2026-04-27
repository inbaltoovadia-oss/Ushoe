import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Brain, ArrowRight, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getWishlistIds } from "../../lib/wishlistStore";
import { getUserProfile } from "../../lib/userProfileStore";
import { rankShoes, buildPersonaSummary } from "../../lib/personalizationEngine";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";
import { Link } from "react-router-dom";
import { isTabActive } from "../../lib/tabVisibility";

// 24-hour cache for AI picks — avoids burning credits on every home visit
const AI_PICKS_TTL = 24 * 60 * 60 * 1000;
const AI_PICKS_KEY = "ushoe_ai_picks_v1";

function getCachedAIPicks() {
  try {
    const raw = localStorage.getItem(AI_PICKS_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < AI_PICKS_TTL) return data;
    localStorage.removeItem(AI_PICKS_KEY);
  } catch (_) {}
  return null;
}

function setCachedAIPicks(data) {
  try { localStorage.setItem(AI_PICKS_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
}

export default function AIRecommendations() {
  const [bestPick, setBestPick] = useState(null);
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasoning, setReasoning] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasSignals, setHasSignals] = useState(false);

  useEffect(() => { load(refreshKey > 0); }, [refreshKey]);

  const load = async (force = false) => {
    if (!isTabActive()) return; // don't burn credits on inactive tabs
    setLoading(true);
    setReasoning("");
    setBestPick(null);

    // Serve from cache unless forced refresh
    if (!force) {
      const cached = getCachedAIPicks();
      if (cached) {
        setBestPick(cached.bestPick || null);
        setShoes(cached.shoes || []);
        setReasoning(cached.reasoning || "");
        setHasSignals(cached.hasSignals ?? true);
        setLoading(false);
        return;
      }
    }

    const [allShoes, userProfile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 100),
      getUserProfile(), // use cached profile — no forced refresh
    ]);

    const wishlistIds = Array.from(getWishlistIds());
    const anySignal = userProfile.survey_completed ||
      userProfile.recent_queries?.length > 0 ||
      userProfile.wishlist_brands?.length > 0;

    setHasSignals(anySignal);

    if (!anySignal) {
      // No signals — show trending, no AI call needed
      const trendingShoes = allShoes.slice(0, 6);
      setShoes(trendingShoes);
      setReasoning("Start saving shoes or searching to get personalized AI picks!");
      setCachedAIPicks({ bestPick: null, shoes: trendingShoes, reasoning: "Start saving shoes or searching to get personalized AI picks!", hasSignals: false });
      setLoading(false);
      return;
    }

    // Deterministic ranking — use this as the result
    const ranked = rankShoes(allShoes, userProfile, { excludeIds: wishlistIds, limit: 30 });
    const catalog = ranked.slice(0, 20);

    // AI call: only runs on forced refresh or cache miss (max once per 24h)
    const personaSummary = buildPersonaSummary(userProfile);
    const catalogSnippet = catalog
      .map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} [${s.category}] trending=${s.is_trending ? "yes" : "no"} score=${s._score?.toFixed(0)}`)
      .join("\n");

    const aiRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a world-class shoe expert AI. Detect the user's preferred language from their recent searches and respond in that language if it is not English.

Your job is to make one single BEST shoe recommendation and explain why.

USER PROFILE:
${personaSummary}

TOP RANKED CATALOG (pre-scored by personalization engine, index: brand name price [category]):
${catalogSnippet}

YOUR TASK:
1. Pick ONE best shoe (best_index) — the single strongest match considering the user's profile, budget, use case, and trending status.
2. Pick 5 more "You might also like" shoes (other_indices — array of 5 index numbers, excluding best_index).
3. Write a short expert reasoning (1–2 sentences max) explaining WHY the best pick is perfect for this user. Be specific and confident.

RULES:
- Prioritize shoes matching the user's primary use AND preferred brands.
- If budget is known, never pick a shoe that exceeds it by more than 20%.
- Trending shoes should be favored when they also match user preferences.
- Keep reasoning short, direct, expert-sounding. No fluff.`,
      response_json_schema: {
        type: "object",
        properties: {
          best_index: { type: "number" },
          other_indices: { type: "array", items: { type: "number" } },
          reasoning: { type: "string" },
        },
      },
    });

    const best = catalog[aiRes.best_index ?? 0];
    const others = (aiRes.other_indices || [])
      .filter(i => i >= 0 && i < catalog.length && i !== aiRes.best_index)
      .slice(0, 5)
      .map(i => catalog[i])
      .filter(Boolean);

    const finalShoes = others.length >= 2 ? others : ranked.slice(1, 6);
    const finalReasoning = aiRes.reasoning || "";

    setBestPick(best || null);
    setShoes(finalShoes);
    setReasoning(finalReasoning);

    // Cache for 24h
    setCachedAIPicks({ bestPick: best || null, shoes: finalShoes, reasoning: finalReasoning, hasSignals: true });
    setLoading(false);
  };

  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl">AI Picks For You</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasSignals
                  ? "Personalized · learns from your behavior"
                  : "Popular picks to get you started"}
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

        {loading ? (
          <div className="space-y-6">
            {/* Best pick skeleton */}
            <div className="h-40 bg-secondary animate-pulse rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ★ BEST PICK — prominent hero card */}
            {bestPick && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Best Pick For You</span>
                </div>
                <Link to={`/shoe/${bestPick.id}`} className="group block">
                  <div className="flex gap-4 bg-gradient-to-r from-purple-50 to-primary/5 dark:from-purple-950/20 dark:to-primary/5 border-2 border-purple-200/60 dark:border-purple-800/40 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-300 p-4">
                    <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-secondary">
                      <img
                        src={bestPick.image_url || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop"}
                        alt={bestPick.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={e => { e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop"; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{bestPick.brand}</p>
                      <h3 className="font-heading font-bold text-lg group-hover:text-primary transition-colors line-clamp-1 mt-0.5">{bestPick.name}</h3>
                      {bestPick._matchReasons?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {bestPick._matchReasons.map(r => (
                            <span key={r} className="text-[10px] px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">{r}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-heading font-bold text-xl text-primary">${bestPick.price}</span>
                        {bestPick.is_trending && (
                          <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full font-semibold">
                            <Zap className="w-3 h-3" /> Trending
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto group-hover:text-primary transition-colors">View details →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Supporting picks grid */}
            {shoes.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3" />
                  You might also like
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {shoes.map((shoe, i) => (
                    <ShoeCard key={shoe.id} shoe={shoe} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* CTA when no signals */}
            {!hasSignals && (
              <div className="text-center pt-2">
                <Link to="/survey" className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2.5 rounded-xl transition-colors">
                  <Sparkles className="w-4 h-4" />
                  Take style survey for better picks
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}