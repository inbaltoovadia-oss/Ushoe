/**
 * SizeStandardToggle — lets users switch between US / EU / UK sizing.
 * Shows the converted sizes inline beneath the size grid.
 */
import { convertFromUS } from "../lib/sizeConverter";

const STANDARDS = ["US", "EU", "UK"];

export default function SizeStandardToggle({ standard, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-muted-foreground mr-1">Size:</span>
      {STANDARDS.map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
            standard === s
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:bg-secondary/70"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/**
 * Displays a single US size in the chosen standard
 */
export function DisplaySize({ usSize, standard, gender = "Men" }) {
  if (standard === "US") return <>{usSize}</>;
  const entry = convertFromUS(usSize, gender);
  if (!entry) return <>{usSize}</>;
  return <>{standard === "EU" ? entry.eu : entry.uk}</>;
}