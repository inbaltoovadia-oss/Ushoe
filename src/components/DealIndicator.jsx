/**
 * DealIndicator — static visual badge shown on ShoeCard.
 * NO LLM calls. Uses catalog data only (original_price vs price).
 * Shows a badge only when catalog data confirms a discount.
 */
export default function DealIndicator({ shoe, className = "" }) {
  if (!shoe) return null;

  const hasDiscount = shoe.original_price && shoe.original_price > shoe.price;
  const discountPct = hasDiscount
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  if (!hasDiscount || discountPct < 1) return null;

  return (
    <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm bg-red-500 ${className}`}>
      🏷 Sale · {discountPct}% off
    </div>
  );
}