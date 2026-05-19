/**
 * DEAL + NEARBY AGENT
 * Single fastWebSearch call returns both online deals AND nearby stores.
 * Results are cached per shoe+city+size+color for 10 min.
 */

import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals, normalizeCity } from "./agentCache";

export async function runDealAgent({ shoe, city, size = null, color = null, countryCode = "", latitude = null, longitude = null, forceRefresh = false }) {
  if (!forceRefresh) {
    const cached = getCachedDeals(shoe.id, city, size, color, latitude, longitude);
    if (cached) return cached;
  }

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";

  const sizeStr = size ? ` US size ${size}` : "";
  const colorStr = (color || shoe.colorway) ? ` ${color || shoe.colorway}` : "";
  const query = `${shoe.brand} ${shoe.name}${colorStr}${sizeStr} buy`;

  const res = await base44.functions.invoke('fastWebSearch', {
    query,
    category: shoe.category,
    city,
    country,
    countryCode: code,
    latitude,
    longitude,
  });

  const data = res?.data || {};
  const picks = data.web_picks || [];
  const similarPicks = data.similar_options || [];
  const currencySymbol = data.currency_symbol || "$";
  const currencyCode = data.currency_code || "USD";

  function mapPick(p) {
    const priceNum = p.price_numeric || parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || null;
    const origNum = p.original_price ? parseFloat((p.original_price || "0").replace(/[^0-9.]/g, "")) || null : null;
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
      deal_type:         discount > 0 ? "sale" : "regular",
      confidence:        p.price_confidence || "medium",
      deal_confirmed:    priceNum !== null,
      is_best_deal:      !!p.is_best_deal,
      ships_to_location: p.ships_to_user !== false,
      buy_link:          p.buy_link || null,
      currency_symbol:   currencySymbol,
      currency_code:     currencyCode,
      exact_match:       p.exact_colorway_match !== false,
    };
  }

  const retailers = picks.map(mapPick);
  const similar_retailers = similarPicks.map(p => ({ ...mapPick(p), exact_match: false }));

  const nearby_stores = [];

  const bestPrice = retailers.reduce((min, r) => {
    if (r.deal_price && (min === null || r.deal_price < min)) return r.deal_price;
    return min;
  }, null);

  const hasDeal = retailers.some(r => r.discount_pct > 0);
  const bestRetailer = retailers.find(r => r.is_best_deal);

  const summary = bestRetailer
    ? `Best price: ${bestRetailer.deal_price} at ${bestRetailer.retailer_name}${bestRetailer.discount_pct > 0 ? ` (${bestRetailer.discount_pct}% off)` : ""}`
    : retailers.length > 0
    ? `Found ${retailers.length} retailer${retailers.length > 1 ? "s" : ""} carrying this shoe`
    : "";

  const result = { summary, best_price_found: bestPrice, has_active_deals: hasDeal, retailers, similar_retailers, nearby_stores, currency_symbol: currencySymbol, currency_code: currencyCode };
  setCachedDeals(shoe.id, city, result, size, color, latitude, longitude);
  return result;
}