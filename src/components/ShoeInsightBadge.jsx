import { Sparkles } from "lucide-react";

// Static insight badge — derived from catalog data, no LLM calls
export default function ShoeInsightBadge({ shoe }) {
  if (!shoe) return null;

  let tip = null;

  if (shoe.category === "Running") tip = "Great for daily training runs";
  else if (shoe.category === "Basketball") tip = "Ankle support for court play";
  else if (shoe.category === "Hiking") tip = "Durable for rugged terrain";
  else if (shoe.category === "Casual" || shoe.category === "Lifestyle") tip = "Versatile everyday wear";
  else if (shoe.category === "Training") tip = "Built for gym & cross-training";
  else if (shoe.category === "Walking") tip = "Comfort-focused for long walks";
  else if (shoe.category === "Skateboarding") tip = "Flat sole for board feel";
  else if (shoe.price < 80) tip = "Great value pick";
  else if (shoe.price > 200) tip = "Premium build quality";
  else if ((shoe.rating || 0) >= 4.5) tip = "Top-rated by buyers";

  if (!tip) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1 rounded-full">
      <Sparkles className="w-3 h-3 flex-shrink-0" />
      {tip}
    </span>
  );
}