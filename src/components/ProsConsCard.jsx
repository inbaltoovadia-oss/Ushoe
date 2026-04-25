import { ThumbsUp, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";

// Static pros/cons — derived from catalog data, no LLM calls
export default function ProsConsCard({ shoe }) {
  if (!shoe) return null;

  const pros = [];
  const cons = [];

  if ((shoe.rating || 0) >= 4.5) pros.push("Highly rated by buyers");
  if (shoe.original_price > shoe.price) {
    const pct = Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100);
    pros.push(`${pct}% off — great value`);
  }
  if (shoe.is_trending || (shoe.trending_score || 0) >= 70) pros.push("Currently trending");
  if ((shoe.features || []).length > 0) pros.push(shoe.features[0]);
  if (shoe.category === "Running") pros.push("Engineered for performance");
  if (shoe.category === "Walking" || shoe.category === "Casual") pros.push("All-day comfort design");

  if (shoe.price > 200) cons.push("Premium price point");
  else if (shoe.price < 60) cons.push("May lack premium cushioning");
  if ((shoe.sizes_available || []).length < 5) cons.push("Limited size availability");

  const finalPros = pros.slice(0, 3);
  const finalCons = cons.slice(0, 2);

  if (finalPros.length === 0 && finalCons.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quick Verdict</h3>
      {finalPros.length > 0 && (
        <div className="space-y-1.5">
          {finalPros.map((pro, i) => (
            <div key={i} className="flex items-start gap-2">
              <ThumbsUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{pro}</p>
            </div>
          ))}
        </div>
      )}
      {finalCons.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          {finalCons.map((con, i) => (
            <div key={i} className="flex items-start gap-2">
              <ThumbsDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">{con}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}