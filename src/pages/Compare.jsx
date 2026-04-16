import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, X } from "lucide-react";
import { getCompareShoes, clearCompare, subscribeCompare, toggleCompare } from "../lib/compareStore";
import { motion } from "framer-motion";

const ROWS = [
  { label: "Brand", key: "brand" },
  { label: "Price", key: "price", render: (v) => v ? `$${v}` : "—" },
  { label: "Original Price", key: "original_price", render: (v) => v ? `$${v}` : "—" },
  { label: "Category", key: "category" },
  { label: "Gender", key: "gender" },
  { label: "Rating", key: "rating", render: (v) => v ? (
    <span className="flex items-center gap-1 justify-center">
      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />{v}
    </span>
  ) : "—" },
  { label: "Available Sizes", key: "sizes_available", render: (v) => v?.length ? v.join(", ") : "—" },
  { label: "Colors", key: "colors_available", render: (v) => v?.length ? (
    <div className="flex flex-wrap gap-1 justify-center">
      {v.map(c => <span key={c} className="text-xs px-2 py-0.5 bg-secondary rounded-full">{c}</span>)}
    </div>
  ) : "—" },
  { label: "Features / Materials", key: "features", render: (v) => v?.length ? (
    <div className="flex flex-wrap gap-1 justify-center">
      {v.map(f => <span key={f} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{f}</span>)}
    </div>
  ) : "—" },
  { label: "Colorway", key: "colorway" },
  { label: "Release Date", key: "release_date" },
  { label: "Is Trending", key: "is_trending", render: (v) => v ? "🔥 Yes" : "No" },
];

export default function Compare() {
  const navigate = useNavigate();
  const [shoes, setShoes] = useState(getCompareShoes());

  useEffect(() => subscribeCompare(setShoes), []);

  if (shoes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h2 className="font-heading font-bold text-2xl mb-2">No shoes selected</h2>
        <p className="text-muted-foreground mb-6">Go back and select shoes to compare.</p>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl">Compare Shoes</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{shoes.length} selected</span>
          </div>
          <button
            onClick={clearCompare}
            className="text-sm text-destructive hover:underline"
          >
            Clear all
          </button>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            {/* Shoe image headers */}
            <thead>
              <tr>
                <th className="w-36 text-left text-sm font-medium text-muted-foreground pb-6 pr-4">Spec</th>
                {shoes.map((shoe) => (
                  <th key={shoe.id} className="pb-6 px-3">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border rounded-2xl p-4 text-center relative"
                    >
                      <button
                        onClick={() => toggleCompare(shoe)}
                        className="absolute top-2 right-2 p-1 rounded-lg hover:bg-secondary text-muted-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <img
                        src={shoe.image_url}
                        alt={shoe.name}
                        className="w-24 h-24 object-cover rounded-xl mx-auto mb-3 bg-secondary"
                      />
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{shoe.brand}</p>
                      <p className="font-heading font-semibold text-sm mt-0.5 leading-tight">{shoe.name}</p>
                    </motion.div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
                <tr key={row.key} className={ri % 2 === 0 ? "bg-secondary/30" : ""}>
                  <td className="py-3 pr-4 text-sm font-medium text-muted-foreground rounded-l-xl pl-3 whitespace-nowrap">
                    {row.label}
                  </td>
                  {shoes.map((shoe) => {
                    const val = shoe[row.key];
                    const display = row.render ? row.render(val) : (val ?? "—");
                    return (
                      <td key={shoe.id} className="py-3 px-3 text-sm text-center last:rounded-r-xl">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}