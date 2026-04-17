import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Lightweight AI trust badge — generates a 1-line insight for a shoe
// Uses a short prompt so it resolves in ~1s
const insightCache = new Map();

export default function ShoeInsightBadge({ shoe }) {
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    if (!shoe?.id) return;
    if (insightCache.has(shoe.id)) {
      setInsight(insightCache.get(shoe.id));
      return;
    }
    let cancelled = false;
    base44.integrations.Core.InvokeLLM({
      prompt: `In 6 words or fewer, give ONE practical tip about the ${shoe.brand} ${shoe.name} (${shoe.category}, $${shoe.price}).
Examples: "Runs small — size up", "Great for wide feet", "Best for daily wear", "Perfect for flat arches", "Lightweight — great for speed".
Reply with ONLY the tip, no punctuation at the end.`,
      response_json_schema: {
        type: "object",
        properties: { tip: { type: "string" } },
      },
    }).then(res => {
      if (cancelled || !res?.tip) return;
      insightCache.set(shoe.id, res.tip);
      setInsight(res.tip);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [shoe?.id]);

  if (!insight) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-full">
      <Sparkles className="w-3 h-3 flex-shrink-0" />
      {insight}
    </span>
  );
}