import { Trophy } from "lucide-react";

// Static deal banner — shows catalog discount only, no LLM calls
export default function BestDealBanner({ shoe }) {
  if (!shoe?.original_price || shoe.original_price <= shoe.price) return null;

  const savings = shoe.original_price - shoe.price;
  const pct = Math.round((savings / shoe.original_price) * 100);

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-2 border-amber-400/60 dark:border-amber-600/40 rounded-2xl p-4 shadow-lg shadow-amber-400/10">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 bg-amber-500 rounded-lg">
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          Sale — {pct}% Off
        </p>
        <div className="ml-auto text-right">
          <p className="font-heading font-bold text-2xl text-amber-700 dark:text-amber-300">${shoe.price}</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-500/70 line-through">${shoe.original_price}</p>
        </div>
      </div>
      <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
        Save ${savings.toFixed(0)} off the original price
      </p>
    </div>
  );
}