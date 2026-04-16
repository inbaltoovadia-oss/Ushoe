import { useState } from "react";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BRANDS = ["Nike", "Adidas", "New Balance", "Puma", "Converse", "Vans", "Jordan", "Reebok", "Hoka", "ASICS", "Saucony", "Brooks", "On Running", "Salomon"];
const CATEGORIES = ["Running", "Casual", "Basketball", "Lifestyle", "Training", "Walking", "Hiking", "Skateboarding"];
const SIZES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14];
const COLORS = ["Black", "White", "Red", "Blue", "Green", "Grey", "Brown", "Pink", "Orange", "Yellow", "Purple", "Multi"];
const WIDTHS = ["Narrow", "Regular", "Wide", "Extra Wide"];
const GENDERS = ["Men", "Women", "Unisex"];

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary text-muted-foreground border-transparent hover:border-border hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function AdvancedFilters({ filters, onChange, shoes, onClose }) {
  const activeCount = [
    filters.brands.length,
    filters.categories.length,
    filters.sizes.length,
    filters.colors.length,
    filters.widths.length,
    filters.genders.length,
    filters.onSaleOnly ? 1 : 0,
    filters.inStockOnly ? 1 : 0,
    filters.maxPrice < 500 || filters.minPrice > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const toggle = (key, val) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };

  const reset = () => onChange({
    brands: [], categories: [], sizes: [], colors: [], widths: [], genders: [],
    minPrice: 0, maxPrice: 500, onSaleOnly: false, inStockOnly: false,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-border rounded-2xl p-5 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Filters</span>
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Price Range */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price Range</label>
            <span className="text-xs font-semibold">${filters.minPrice} – ${filters.maxPrice === 500 ? "500+" : filters.maxPrice}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-6">$0</span>
            <div className="flex-1 relative h-6 flex items-center">
              <input
                type="range" min={0} max={500} step={10}
                value={filters.minPrice}
                onChange={e => onChange({ ...filters, minPrice: Math.min(Number(e.target.value), filters.maxPrice - 10) })}
                className="absolute w-full accent-primary h-1 appearance-none bg-transparent"
              />
              <input
                type="range" min={0} max={500} step={10}
                value={filters.maxPrice}
                onChange={e => onChange({ ...filters, maxPrice: Math.max(Number(e.target.value), filters.minPrice + 10) })}
                className="absolute w-full accent-primary h-1 appearance-none bg-transparent"
              />
              <div className="w-full h-1 bg-secondary rounded-full" />
            </div>
            <span className="text-xs text-muted-foreground w-8">$500</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filters.onSaleOnly ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            🔥 On Sale
          </button>
          <button
            onClick={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              filters.inStockOnly ? "bg-green-500/10 text-green-600 border-green-500/30" : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            ✓ In Stock Only
          </button>
        </div>

        {/* Brands */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Brand</label>
          <div className="flex flex-wrap gap-1.5">
            {BRANDS.map(b => (
              <Chip key={b} label={b} active={filters.brands.includes(b)} onClick={() => toggle("brands", b)} />
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <Chip key={c} label={c} active={filters.categories.includes(c)} onClick={() => toggle("categories", c)} />
            ))}
          </div>
        </div>

        {/* Gender */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Gender</label>
          <div className="flex flex-wrap gap-1.5">
            {GENDERS.map(g => (
              <Chip key={g} label={g} active={filters.genders.includes(g)} onClick={() => toggle("genders", g)} />
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Size (US Men's)</label>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map(s => (
              <button
                key={s}
                onClick={() => toggle("sizes", s)}
                className={`w-11 h-9 rounded-xl text-xs font-medium transition-all border ${
                  filters.sizes.includes(s)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Color</label>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map(c => (
              <Chip key={c} label={c} active={filters.colors.includes(c)} onClick={() => toggle("colors", c)} />
            ))}
          </div>
        </div>

        {/* Width */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">Width</label>
          <div className="flex flex-wrap gap-1.5">
            {WIDTHS.map(w => (
              <Chip key={w} label={w} active={filters.widths.includes(w)} onClick={() => toggle("widths", w)} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}