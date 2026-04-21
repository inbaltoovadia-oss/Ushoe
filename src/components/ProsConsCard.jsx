import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

const CACHE = {};

export default function ProsConsCard({ shoe }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shoe?.id) return;
    if (CACHE[shoe.id]) { setData(CACHE[shoe.id]); return; }
    setLoading(true);
    base44.integrations.Core.InvokeLLM({
      prompt: `For the shoe "${shoe.brand} ${shoe.name}" (${shoe.category}, $${shoe.price}):
List 2-4 concise pros and 1-2 concise cons that matter to buyers.
Be honest, specific, and decision-focused. Max 8 words per point.`,
      response_json_schema: {
        type: "object",
        properties: {
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
        },
      },
    }).then(res => {
      const result = { pros: res.pros || [], cons: res.cons || [] };
      CACHE[shoe.id] = result;
      setData(result);
    }).catch(() => {
      // Derive basic pros/cons from shoe data as fallback
      const pros = [];
      const cons = [];
      if (shoe.rating >= 4.5) pros.push("Highly rated by users");
      if (shoe.original_price > shoe.price) pros.push(`${Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)}% off — great value`);
      if (shoe.is_trending) pros.push("Currently trending");
      if ((shoe.features || []).length > 0) pros.push(shoe.features[0]);
      if (shoe.price > 200) cons.push("Premium price point");
      else if (shoe.price < 60) cons.push("May lack premium cushioning");
      setData({ pros: pros.slice(0, 4), cons: cons.slice(0, 2) });
    }).finally(() => setLoading(false));
  }, [shoe?.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analyzing pros & cons…
      </div>
    );
  }

  if (!data || (data.pros.length === 0 && data.cons.length === 0)) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Quick Verdict</h3>
      {data.pros.length > 0 && (
        <div className="space-y-1.5">
          {data.pros.map((pro, i) => (
            <div key={i} className="flex items-start gap-2">
              <ThumbsUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{pro}</p>
            </div>
          ))}
        </div>
      )}
      {data.cons.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          {data.cons.map((con, i) => (
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