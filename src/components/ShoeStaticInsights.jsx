/**
 * ShoeStaticInsights — replaces the AI summary with zero-credit static analysis.
 * Derives useful insights from catalog data fields only.
 */
import { CheckCircle, Zap, Shield, TrendingUp, Award, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_INSIGHTS = {
  Running:      { icon: Zap,        text: "Built for performance running",        color: "text-blue-500",  bg: "bg-blue-50 dark:bg-blue-950/30" },
  Basketball:   { icon: TrendingUp, text: "Court-ready performance",              color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  Casual:       { icon: ThumbsUp,   text: "All-day comfort & style",              color: "text-green-500",  bg: "bg-green-50 dark:bg-green-950/30" },
  Lifestyle:    { icon: Award,      text: "Streetwear icon",                      color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  Training:     { icon: Zap,        text: "Engineered for cross-training",        color: "text-red-500",    bg: "bg-red-50 dark:bg-red-950/30" },
  Hiking:       { icon: Shield,     text: "Trail-ready durability",               color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30" },
  Walking:      { icon: CheckCircle,text: "Supreme comfort for long walks",       color: "text-teal-500",   bg: "bg-teal-50 dark:bg-teal-950/30" },
  Tennis:       { icon: Zap,        text: "Lateral support for court movement",  color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  Skateboarding:{ icon: Award,      text: "Grippy sole & impact protection",      color: "text-gray-600",   bg: "bg-gray-100 dark:bg-gray-900/30" },
  Golf:         { icon: CheckCircle,text: "Stability for the fairway",            color: "text-green-600",  bg: "bg-green-50 dark:bg-green-950/30" },
};

function getValueLabel(price) {
  if (price < 80)  return { label: "Great Value", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" };
  if (price < 150) return { label: "Mid-Range",   color: "text-blue-600",  bg: "bg-blue-50 dark:bg-blue-950/30" };
  if (price < 250) return { label: "Premium",     color: "text-purple-600",bg: "bg-purple-50 dark:bg-purple-950/30" };
  return             { label: "Luxury",           color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" };
}

function buildInsightPoints(shoe) {
  const points = [];

  // Category-based
  if (shoe.category && CATEGORY_INSIGHTS[shoe.category]) {
    points.push({ icon: CATEGORY_INSIGHTS[shoe.category].icon, text: CATEGORY_INSIGHTS[shoe.category].text });
  }

  // Rating
  if (shoe.rating >= 4.5) points.push({ icon: Award,        text: `Top-rated — ${shoe.rating}/5 stars` });
  else if (shoe.rating >= 4.0) points.push({ icon: ThumbsUp, text: `Well-reviewed — ${shoe.rating}/5 stars` });

  // Trending
  if (shoe.is_trending || shoe.trending_score >= 80) {
    points.push({ icon: TrendingUp, text: "Currently trending — high demand" });
  }

  // Discount
  if (shoe.original_price > shoe.price) {
    const pct = Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100);
    points.push({ icon: CheckCircle, text: `On sale — ${pct}% off retail price` });
  }

  // Features
  if (shoe.features?.length >= 3) {
    points.push({ icon: Shield, text: `${shoe.features.length} premium features included` });
  }

  // Sizes
  if (shoe.sizes_available?.length >= 10) {
    points.push({ icon: CheckCircle, text: "Wide size range available" });
  }

  return points.slice(0, 4);
}

export default function ShoeStaticInsights({ shoe }) {
  if (!shoe) return null;

  const points = buildInsightPoints(shoe);
  const value  = getValueLabel(shoe.price);

  if (points.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-2.5"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Verdict</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${value.bg} ${value.color}`}>{value.label}</span>
      </div>

      {points.map(({ icon: Icon, text }, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">{text}</p>
        </div>
      ))}
    </motion.div>
  );
}