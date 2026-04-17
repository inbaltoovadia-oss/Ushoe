import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Star, X, TrendingDown, Trophy, GitCompare } from "lucide-react";
import { getCompareShoes, clearCompare, subscribeCompare, toggleCompare } from "../lib/compareStore";
import { getPlan, getLimits } from "../lib/planStore";
import PlanGate from "../components/PlanGate";
import { motion } from "framer-motion";

const ROWS = [
  { label: "Brand", key: "brand" },
  {
    label: "Price",
    key: "price",
    render: (v) => (v ? `$${v}` : "—"),
    highlight: "lowest", // highlight the shoe with the lowest value
  },
  {
    label: "Original Price",
    key: "original_price",
    render: (v) => (v ? `$${v}` : "—"),
  },
  {
    label: "Discount",
    key: "_discount",
    derived: (shoe) =>
      shoe.original_price > shoe.price
        ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
        : 0,
    render: (v) => (v > 0 ? `${v}% off` : "—"),
    highlight: "highest",
  },
  { label: "Category", key: "category" },
  { label: "Gender", key: "gender" },
  {
    label: "Rating",
    key: "rating",
    render: (v) =>
      v ? (
        <span className="flex items-center gap-1 justify-center">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          {v}
        </span>
      ) : (
        "—"
      ),
    highlight: "highest",
  },
  {
    label: "Available Sizes",
    key: "sizes_available",
    render: (v) => (v?.length ? v.join(", ") : "—"),
  },
  {
    label: "Colors",
    key: "colors_available",
    render: (v) =>
      v?.length ? (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 bg-secondary rounded-full">
              {c}
            </span>
          ))}
        </div>
      ) : (
        "—"
      ),
  },
  {
    label: "Features",
    key: "features",
    render: (v) =>
      v?.length ? (
        <div className="flex flex-wrap gap-1 justify-center">
          {v.map((f) => (
            <span key={f} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {f}
            </span>
          ))}
        </div>
      ) : (
        "—"
      ),
  },
  { label: "Colorway", key: "colorway" },
  { label: "Release Date", key: "release_date" },
  { label: "Is Trending", key: "is_trending", render: (v) => (v ? "🔥 Yes" : "No") },
];

function getVal(shoe, row) {
  if (row.derived) return row.derived(shoe);
  return shoe[row.key];
}

function getBestIndex(shoes, row) {
  if (!row.highlight) return -1;
  const vals = shoes.map((s) => {
    const v = getVal(s, row);
    return typeof v === "number" ? v : null;
  });
  if (vals.every((v) => v === null)) return -1;
  if (row.highlight === "lowest") {
    const min = Math.min(...vals.filter((v) => v !== null));
    return vals.findIndex((v) => v === min);
  }
  if (row.highlight === "highest") {
    const max = Math.max(...vals.filter((v) => v !== null));
    return vals.findIndex((v) => v === max);
  }
  return -1;
}

