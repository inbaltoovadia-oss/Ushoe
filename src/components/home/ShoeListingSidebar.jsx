import { useState } from "react";
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = ["Running", "Casual", "Basketball", "Lifestyle", "Training", "Walking", "Sport", "Tennis"];
const BRANDS = ["Nike", "Adidas", "New Balance", "Jordan", "Puma", "Reebok", "ASICS", "Hoka", "Saucony", "Vans", "Converse"];
const COLORS = [
  { name: "Black", hex: "#111" },
  { name: "White", hex: "#f5f5f5", border: true },
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Grey", hex: "#9ca3af" },
  { name: "Brown", hex: "#92400e" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Multi", hex: "linear-gradient(135deg,#ef4444,#3b82f6,#22c55e)" },
];

function Section({ title, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border/50 pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-semibold mb-3 hover:text-primary transition-colors"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && children}
    </div>
  );
}

export default function ShoeListingSidebar({ filters, onChange, onClose }) {
  const toggle = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    onChange({ ...filters, [key]: updated });
  };

  const allShoes = [];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <span className="font-heading font-semibold text-base">Filters</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange({ brands: [], categories: [], minPrice: 0, maxPrice: 500 })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-secondary">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <Section title="Sort By">
        <div className="space-y-1">
          {[
            { value: "trending", label: "Trending" },
            { value: "newest", label: "Newest Arrivals" },
            { value: "highest_discount", label: "Highest Discount" },
            { value: "price_asc", label: "Price: Low to High" },
            { value: "price_desc", label: "Price: High to Low" },
            { value: "rating", label: "Top Rated" },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...filters, sort: opt.value })}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all ${
                (filters.sort || "trending") === opt.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-secondary text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Price Range */}
      <Section title="Price Range">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">${filters.minPrice ?? 0}</span>
            <span className="text-muted-foreground">${filters.maxPrice >= 500 ? "500+" : filters.maxPrice}</span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={filters.maxPrice ?? 500}
            onChange={e => onChange({ ...filters, maxPrice: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex gap-2">
            {[100, 150, 200, 300].map(p => (
              <button
                key={p}
                onClick={() => onChange({ ...filters, maxPrice: p })}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-all ${
                  filters.maxPrice === p
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                &lt;${p}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Categories */}
      <Section title="Category">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => toggle("categories", cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                (filters.categories || []).includes(cat)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Section>

      {/* Brands */}
      <Section title="Brand">
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {BRANDS.map(brand => (
            <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={(filters.brands || []).includes(brand)}
                onChange={() => toggle("brands", brand)}
                className="accent-primary w-3.5 h-3.5 rounded"
              />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{brand}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Colors */}
      <Section title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map(color => {
            const active = (filters.colors || []).includes(color.name);
            return (
              <button
                key={color.name}
                onClick={() => toggle("colors", color.name)}
                title={color.name}
                className={`w-7 h-7 rounded-full border-2 transition-all ${active ? "border-primary scale-110 ring-2 ring-primary/40" : color.border ? "border-border" : "border-transparent"}`}
                style={{ background: color.hex }}
              />
            );
          })}
        </div>
        {(filters.colors || []).length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">{(filters.colors).join(", ")}</p>
        )}
      </Section>

      {/* On Sale */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">On Sale Only</span>
        <button
          onClick={() => onChange({ ...filters, onSaleOnly: !filters.onSaleOnly })}
          className={`w-10 h-5 rounded-full transition-all ${filters.onSaleOnly ? "bg-primary" : "bg-secondary"}`}
        >
          <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${filters.onSaleOnly ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>
    </div>
  );
}