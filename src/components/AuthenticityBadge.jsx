/**
 * AuthenticityBadge — static trust badge for a retailer.
 * Classified by known retailer names. No LLM calls.
 */
import { ShieldCheck, ShieldAlert, BadgeCheck, Store, AlertTriangle } from "lucide-react";

const OFFICIAL_STORES = ["nike", "adidas", "new balance", "puma", "asics", "reebok", "converse", "vans", "hoka", "brooks", "saucony", "jordan"];
const AUTHORIZED_RETAILERS = ["foot locker", "finish line", "dsw", "zappos", "dick's sporting goods", "jd sports", "nordstrom", "academy sports", "hibbett"];
const TRUSTED_MARKETPLACES = ["amazon", "goat", "stockx", "stadium goods", "flight club"];
const LOW_CONFIDENCE = ["ebay", "facebook marketplace", "offerup", "poshmark", "mercari"];

function classify(name) {
  const n = (name || "").toLowerCase();
  if (OFFICIAL_STORES.some(s => n.includes(s))) return "official";
  if (AUTHORIZED_RETAILERS.some(s => n.includes(s))) return "authorized";
  if (TRUSTED_MARKETPLACES.some(s => n.includes(s))) return "trusted";
  if (LOW_CONFIDENCE.some(s => n.includes(s))) return "low";
  return "unknown";
}

const CONFIG = {
  official: {
    icon: BadgeCheck,
    label: "Official Brand Store",
    className: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200/60",
  },
  authorized: {
    icon: ShieldCheck,
    label: "Authorized Retailer",
    className: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200/60",
  },
  trusted: {
    icon: Store,
    label: "Trusted Marketplace",
    className: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200/60",
  },
  low: {
    icon: AlertTriangle,
    label: "Verify Before Buying",
    className: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200/60",
  },
  unknown: {
    icon: ShieldAlert,
    label: "Unverified Seller",
    className: "text-muted-foreground bg-secondary border-border/50",
  },
};

export default function AuthenticityBadge({ retailerName, compact = false }) {
  const level = classify(retailerName);
  const cfg = CONFIG[level];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${cfg.className}`}>
        <Icon className="w-2.5 h-2.5 flex-shrink-0" />
        {cfg.label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.className}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {cfg.label}
    </div>
  );
}

export { classify as classifyRetailer };