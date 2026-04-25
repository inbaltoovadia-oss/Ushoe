/**
 * ReviewsSummary — static review insights derived from catalog data.
 * No LLM calls — all logic is client-side.
 */
import { Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";

const ASPECTS = [
  { key: "comfort",      label: "Comfort",        emoji: "🛋️" },
  { key: "sizing",       label: "Sizing",          emoji: "📏" },
  { key: "durability",   label: "Durability",      emoji: "🔩" },
  { key: "traction",     label: "Traction",        emoji: "🧲" },
  { key: "breathability",label: "Breathability",   emoji: "💨" },
  { key: "style",        label: "Style",           emoji: "✨" },
  { key: "value",        label: "Value",           emoji: "💰" },
];

function deriveScores(shoe) {
  const cat = (shoe.category || "").toLowerCase();
  const price = shoe.price || 0;
  const rating = shoe.rating || 4.0;
  const trending = shoe.trending_score || 50;

  // Base from rating
  const base = Math.min(5, Math.max(2, rating));

  const comfort = cat.includes("walk") || cat.includes("run") ? Math.min(5, base + 0.3) : base;
  const sizing = 3.5; // neutral default
  const durability = price > 150 ? Math.min(5, base + 0.4) : price < 70 ? Math.max(2, base - 0.5) : base;
  const traction = cat.includes("run") || cat.includes("hik") || cat.includes("basket") ? Math.min(5, base + 0.3) : base - 0.2;
  const breathability = cat.includes("run") || cat.includes("train") ? Math.min(5, base + 0.2) : base - 0.3;
  const style = trending >= 70 ? Math.min(5, base + 0.4) : base;
  const value = shoe.original_price > price ? Math.min(5, base + 0.5) : price > 200 ? Math.max(2, base - 0.3) : base;

  return {
    comfort:       +comfort.toFixed(1),
    sizing:        +sizing.toFixed(1),
    durability:    +durability.toFixed(1),
    traction:      +traction.toFixed(1),
    breathability: +breathability.toFixed(1),
    style:         +style.toFixed(1),
    value:         +value.toFixed(1),
  };
}

function deriveProscons(shoe, scores) {
  const pros = [];
  const cons = [];

  if (scores.comfort >= 4.3) pros.push("Exceptionally comfortable");
  else if (scores.comfort >= 4.0) pros.push("Good comfort level");

  if (shoe.original_price > shoe.price) {
    const pct = Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100);
    pros.push(`${pct}% off — great value`);
  } else if (scores.value >= 4.2) {
    pros.push("Strong value for money");
  }

  if (shoe.is_trending || (shoe.trending_score || 0) >= 70) pros.push("Very popular right now");
  if (scores.durability >= 4.2) pros.push("Built to last");
  if (scores.breathability >= 4.2) pros.push("Excellent breathability");
  if (scores.style >= 4.3) pros.push("Highly stylish design");

  if (shoe.price > 200) cons.push("Premium price point");
  if ((shoe.sizes_available || []).length < 5) cons.push("Limited size availability");
  if (scores.breathability < 3.5) cons.push("Can run warm");
  if (scores.value < 3.5 && shoe.price > 150) cons.push("Pricey for the features");

  const sizingAdvice = "Typically true to size — check brand chart";

  return {
    top_pro: pros[0] || null,
    top_con: cons[0] || null,
    sizing_advice: sizingAdvice,
  };
}

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

export default function ReviewsSummary({ shoe }) {
  if (!shoe) return null;

  const scores = deriveScores(shoe);
  const { top_pro, top_con, sizing_advice } = deriveProscons(shoe, scores);
  const avg = +(Object.values(scores).reduce((a, b) => a + b, 0) / ASPECTS.length).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-sm">Buyer Insights</h3>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className={`font-bold text-sm ${scoreColor(avg)}`}>{avg}/5</span>
        </div>
      </div>

      {/* Quick chips */}
      <div className="flex flex-wrap gap-2">
        {top_pro && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
            <ThumbsUp className="w-3 h-3" />{top_pro}
          </span>
        )}
        {top_con && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-full">
            <ThumbsDown className="w-3 h-3" />{top_con}
          </span>
        )}
        {sizing_advice && (
          <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            📏 {sizing_advice}
          </span>
        )}
      </div>

      {/* Aspect scores */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        {ASPECTS.map(({ key, label, emoji }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-sm w-5 text-center">{emoji}</span>
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
            <ScoreBar score={scores[key] || 0} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}