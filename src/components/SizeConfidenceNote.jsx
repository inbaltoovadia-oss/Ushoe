/**
 * SizeConfidenceNote — static sizing guidance derived from catalog data.
 * Zero credits.
 */
import { Ruler } from "lucide-react";

const SIZE_RULES = [
  {
    match: (s) => s.features?.some(f => /wide|wide foot/i.test(f)) || s.name?.toLowerCase().includes("wide"),
    label: "Wide Foot Friendly",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    match: (s) => s.category === "Running" && (s.brand === "Hoka" || s.brand === "Asics"),
    label: "Runs Large — Size Down",
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    match: (s) => s.brand === "Converse" || s.brand === "Vans",
    label: "Runs Small — Size Up",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    match: (s) => s.category === "Basketball" || s.category === "Training",
    label: "True to Size",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    match: (s) => s.brand === "Nike" && s.category === "Running",
    label: "Half Size Up Recommended",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    match: () => true, // default
    label: "True to Size",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
];

export default function SizeConfidenceNote({ shoe }) {
  if (!shoe) return null;
  const rule = SIZE_RULES.find(r => r.match(shoe));
  if (!rule) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl ${rule.bg} ${rule.color}`}>
      <Ruler className="w-3.5 h-3.5 flex-shrink-0" />
      {rule.label}
    </div>
  );
}