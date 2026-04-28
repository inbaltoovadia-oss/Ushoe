/**
 * priceHistory — derives simulated price history from catalog metadata.
 * No API calls needed — we extrapolate from original_price, price, trending, etc.
 */

export function getPriceHistory(shoe) {
  if (!shoe) return null;

  const current = shoe.price;
  const original = shoe.original_price || current;
  const hasDiscount = original > current;

  // Derive avg and low from original price
  const avg = hasDiscount
    ? Math.round((current + original) / 2)
    : Math.round(current * 1.08); // slight "was higher" implication

  const low = hasDiscount
    ? Math.round(current * 0.95)
    : Math.round(current * 0.92);

  // Trend direction
  let trend = "stable";
  let trendLabel = "Stable";
  let trendColor = "text-muted-foreground";

  if (hasDiscount) {
    const pct = ((original - current) / original) * 100;
    if (pct >= 20) { trend = "down"; trendLabel = "Price Down ▼"; trendColor = "text-green-600"; }
    else { trend = "dropping"; trendLabel = "Recently Reduced ↓"; trendColor = "text-blue-600"; }
  } else if (shoe.is_trending || (shoe.trending_score || 0) > 70) {
    trend = "up";
    trendLabel = "Rising ↑ (High Demand)";
    trendColor = "text-orange-600";
  }

  const isGoodToBuy = trend === "down" || current <= low * 1.05;

  return { current, avg, low, original, trend, trendLabel, trendColor, isGoodToBuy };
}