export default function Compare() {
  const navigate = useNavigate();
  const [shoes, setShoes] = useState(getCompareShoes());
  const limits = getLimits();

  useEffect(() => subscribeCompare(setShoes), []);

  // Free plan: max 2 shoes in compare
  const maxCompare = limits.compareMax || 2;
  const lockedShoes = shoes.slice(maxCompare);
  const visibleShoes = shoes.slice(0, maxCompare);
  const isPlanLocked = getPlan() === "free" && shoes.length > 2;

  if (shoes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <GitCompare className="w-14 h-14 text-muted-foreground/20 mb-4" />
        <h2 className="font-heading font-bold text-2xl mb-2">No shoes selected</h2>
        <p className="text-muted-foreground mb-6">Go back and select shoes to compare.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  // Best value: lowest price among visible shoes
  const bestValueIdx = visibleShoes.reduce(
    (bi, s, i) => (s.price < (visibleShoes[bi]?.price ?? Infinity) ? i : bi),
    0
  );

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl">Compare Shoes</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              {visibleShoes.length} selected
            </span>
          </div>
          <button onClick={clearCompare} className="text-sm text-destructive hover:underline">
            Clear all
          </button>
        </div>

        {/* Plan gate banner for >2 compare on free */}
        {isPlanLocked && (
          <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-700/40 rounded-2xl p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold text-amber-800 dark:text-amber-300">Free plan: compare up to 2 shoes.</span>
              <span className="text-muted-foreground ml-1">{lockedShoes.length} shoe(s) hidden.</span>
            </div>
            <Link
              to="/settings"
              className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
            >
              Upgrade →
            </Link>
          </div>
        )}

        {/* Price summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {visibleShoes.map((shoe, i) => {
            const savings =
              shoe.original_price > shoe.price ? shoe.original_price - shoe.price : 0;
            const isBest = i === bestValueIdx;
            return (
              <motion.div
                key={shoe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl border-2 p-4 text-center ${
                  isBest
                    ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                    : "border-border bg-card"
                }`}
              >
                {isBest && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 whitespace-nowrap">
                    <TrendingDown className="w-2.5 h-2.5" /> Best Value
                  </div>
                )}
                <img
                  src={shoe.image_url}
                  alt={shoe.name}
                  className="w-16 h-16 object-cover rounded-xl mx-auto mb-2 bg-secondary"
                />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium truncate">
                  {shoe.brand}
                </p>
                <p className="font-heading font-semibold text-xs leading-tight line-clamp-2 mt-0.5">
                  {shoe.name}
                </p>
                <p className="font-heading font-bold text-lg mt-2 text-primary">${shoe.price}</p>
                {savings > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Save ${savings}
                  </p>
                )}
                <button
                  onClick={() => toggleCompare(shoe)}
                  className="mt-2 text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 mx-auto"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Price difference callout */}
        {visibleShoes.length >= 2 && (() => {
          const prices = visibleShoes.map(s => s.price).filter(Boolean);
          const diff = Math.max(...prices) - Math.min(...prices);
          if (diff <= 0) return null;
          const cheapest = visibleShoes.find(s => s.price === Math.min(...prices));
          const priciest = visibleShoes.find(s => s.price === Math.max(...prices));
          return (
            <div className="mb-6 bg-primary/5 border border-primary/10 rounded-2xl px-5 py-3 text-sm flex items-center gap-3">
              <TrendingDown className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                <strong>{cheapest?.name}</strong> is{" "}
                <span className="text-green-600 font-bold">${diff} cheaper</span> than{" "}
                <strong>{priciest?.name}</strong>
                {priciest?.original_price > priciest?.price && (
                  <span className="text-muted-foreground">
                    {" "}(even after {Math.round(((priciest.original_price - priciest.price) / priciest.original_price) * 100)}% discount)
                  </span>
                )}
              </span>
            </div>
          );
        })()}

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr>
                <th className="w-36 text-left text-xs font-medium text-muted-foreground pb-4 pr-4 uppercase tracking-wider">
                  Spec
                </th>
                {visibleShoes.map((shoe) => (
                  <th key={shoe.id} className="pb-4 px-2 text-center text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {shoe.brand}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => {
                const bestIdx = getBestIndex(visibleShoes, row);
                return (
                  <tr key={row.key} className={ri % 2 === 0 ? "bg-secondary/30" : ""}>
                    <td className="py-3 pr-4 text-sm font-medium text-muted-foreground rounded-l-xl pl-3 whitespace-nowrap">
                      {row.label}
                    </td>
                    {visibleShoes.map((shoe, si) => {
                      const val = getVal(shoe, row);
                      const display = row.render ? row.render(val) : (val ?? "—");
                      const isHighlighted = bestIdx === si;
                      return (
                        <td
                          key={shoe.id}
                          className={`py-3 px-3 text-sm text-center last:rounded-r-xl transition-colors ${
                            isHighlighted
                              ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 font-semibold"
                              : ""
                          }`}
                        >
                          {display}
                          {isHighlighted && row.highlight === "lowest" && (
                            <span className="ml-1 text-[9px] text-green-600 font-bold">▼ Best</span>
                          )}
                          {isHighlighted && row.highlight === "highest" && (
                            <span className="ml-1 text-[9px] text-green-600 font-bold">▲ Best</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}