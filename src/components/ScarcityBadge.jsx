import { useState, useEffect } from "react";
import { Flame, TrendingDown, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

const scarcityCache = new Map();

// Generates live-estimated urgency signals for a shoe
export default function ScarcityBadge({ shoe }) {
  const [signal, setSignal] = useState(null);

  useEffect(() => {
    if (!shoe?.id) return;
    if (scarcityCache.has(shoe.id)) {
      setSignal(scarcityCache.get(shoe.id));
      return;
    }
    let cancelled = false;
    base44.integrations.Core.InvokeLLM({
      prompt: `You are a live inventory AI for the ${shoe.brand} ${shoe.name} ($${shoe.price}, ${shoe.category}).
Based on this shoe's popularity (trending_score: ${shoe.trending_score || 50}), price, and category, estimate ONE urgency signal.
Choose ONLY one of these types (pick the most realistic):
- "low_stock": if popular/trending shoe likely to sell fast. Include estimated units left (2-8).
- "price_drop": if the shoe has or recently had a discount (original_price: ${shoe.original_price || "none"}).
- "high_demand": if it's trending or a lifestyle shoe.
- "none": if no meaningful urgency signal applies.

Rules: be honest — don't create fake urgency. If trending_score < 40 and no discount, use "none".`,
      response_json_schema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["low_stock", "price_drop", "high_demand", "none"] },
          units_left: { type: "number" },
          label: { type: "string" },
        },
      },
    }).then(res => {
      if (cancelled || !res || res.type === "none") return;
      scarcityCache.set(shoe.id, res);
      setSignal(res);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [shoe?.id]);

  if (!signal) return null;

  const configs = {
    low_stock: {
      icon: Flame,
      className: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40",
      label: signal.label || (signal.units_left ? `Only ${signal.units_left} left near you` : "Low stock"),
    },
    price_drop: {
      icon: TrendingDown,
      className: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200/60 dark:border-green-800/40",
      label: signal.label || "Price dropped today",
    },
    high_demand: {
      icon: Clock,
      className: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40",
      label: signal.label || "High demand in your area",
    },
  };

  const cfg = configs[signal.type];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.className}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {cfg.label}
    </span>
  );
}