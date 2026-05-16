/**
 * DEAL SEARCH AGENT
 * Calls the fastWebSearch backend function which uses gemini_3_flash
 * with add_context_from_internet to find real live prices.
 * Passes exact model, color, and size for accurate matching.
 */

import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals } from "./agentCache";

export async function runDealAgent({ shoe, city, size = null, color = null, countryCode = "" }) {
  const cached = getCachedDeals(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";

  // Build the most specific query possible for exact matching
  const sizeStr = size ? ` US size ${size}` : "";
  const colorStr = (color || shoe.colorway) ? ` ${color || shoe.colorway}` : "";
  const query = `${shoe.brand} ${shoe.name}${colorStr}${sizeStr} buy`;

  const res = await base44.functions.invoke('fastWebSearch', {
    query,
    category: shoe.category,
    city,
    country,
    countryCode: code,
  });

  const picks = (res?.web_picks || res?.data?.web_picks || []);

  const retailers = picks.map((p, i) => {
    const priceNum = parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || null;
    const origNum = parseFloat((p.original_price || "0").replace(/[^0-9.]/g, "")) || null;
    const discount = origNum && priceNum && origNum > priceNum
      ? Math.round(((origNum - priceNum) / origNum) * 100)
      : (p.discount_percent || 0);
    return {
      retailer_name:     p.retailer || p.name,
      deal_price:        priceNum,
      original_price:    origNum || null,
      discount_pct:      discount,
      discount_value:    origNum && priceNum ? Math.max(0, origNum - priceNum) : 0,
      shipping_free:     (p.estimated_shipping || "").toLowerCase().includes("free"),
      shipping_cost:     (p.estimated_shipping || "").toLowerCase().includes("free") ? null : p.estimated_shipping,
      estimated_delivery: p.estimated_delivery || null,
      coupon_code:       p.coupon_code || null,
      deal_type:         discount > 0 ? "sale" : "regular",
      confidence:        p.price_confidence || "medium",
      deal_confirmed:    priceNum !== null,
      is_best_deal:      !!p.is_best_deal,
      ships_to_location: p.ships_to_user !== false,
      buy_link:          p.buy_link || null,
    };
  });

  const bestPrice = retailers.reduce((min, r) => {
    if (r.deal_price && (min === null || r.deal_price < min)) return r.deal_price;
    return min;
  }, null);

  const hasDeal = retailers.some(r => r.discount_pct > 0);
  const bestRetailer = retailers.find(r => r.is_best_deal);

  const summary = bestRetailer
    ? `Best price: $${bestRetailer.deal_price} at ${bestRetailer.retailer_name}${bestRetailer.discount_pct > 0 ? ` (${bestRetailer.discount_pct}% off)` : ""}`
    : retailers.length > 0
    ? `Found ${retailers.length} retailer${retailers.length > 1 ? "s" : ""} carrying this shoe`
    : "";

  const result = { summary, best_price_found: bestPrice, has_active_deals: hasDeal, retailers };
  setCachedDeals(shoe.id, city, result, size, color);
  return result;
}