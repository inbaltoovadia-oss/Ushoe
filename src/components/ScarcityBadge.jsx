import { Flame, TrendingDown, Clock } from "lucide-react";

// Static scarcity badge — derived from catalog data, no LLM calls
export default function ScarcityBadge({ shoe }) {
  if (!shoe) return null;

  let type = null;

  if (shoe.original_price > shoe.price) {
    type = "price_drop";
  } else if ((shoe.trending_score || 0) >= 75 || shoe.is_trending) {
    type = "high_demand";
  } else if ((shoe.trending_score || 0) >= 55) {
    type = "low_stock";
  }

  if (!type) return null;

  const configs = {
    price_drop: {
      icon: TrendingDown,
      className: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200/60 dark:border-green-800/40",
      label: "Price dropped",
    },
    high_demand: {
      icon: Flame,
      className: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40",
      label: "High demand",
    },
    low_stock: {
      icon: Clock,
      className: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200/60 dark:border-red-800/40",
      label: "Selling fast",
    },
  };

  const cfg = configs[type];
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.className}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {cfg.label}
    </span>
  );
}