/**
 * CommunityTasteMap — premium visual trend discovery section.
 * Shows personalized "taste trends" generated from community + profile data.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, TrendingDown, Minus, RefreshCw,
  Loader2, Sparkles, ChevronRight, ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { getTasteMapTrends, clearTasteMapCache } from "../lib/tasteMapEngine";
import { getUserProfile } from "../lib/userProfileStore";

const DIRECTION_CONFIG = {
  rising: {
    icon: TrendingUp,
    label: "Rising",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    bar: "bg-emerald-500",
  },
  peak: {
    icon: Minus,
    label: "Peak",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    bar: "bg-amber-500",
  },
  cooling: {
    icon: TrendingDown,
    label: "Cooling",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    bar: "bg-slate-400",
  },
};

const TYPE_LABELS = {
  aesthetic: "Aesthetic",
  brand: "Brand Movement",
  color: "Color Trend",
  silhouette: "Silhouette",
  material: "Material",
  "use-case": "Use Case",
};

function TrendCard({ trend, index }) {
  const dir = DIRECTION_CONFIG[trend.direction] || DIRECTION_CONFIG.rising;
  const DirIcon = dir.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-300 relative overflow-hidden"
    >
      {/* Subtle color accent wash */}
      <div
        className="absolute inset-0 opacity-[0.04] rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${trend.colorAccent || "#6366f1"} 0%, transparent 70%)` }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{trend.emoji || "👟"}</span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ background: `${trend.colorAccent || "#6366f1"}22`, color: trend.colorAccent || "#6366f1" }}
          >
            {TYPE_LABELS[trend.type] || trend.type}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${dir.bg} ${dir.color}`}>
          <DirIcon className="w-3 h-3" />
          {dir.label}
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="font-heading font-bold text-base leading-snug">{trend.title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {trend.subtitle}
        </p>
      </div>

      {/* Explanation */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {trend.explanation}
      </p>

      {/* Momentum bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground font-medium">Momentum</span>
          <span className="text-[10px] font-bold">{trend.momentum}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${trend.momentum}%` }}
            transition={{ delay: 0.4 + index * 0.06, duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${dir.bar}`}
          />
        </div>
      </div>

      {/* Example shoes */}
      {trend.exampleShoeNames?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {trend.exampleShoeNames.slice(0, 3).map((name, i) => (
            <Link
              key={i}
              to={`/search?q=${encodeURIComponent(name)}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-secondary hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {name}
              <ArrowUpRight className="w-2.5 h-2.5" />
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SkeletonTrendCard() {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-secondary rounded-full" />
        <div className="w-20 h-5 bg-secondary rounded-full" />
      </div>
      <div>
        <div className="w-3/4 h-5 bg-secondary rounded mb-1.5" />
        <div className="w-1/2 h-3 bg-secondary rounded" />
      </div>
      <div className="w-full h-3 bg-secondary rounded" />
      <div className="w-5/6 h-3 bg-secondary rounded" />
      <div className="w-full h-1.5 bg-secondary rounded-full" />
    </div>
  );
}

export default function CommunityTasteMap() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const loadTrends = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const profile = await getUserProfile();
    const data = await getTasteMapTrends(profile, force);
    if (data?.length > 0) {
      setTrends(data);
      setGeneratedAt(new Date());
    } else {
      setError("Could not generate trends right now.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTrends(); }, [loadTrends]);

  const handleRefresh = () => {
    clearTasteMapCache();
    loadTrends(true);
  };

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl glass-icon">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-xl flex items-center gap-2">
              Community Taste Map
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">AI</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              What people with your taste are gravitating toward
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors disabled:opacity-50"
          title="Refresh trends"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Personalisation note */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
        <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Trends are personalized to your style, saves, and browsing — refreshed daily.
        </p>
      </div>

      {/* Cards grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {Array.from({ length: 6 }).map((_, i) => <SkeletonTrendCard key={i} />)}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground"
          >
            <p className="text-sm">{error}</p>
            <button onClick={() => loadTrends(true)} className="mt-3 text-primary text-sm hover:underline">
              Try again
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="trends"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {trends.map((trend, i) => (
              <TrendCard key={trend.id || i} trend={trend} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {!loading && trends.length > 0 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {generatedAt
              ? `Generated ${generatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · updates daily`
              : "Updates daily based on your activity"}
          </p>
          <Link
            to="/discover"
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Explore all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}