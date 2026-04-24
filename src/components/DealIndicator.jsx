/**
 * DealIndicator — lightweight badge shown on ShoeCard when Deal Agent confirms a live deal.
 * Uses a small per-shoe LLM call with caching. Does NOT block card render.
 */
import { useState, useEffect } from "react";
import { Tag, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getCachedDeals, setCachedDeals } from "../lib/agentCache";
import { getLocation } from "../lib/locationStore";

const INDICATOR_CACHE = {};

async function checkQuickDeal(shoe, city) {
  const key = `${shoe.id}_${city}`;
  if (INDICATOR_CACHE[key] !== undefined) return INDICATOR_CACHE[key];

  // Also check sessionStorage cache
  const cached = getCachedDeals(shoe.id, city);
  if (cached) {
    const result = cached.has_active_deals ? { label: "Deal Available", type: cached.retailers?.[0]?.deal_type || "sale" } : null;
    INDICATOR_CACHE[key] = result;
    return result;
  }

  // Quick lightweight check
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Quick check: Is the ${shoe.brand} ${shoe.name} (catalog price $${shoe.price}) currently on sale or available at a lower price online for customers in ${city}? Answer YES or NO and the deal type. Be strict — only say YES if you can confirm from official/major retailer sites.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        has_deal: { type: "boolean" },
        deal_type: { type: "string" },
        deal_label: { type: "string" },
      },
    },
  });

  const result = res.has_deal ? { label: res.deal_label || "Deal Available", type: res.deal_type || "sale" } : null;
  INDICATOR_CACHE[key] = result;
  return result;
}

const typeColors = {
  sale:      "bg-red-500 text-white",
  clearance: "bg-orange-500 text-white",
  coupon:    "bg-purple-500 text-white",
  regular:   "bg-green-500 text-white",
};

export default function DealIndicator({ shoe, className = "" }) {
  const [deal, setDeal] = useState(null);
  const [checked, setChecked] = useState(false);
  const loc = getLocation();

  useEffect(() => {
    let cancelled = false;
    checkQuickDeal(shoe, loc.city).then(d => {
      if (!cancelled) {
        setDeal(d);
        setChecked(true);
      }
    }).catch(() => setChecked(true));
    return () => { cancelled = true; };
  }, [shoe.id, loc.city]);

  if (!checked || !deal) return null;

  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${typeColors[deal.type] || typeColors.sale} ${className}`}>
      <Tag className="w-2.5 h-2.5" />
      {deal.label}
    </div>
  );
}