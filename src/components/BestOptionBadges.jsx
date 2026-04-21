import { Trophy, Flame, Zap } from "lucide-react";

/**
 * Shows "Best Value", "Most Popular", "Fastest Pickup" badges based on shoe data.
 */
export default function BestOptionBadges({ shoe, allShoes = [] }) {
  const badges = [];

  if (allShoes.length > 0) {
    // Best Value: highest discount %
    const discounted = allShoes.filter(s => s.original_price > s.price);
    if (discounted.length > 0) {
      const bestValue = discounted.reduce((best, s) =>
        (s.original_price - s.price) / s.original_price > (best.original_price - best.price) / best.original_price ? s : best
      );
      if (bestValue.id === shoe.id) {
        badges.push({ icon: Trophy, label: "Best Value", color: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40" });
      }
    }

    // Most Popular: highest trending_score in its category
    const sameCat = allShoes.filter(s => s.category === shoe.category);
    if (sameCat.length > 1) {
      const topTrending = sameCat.reduce((best, s) => (s.trending_score || 0) > (best.trending_score || 0) ? s : best);
      if (topTrending.id === shoe.id) {
        badges.push({ icon: Flame, label: "Most Popular", color: "text-accent bg-accent/10 border-accent/20" });
      }
    }
  } else {
    // Single shoe context — derive from its own data
    if (shoe.original_price > shoe.price) {
      const pct = Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100);
      if (pct >= 15) {
        badges.push({ icon: Trophy, label: `Best Value — ${pct}% Off`, color: "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/40" });
      }
    }
    if ((shoe.trending_score || 0) >= 80) {
      badges.push({ icon: Flame, label: "Most Popular", color: "text-accent bg-accent/10 border-accent/20" });
    }
  }

  if (shoe.is_trending && !badges.find(b => b.label === "Most Popular")) {
    badges.push({ icon: Flame, label: "Trending Now", color: "text-accent bg-accent/10 border-accent/20" });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(({ icon: Icon, label, color }) => (
        <span key={label} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${color}`}>
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
      ))}
    </div>
  );
}