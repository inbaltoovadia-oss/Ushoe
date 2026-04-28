/**
 * PriceHistoryCard — shows price trend derived from catalog metadata.
 * Zero API calls.
 */
import { TrendingDown, TrendingUp, Minus, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getPriceHistory } from "../lib/priceHistory";

export default function PriceHistoryCard({ shoe }) {
  const history = getPriceHistory(shoe);
  if (!history) return null;

  const TrendIcon = history.trend === "down" || history.trend === "dropping"
    ? TrendingDown
    : history.trend === "up"
    ? TrendingUp
    : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card/60 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price History</p>
        <span className={`flex items-center gap-1 text-xs font-semibold ${history.trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          {history.trendLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="font-heading font-bold text-lg text-foreground">${history.current}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Current</p>
        </div>
        <div className="text-center border-x border-border/40">
          <p className="font-heading font-bold text-lg text-muted-foreground">${history.avg}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Avg Recent</p>
        </div>
        <div className="text-center">
          <p className="font-heading font-bold text-lg text-green-600">${history.low}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Lowest</p>
        </div>
      </div>

      {history.isGoodToBuy && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2 text-xs text-green-700 dark:text-green-400 font-medium">
          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Good time to buy — price is at or near its lowest
        </div>
      )}
    </motion.div>
  );
}