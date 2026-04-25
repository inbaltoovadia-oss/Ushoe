/**
 * ReviewsSummary — on-demand AI review analysis for a shoe.
 * Only fires InvokeLLM when user clicks "Analyze Reviews".
 */
import { useState } from "react";
import { Star, Sparkles, Loader2, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const ASPECTS = [
  { key: "comfort",     label: "Comfort",       emoji: "🛋️" },
  { key: "sizing",      label: "Sizing",         emoji: "📏" },
  { key: "durability",  label: "Durability",     emoji: "🔩" },
  { key: "traction",    label: "Traction",       emoji: "🧲" },
  { key: "breathability",label: "Breathability", emoji: "💨" },
  { key: "style",       label: "Style",          emoji: "✨" },
  { key: "value",       label: "Value",          emoji: "💰" },
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

const CACHE = {};

export default function ReviewsSummary({ shoe }) {
  const [data, setData] = useState(CACHE[shoe?.id] || null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    if (!shoe) return;
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a shoe review analyst. Based on your knowledge of the ${shoe.brand} ${shoe.name} (${shoe.category}, $${shoe.price}), synthesize what buyers typically say.

Rate each aspect from 1-5 (1=poor, 5=excellent) and give a 1-sentence insight for each:
- comfort
- sizing (note if runs small/large/true to size)
- durability
- traction
- breathability
- style
- value (price vs quality)

Also provide:
- overall_verdict: 1-2 sentence summary of the shoe
- top_pro: the single best thing about this shoe (max 8 words)
- top_con: the single biggest drawback (max 8 words)
- sizing_advice: e.g. "Runs small — size up half" or "True to size"`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_verdict: { type: "string" },
          top_pro: { type: "string" },
          top_con: { type: "string" },
          sizing_advice: { type: "string" },
          comfort:      { type: "number" },
          sizing:       { type: "number" },
          durability:   { type: "number" },
          traction:     { type: "number" },
          breathability:{ type: "number" },
          style:        { type: "number" },
          value:        { type: "number" },
          comfort_note:      { type: "string" },
          sizing_note:       { type: "string" },
          durability_note:   { type: "string" },
          traction_note:     { type: "string" },
          breathability_note:{ type: "string" },
          style_note:        { type: "string" },
          value_note:        { type: "string" },
        },
      },
    });
    CACHE[shoe.id] = res;
    setData(res);
    setLoading(false);
    setExpanded(true);
  };

  if (!data && !loading) {
    return (
      <button
        onClick={analyze}
        className="flex items-center gap-2 w-full px-4 py-3 bg-secondary hover:bg-secondary/80 border border-border/50 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        Analyze Reviews — Comfort, Sizing, Value & more
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        Analyzing buyer reviews…
      </div>
    );
  }

  const avgScore = Math.round(
    ASPECTS.reduce((sum, a) => sum + (data[a.key] || 0), 0) / ASPECTS.length * 10
  ) / 10;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">AI Review Summary</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
          <span className={`font-bold text-sm ${scoreColor(avgScore)}`}>{avgScore}/5</span>
          <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-secondary rounded-lg transition-colors ml-1">
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Quick verdict */}
      {data.overall_verdict && (
        <p className="text-xs text-muted-foreground leading-relaxed">{data.overall_verdict}</p>
      )}

      {/* Top pro/con + sizing */}
      <div className="flex flex-wrap gap-2">
        {data.top_pro && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
            <ThumbsUp className="w-3 h-3" />
            {data.top_pro}
          </span>
        )}
        {data.top_con && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-500 bg-red-50 dark:bg-red-950/30 px-2.5 py-1 rounded-full">
            <ThumbsDown className="w-3 h-3" />
            {data.top_con}
          </span>
        )}
        {data.sizing_advice && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            📏 {data.sizing_advice}
          </span>
        )}
      </div>

      {/* Aspect scores */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 pt-1 border-t border-border/50 overflow-hidden">
            {ASPECTS.map(({ key, label, emoji }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{emoji}</span>
                <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
                <ScoreBar score={data[key] || 0} />
                {data[`${key}_note`] && (
                  <span className="text-[10px] text-muted-foreground hidden sm:block max-w-[140px] truncate">{data[`${key}_note`]}</span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}