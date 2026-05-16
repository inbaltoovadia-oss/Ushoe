/**
 * BestFor — "Best Shoes For Each Category" tab.
 * Replaces Rotation tab. Shows curated picks per use case + community popular section.
 * Zero backend functions required. Community section is cached 90 days.
 */
import { useState, useEffect } from "react";
import { Zap, Dumbbell, Sun, Footprints, Trophy, Sparkles, Users, RefreshCw, Loader2, ChevronRight, Tag, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import { Link } from "react-router-dom";

const COMMUNITY_CACHE_KEY = "ushoe_community_picks_v1";
const COMMUNITY_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

const CATEGORIES = [
  {
    id: "running",
    label: "Running",
    icon: Zap,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200/60 dark:border-green-800/40",
    active: "bg-green-600 text-white",
    dbCategories: ["Running"],
    description: "Fast, cushioned, and built for miles",
  },
  {
    id: "gym",
    label: "Gym",
    icon: Dumbbell,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200/60 dark:border-red-800/40",
    active: "bg-red-600 text-white",
    dbCategories: ["Training"],
    description: "Stable, supportive, and ready to lift",
  },
  {
    id: "daily",
    label: "Daily Wear",
    icon: Sun,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200/60 dark:border-amber-800/40",
    active: "bg-amber-500 text-white",
    dbCategories: ["Casual", "Lifestyle"],
    description: "Comfortable style for everyday life",
  },
  {
    id: "walking",
    label: "Walking",
    icon: Footprints,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200/60 dark:border-blue-800/40",
    active: "bg-blue-600 text-white",
    dbCategories: ["Walking", "Casual"],
    description: "All-day comfort from block to trail",
  },
  {
    id: "basketball",
    label: "Basketball",
    icon: Trophy,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200/60 dark:border-orange-800/40",
    active: "bg-orange-600 text-white",
    dbCategories: ["Basketball"],
    description: "Court-ready traction and ankle support",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: Sparkles,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200/60 dark:border-purple-800/40",
    active: "bg-purple-600 text-white",
    dbCategories: ["Lifestyle", "Skateboarding"],
    description: "Statement pieces for any occasion",
  },
];

const PRICE_TIERS = [
  { id: "all",     label: "All" },
  { id: "budget",  label: "Budget",  max: 100 },
  { id: "mid",     label: "Mid",     min: 100, max: 180 },
  { id: "premium", label: "Premium", min: 180 },
];

function getCachedCommunity() {
  try {
    const raw = localStorage.getItem(COMMUNITY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > COMMUNITY_TTL) return null;
    return parsed.data;
  } catch { return null; }
}

function setCachedCommunity(data) {
  try { localStorage.setItem(COMMUNITY_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export default function BestFor() {
  const [activeCategory, setActiveCategory] = useState("running");
  const [activeTier, setActiveTier] = useState("all");
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityPicks, setCommunityPicks] = useState(getCachedCommunity());
  const [communityLoading, setCommunityLoading] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);

  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 100).then(all => {
      setShoes(all);
      setLoading(false);
    });
  }, []);

  const cat = CATEGORIES.find(c => c.id === activeCategory);

  const filteredShoes = shoes
    .filter(s => cat.dbCategories.includes(s.category))
    .filter(s => {
      const tier = PRICE_TIERS.find(t => t.id === activeTier);
      if (!tier || tier.id === "all") return true;
      if (tier.min && tier.max) return s.price >= tier.min && s.price < tier.max;
      if (tier.max) return s.price < tier.max;
      if (tier.min) return s.price >= tier.min;
      return true;
    })
    .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));

  // Split into premium, mid, budget tiers for "all" view
  const premiumPicks = filteredShoes.filter(s => s.price >= 180).slice(0, 2);
  const midPicks     = filteredShoes.filter(s => s.price >= 100 && s.price < 180).slice(0, 2);
  const budgetPicks  = filteredShoes.filter(s => s.price < 100).slice(0, 2);
  const tieredShoes  = activeTier === "all"
    ? [...premiumPicks, ...midPicks, ...budgetPicks]
    : filteredShoes.slice(0, 6);
  const displayShoes = tieredShoes.length ? tieredShoes : filteredShoes.slice(0, 6);

  const loadCommunity = async () => {
    if (communityLoading) return;
    const cached = getCachedCommunity();
    if (cached) { setCommunityPicks(cached); setShowCommunity(true); return; }

    setCommunityLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a sneaker culture expert. Based on current community trends (Reddit, sneaker forums, StockX, GOAT), list the top 6 most popular sneakers right now across different categories.
For each shoe return:
- name: shoe name
- brand: brand name
- category: one of Running, Gym, Daily Wear, Walking, Basketball, Lifestyle
- why_popular: one sentence on why it's popular in the community
- price_range: e.g. "$120-$140"
- buy_url: a real direct product page URL on the official brand site or major retailer (nike.com, adidas.com, footlocker.com, etc.)
Focus on what real sneaker communities are actually wearing and talking about right now. Only include real URLs you are confident exist.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            picks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  category: { type: "string" },
                  why_popular: { type: "string" },
                  price_range: { type: "string" },
                  buy_url: { type: "string" },
                },
              },
            },
          },
        },
      });
      const data = res.picks || [];
      setCommunityPicks(data);
      setCachedCommunity(data);
    } catch {
      setCommunityPicks([]);
    }
    setCommunityLoading(false);
    setShowCommunity(true);
  };

  const CatIcon = cat?.icon;

  return (
    <div className="min-h-screen py-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Best For</h1>
              <p className="text-sm text-muted-foreground">Top picks for every occasion — premium, mid, and budget</p>
            </div>
          </div>
        </motion.div>

        {/* Category tabs — scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
          {CATEGORIES.map(c => {
            const Icon = c.icon;
            const isActive = activeCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveCategory(c.id); setActiveTier("all"); }}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                  isActive ? c.active : `bg-secondary text-muted-foreground hover:text-foreground ${c.bg} border ${c.border}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Category hero banner */}
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`rounded-2xl border ${cat.border} ${cat.bg} px-5 py-4 mb-6 flex items-center gap-3`}
        >
          {CatIcon && <CatIcon className={`w-7 h-7 ${cat.color} flex-shrink-0`} />}
          <div>
            <p className={`font-heading font-bold text-lg ${cat.color}`}>{cat.label}</p>
            <p className="text-sm text-muted-foreground">{cat.description}</p>
          </div>
        </motion.div>

        {/* Price tier filter */}
        <div className="flex gap-2 mb-5">
          {PRICE_TIERS.map(tier => (
            <button
              key={tier.id}
              onClick={() => setActiveTier(tier.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTier === tier.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tier.label}
              {tier.id === "budget" && " <$100"}
              {tier.id === "mid" && " $100–$180"}
              {tier.id === "premium" && " $180+"}
            </button>
          ))}
        </div>

        {/* Shoes grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayShoes.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl mb-10">
            <p className="text-muted-foreground text-sm">No shoes found for this category and price range.</p>
            <Link to="/search" className="mt-3 inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
              Browse all shoes <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Tiered section labels when showing "all" */}
            {activeTier === "all" && (premiumPicks.length > 0 || midPicks.length > 0 || budgetPicks.length > 0) ? (
              <div className="space-y-8 mb-10">
                {premiumPicks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-full">Premium · $180+</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {premiumPicks.map((s, i) => <ShoeCard key={s.id} shoe={s} index={i} />)}
                    </div>
                  </div>
                )}
                {midPicks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-full">Mid Range · $100–$180</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {midPicks.map((s, i) => <ShoeCard key={s.id} shoe={s} index={i} />)}
                    </div>
                  </div>
                )}
                {budgetPicks.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-green-600 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
                        <Tag className="w-3 h-3 inline mr-1" />Budget · Under $100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {budgetPicks.map((s, i) => <ShoeCard key={s.id} shoe={s} index={i} />)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                {displayShoes.map((s, i) => <ShoeCard key={s.id} shoe={s} index={i} />)}
              </div>
            )}
          </>
        )}

        {/* See more link */}
        <div className="text-center mb-12">
          <Link
            to={`/search?q=${encodeURIComponent(cat.dbCategories[0])}`}
            className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
          >
            See all {cat.label} shoes <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Community Picks section */}
        <div className="border-t border-border/60 pt-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">Popular in Your Community</h2>
                <p className="text-xs text-muted-foreground">Based on sneaker communities · cached 90 days</p>
              </div>
            </div>
            <button
              onClick={loadCommunity}
              disabled={communityLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors disabled:opacity-60"
            >
              {communityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {communityPicks && !showCommunity ? "Show Picks" : communityLoading ? "Loading…" : communityPicks ? "Refresh" : "Load Picks"}
            </button>
          </div>

          {!showCommunity && !communityPicks && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">See what the sneaker community is loving right now</p>
              <button
                onClick={() => { setShowCommunity(true); if (!communityPicks) loadCommunity(); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Users className="w-4 h-4" />
                Load Community Picks
              </button>
            </div>
          )}

          <AnimatePresence>
            {(showCommunity || communityPicks) && (communityLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-24 bg-secondary animate-pulse rounded-2xl" />)}
              </div>
            ) : communityPicks?.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {communityPicks.map((pick, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-4 hover:border-accent/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{pick.brand}</p>
                        <p className="font-heading font-semibold text-sm leading-snug mt-0.5">{pick.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {pick.price_range && (
                          <p className="text-xs font-bold text-primary">{pick.price_range}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full mt-1">{pick.category}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{pick.why_popular}</p>
                    {pick.buy_url ? (
                      <a
                        href={pick.buy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                      >
                        Buy Now <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(pick.brand + " " + pick.name + " buy")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                      >
                        Search online <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : showCommunity ? (
              <p className="text-sm text-muted-foreground text-center py-6">Could not load community picks. Try again later.</p>
            ) : null)}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}