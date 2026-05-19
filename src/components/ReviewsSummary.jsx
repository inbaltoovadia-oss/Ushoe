/**
 * ReviewsSummary — fetches real buyer insights via a one-time web search per shoe.
 * Results are cached in sessionStorage keyed by shoe ID to avoid repeat calls.
 */
import { useState, useEffect } from "react";
import { Star, ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

const ASPECTS = [
  { key: "comfort",       label: "Comfort",       emoji: "🛋️" },
  { key: "sizing",        label: "Sizing",         emoji: "📏" },
  { key: "durability",    label: "Durability",     emoji: "🔩" },
  { key: "traction",      label: "Traction",       emoji: "🧲" },
  { key: "breathability", label: "Breathability",  emoji: "💨" },
  { key: "style",         label: "Style",          emoji: "✨" },
  { key: "value",         label: "Value",          emoji: "💰" },
];

const scoreColor = (s) =>
  s >= 4 ? "text-green-600 dark:text-green-400" :
  s >= 3 ? "text-amber-600 dark:text-amber-400" :
  "text-red-500 dark:text-red-400";

const ScoreBar = ({ score }) => {
  const pct = Math.round((score / 5) * 100);
  const color = score >= 4 ? "bg-green-500" : score >= 3 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${scoreColor(score)}`}>{score}</span>
    </div>
  );
};

const CACHE_KEY = (id) => `buyer_insights_${id}`;

export default function ReviewsSummary({ shoe }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shoe) return;
    // Check session cache first (only use if fetched via backend function)
    try {
      const cached = sessionStorage.getItem(CACHE_KEY(shoe.id));
      if (cached) {
        const parsed = JSON.parse(cached);
        // Invalidate old frontend-cached data (which had generic 4.5 scores)
        if (parsed?._source === 'backend') { setData(parsed); return; }
      }
    } catch {}
    fetchInsights();
  }, [shoe?.id]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getShoeReviews', {
        brand: shoe.brand,
        name: shoe.name,
        model: shoe.model || null,
      });
      const result = { ...(res?.data || res), _source: 'backend' };
      try { sessionStorage.setItem(CACHE_KEY(shoe.id), JSON.stringify(result)); } catch {}
      setData(result);
    } catch {
      setData(null);
    }
    setLoading(false);
  };

  if (!shoe) return null;

  const scores = data?.scores || {};
  const avg = data?.overall_rating
    ? +data.overall_rating.toFixed(1)
    : scores && Object.keys(scores).length > 0
      ? +(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length).toFixed(1)
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm">Buyer Insights</h3>
          {data?.source_note && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{data.source_note}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {avg !== null && !loading && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className={`font-bold text-sm ${scoreColor(avg)}`}>{avg}/5</span>
              {data?.review_count > 0 && (
                <span className="text-[10px] text-muted-foreground">({data.review_count.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          Fetching real reviews from the web…
        </div>
      )}

      {/* Pros / Cons chips */}
      {!loading && data && (
        <div className="flex flex-wrap gap-2">
          {(data.top_pros || []).map((pro, i) => (
            <span key={i} className="flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
              <ThumbsUp className="w-3 h-3" />{pro}
            </span>
          ))}
          {data.top_con && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-full">
              <ThumbsDown className="w-3 h-3" />{data.top_con}
            </span>
          )}
          {data.sizing_advice && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              📏 {data.sizing_advice}
            </span>
          )}
        </div>
      )}

      {/* Aspect score bars */}
      {!loading && Object.keys(scores).length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/50">
          {ASPECTS.map(({ key, label, emoji }) =>
            scores[key] ? (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{emoji}</span>
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
                <ScoreBar score={scores[key]} />
              </div>
            ) : null
          )}
        </div>
      )}

      {!loading && !data && (
        <p className="text-xs text-muted-foreground">No review data available for this shoe.</p>
      )}
    </motion.div>
  );
}