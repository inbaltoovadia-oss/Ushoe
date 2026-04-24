/**
 * DealIndicator — smart badge shown on ShoeCard.
 * Shows: Deal Available, Sale Online, Ships to You, Local Discount, Best Price Nearby.
 * Uses lightweight LLM check + session cache. Non-blocking.
 */
import { useState, useEffect } from "react";
import { Tag, Truck, Store, Zap, TrendingDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getCachedIndicator, setCachedIndicator } from "../lib/agentCache";
import { getLocation } from "../lib/locationStore";

// In-memory dedup — one request per shoe+city per session
const IN_FLIGHT = {};
const RESULT_CACHE = {};

async function checkIndicator(shoe, city, country) {
  const key = `${shoe.id}_${city}`;
  if (RESULT_CACHE[key] !== undefined) return RESULT_CACHE[key];

  // Check sessionStorage cache
  const cached = getCachedIndicator(shoe.id, city);
  if (cached !== null) {
    RESULT_CACHE[key] = cached;
    return cached;
  }

  // Dedup concurrent calls for same shoe
  if (IN_FLIGHT[key]) return IN_FLIGHT[key];

  IN_FLIGHT[key] = base44.integrations.Core.InvokeLLM({
    prompt: `You are a deal & shipping checker for shoes. Quickly check if the ${shoe.brand} ${shoe.name} (catalog price $${shoe.price}) has any of the following for a customer in ${city}, ${country}:
1. An active online sale/discount vs catalog price
2. Free or affordable shipping to ${country}
3. A local store deal or in-store discount near ${city}

Be strict — only report what you can confirm from major retailers (Nike, Adidas, Foot Locker, Zappos, Amazon, etc).

Return:
- has_online_deal: boolean (confirmed lower price online)
- has_local_deal: boolean (confirmed in-store discount near ${city})
- ships_to_user: boolean (any major retailer ships to ${country})
- label: short label string — pick ONE best label from: "Sale Online", "Ships to You", "Local Discount", "Best Price Nearby", "Deal Available"
- deal_type: "sale" | "clearance" | "coupon" | "local" | "shipping"
- savings_pct: number (0 if no discount)`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        has_online_deal:  { type: "boolean" },
        has_local_deal:   { type: "boolean" },
        ships_to_user:    { type: "boolean" },
        label:            { type: "string" },
        deal_type:        { type: "string" },
        savings_pct:      { type: "number" },
      },
    },
  }).then(res => {
    // Only show badge if there's a real deal or confirmed shipping
    const show = res.has_online_deal || res.has_local_deal;
    const result = show ? {
      label:          res.label || "Deal Available",
      deal_type:      res.deal_type || "sale",
      has_online:     !!res.has_online_deal,
      has_local:      !!res.has_local_deal,
      ships_to_user:  !!res.ships_to_user,
      savings_pct:    res.savings_pct || 0,
    } : null;

    RESULT_CACHE[key] = result;
    setCachedIndicator(shoe.id, city, result);
    delete IN_FLIGHT[key];
    return result;
  }).catch(() => {
    delete IN_FLIGHT[key];
    return null;
  });

  return IN_FLIGHT[key];
}

const TYPE_STYLES = {
  sale:     { bg: "bg-red-500", icon: Tag },
  clearance:{ bg: "bg-orange-500", icon: Tag },
  coupon:   { bg: "bg-purple-600", icon: Zap },
  local:    { bg: "bg-green-600", icon: Store },
  shipping: { bg: "bg-blue-500", icon: Truck },
};

export default function DealIndicator({ shoe, className = "" }) {
  const [deal, setDeal] = useState(null);
  const [checked, setChecked] = useState(false);
  const loc = getLocation();

  useEffect(() => {
    let cancelled = false;
    checkIndicator(shoe, loc.city, loc.country).then(d => {
      if (!cancelled) { setDeal(d); setChecked(true); }
    }).catch(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [shoe.id, loc.city]);

  if (!checked || !deal) return null;

  const style = TYPE_STYLES[deal.deal_type] || TYPE_STYLES.sale;
  const Icon = style.icon;

  return (
    <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm ${style.bg} ${className}`}>
      <Icon className="w-2.5 h-2.5" />
      {deal.label}
      {deal.savings_pct > 0 && <span className="ml-0.5 opacity-90">·{deal.savings_pct}%</span>}
    </div>
  );
}