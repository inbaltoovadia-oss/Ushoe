/**
 * DEAL + NEARBY AGENT
 * Single fastWebSearch call returns both online deals AND nearby stores.
 * Results are cached per shoe+city+size+color for 10 min.
 */

import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals } from "./agentCache";

export async function runDealAgent({ shoe, city, size = null, color = null, countryCode = "", optimizeBy = "best_deal" }) {
  const cached = getCachedDeals(shoe.id, city, size, color);
  if (cached) return cached;

  const country = shoe._country || "United States";
  const code = countryCode || shoe._countryCode || "US";

  // Search by shoe name only — adding size/color causes "no results found" on retailer sites
  const query = `${shoe.brand} ${shoe.name} buy`;

  const res = await base44.functions.invoke('fastWebSearch', {
    query,
    category: shoe.category,
    city,
    country,
    countryCode: code,
    optimizeBy,
    selectedSize: size || null,
  });

  const data = res?.data || res || {};
  const picks = data.web_picks || [];
  const nearbyRaw = data.nearby_stores || [];

  const retailers = picks.map(p => {
    // Pass through fallback search links as-is (no price confirmed)
    if (p.is_fallback_search_link) {
      return {
        retailer_name: p.retailer,
        deal_price: null,
        buy_link: p.buy_link,
        confidence: 'low',
        deal_confirmed: false,
        is_best_deal: p.is_best_deal || false,
        ships_to_location: true,
        is_fallback_search_link: true,
      };
    }
    const priceNum = parseFloat((p.price || "0").replace(/[^0-9.]/g, "")) || null;
    const origNum = parseFloat((p.original_price || "0").replace(/[^0-9.]/g, "")) || null;
    const discount = origNum && priceNum && origNum > priceNum
      ? Math.round(((origNum - priceNum) / origNum) * 100)
      : (p.discount_percent || 0);
    return {
      retailer_name:     p.retailer || p.name,
      deal_price:        priceNum,
      original_price:    origNum || null,
      currency:          p.currency || "USD",
      discount_pct:      discount,
      discount_value:    origNum && priceNum ? Math.max(0, origNum - priceNum) : 0,
      shipping_free:     (p.estimated_shipping || "").toLowerCase().includes("free"),
      shipping_cost:     (p.estimated_shipping || "").toLowerCase().includes("free") ? null : p.estimated_shipping,
      coupon_code:       p.coupon_code || null,
      deal_type:         discount > 0 ? "sale" : "regular",
      confidence:        p.price_confidence || "medium",
      deal_confirmed:    priceNum !== null,
      is_best_deal:      !!p.is_best_deal,
      ships_to_location: p.ships_to_user !== false,
      buy_link:          p.buy_link || null,
      sizes_available:   p.sizes_available || [],
      colors_available:  p.colors_available || [],
    };
  });

  const nearby_stores = nearbyRaw
    .filter(s => s.name && s.address)
    .map(s => ({
      ...s,
      stock_status: "Check in store",
      maps_url: s.maps_url || `https://www.google.com/maps/search/${encodeURIComponent(`${s.name} ${s.address}`)}`,
    }));

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

  const result = { summary, best_price_found: bestPrice, has_active_deals: hasDeal, retailers, nearby_stores };
  // Only cache if we actually got results — don't cache empty/timeout responses
  if (retailers.length > 0) {
    setCachedDeals(shoe.id, city, result, size, color);
  }
  return result;
}