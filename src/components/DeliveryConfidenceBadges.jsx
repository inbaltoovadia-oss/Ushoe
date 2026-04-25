/**
 * DeliveryConfidenceBadges — shows shipping reliability signals for a retailer row.
 * Static logic based on known retailer data + the shipping info returned by agents.
 */
import { Truck, Package, RotateCcw, AlertTriangle, Zap } from "lucide-react";

const FAST_SHIPPERS = ["zappos", "amazon", "nike", "adidas", "foot locker"];
const EASY_RETURNS = ["zappos", "nordstrom", "amazon", "nike", "adidas", "dsw", "finish line"];
const IMPORT_RISK = ["aliexpress", "dhgate", "wish", "shein", "temu", "taobao"];

export default function DeliveryConfidenceBadges({ retailerName, shippingFree, estimatedDelivery, shipsToLocation }) {
  const n = (retailerName || "").toLowerCase();
  const isFast = FAST_SHIPPERS.some(s => n.includes(s));
  const hasEasyReturns = EASY_RETURNS.some(s => n.includes(s));
  const hasImportRisk = IMPORT_RISK.some(s => n.includes(s));

  const badges = [];

  if (shipsToLocation !== false) {
    badges.push({
      icon: Truck,
      label: estimatedDelivery ? `Ships · ${estimatedDelivery}` : "Ships to You",
      className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
    });
  }
  if (shippingFree) {
    badges.push({
      icon: Package,
      label: "Free Shipping",
      className: "text-primary bg-primary/10",
    });
  }
  if (isFast) {
    badges.push({
      icon: Zap,
      label: "Fast Delivery",
      className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    });
  }
  if (hasEasyReturns) {
    badges.push({
      icon: RotateCcw,
      label: "Easy Returns",
      className: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    });
  }
  if (hasImportRisk) {
    badges.push({
      icon: AlertTriangle,
      label: "Import Fees Possible",
      className: "text-red-500 bg-red-50 dark:bg-red-950/30",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {badges.map(({ icon: Icon, label, className }) => (
        <span key={label} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>
          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
          {label}
        </span>
      ))}
    </div>
  );
}