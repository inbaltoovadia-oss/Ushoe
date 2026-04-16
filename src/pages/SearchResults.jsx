import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, X, Globe, Loader2, Clock, AlertTriangle, ArrowUpDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import AdvancedFilters from "../components/search/AdvancedFilters";
import AISearchSuggestions from "../components/search/AISearchSuggestions";

const SORT_OPTIONS = [
  { label: "Trending", value: "trending" },
  { label: "Price ↑", value: "price_asc" },
  { label: "Price ↓", value: "price_desc" },
  { label: "Rating", value: "rating" },
  { label: "Newest", value: "newest" },
];

const DEFAULT_FILTERS = {
  brands: [], categories: [], sizes: [], colors: [], widths: [], genders: [],
  minPrice: 0, maxPrice: 500, onSaleOnly: false, inStockOnly: false,
};

export default function SearchResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const [query, setQuery] = useState(urlParams.get("q") || "");
  const [inputValue, setInputValue] = useState(urlParams.get("q") || "");
  const [shoes, setShoes] = useState([]);
  const [webResults, setWebResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [webLoading, setWebLoading] = useState(false);
  const [sort, setSort] = useState("trending");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dataAge, setDataAge] = useState(null);
  const [activeTab, setActiveTab] = useState("catalog");
  const inputRef = useRef(null);

  useEffect(() => { loadCatalog(); }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Shoe.list("-trending_score", 100);
      setShoes(data);
    } catch {
      setShoes([]);
    }
    setLoading(false);
  };

  const handleSearch = async (q) => {
    const finalQ = q || inputValue;
    setQuery(finalQ);
    setInputValue(finalQ);
    setShowSuggestions(false);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(finalQ)}`);

    if (!finalQ.trim()) return;

    // Fetch live web results via AI
    setWebLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web RIGHT NOW for shoes matching: "${finalQ}".
Find the latest models, current prices, and availability from Nike, Adidas, New Balance, Puma, Jordan, Hoka, ASICS, and other brands.
Search official brand websites, FootLocker, Zappos, DSW, StockX, GOAT, and Dick's Sporting Goods.
Return top 6 most relevant results with real current prices.
Indicate data_freshness (e.g. "Live - just now").
If data is stale or unavailable, set live_data_available to false.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            live_data_available: { type: "boolean" },
            data_freshness: { type: "string" },
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  price: { type: "string" },
                  original_price: { type: "string" },
                  category: { type: "string" },
                  colorway: { type: "string" },
                  retailer: { type: "string" },
                  buy_url: { type: "string" },
                  image_url: { type: "string" },
                  in_stock: { type: "boolean" },
                  release_date: { type: "string" },
                },
              },
            },
          },
        },
      });

      setWebResults(res.results || []);
      setDataAge(res.data_freshness || null);
    } catch {
      setWebResults([]);
    }
    setWebLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowSuggestions(false);
  };

  // Apply filters to catalog
  const filtered = shoes.filter(shoe => {
    const q = query.toLowerCase();
    const matchesQuery = !q ||
      shoe.name?.toLowerCase().includes(q) ||
      shoe.brand?.toLowerCase().includes(q) ||
      (shoe.category || "").toLowerCase().includes(q) ||
      (shoe.description || "").toLowerCase().includes(q) ||
      (shoe.colorway || "").toLowerCase().includes(q) ||
      (shoe.features || []).some(f => f.toLowerCase().includes(q));

    const matchesBrand = !filters.brands.length || filters.brands.includes(shoe.brand);
    const matchesCat = !filters.categories.length || filters.categories.includes(shoe.category);
    const matchesGender = !filters.genders.length || filters.genders.includes(shoe.gender) || shoe.gender === "Unisex";
    const matchesPrice = shoe.price >= filters.minPrice && shoe.price <= (filters.maxPrice >= 500 ? 99999 : filters.maxPrice);
    const matchesSale = !filters.onSaleOnly || (shoe.original_price && shoe.original_price > shoe.price);
    const matchesColor = !filters.colors.length || filters.colors.some(c =>
      (shoe.colorway || "").toLowerCase().includes(c.toLowerCase()) ||
      (shoe.colors_available || []).some(col => col.toLowerCase().includes(c.toLowerCase()))
    );
    const matchesSize = !filters.sizes.length || filters.sizes.some(s =>
      (shoe.sizes_available || []).includes(s)
    );

    return matchesQuery && matchesBrand && matchesCat && matchesGender && matchesPrice && matchesSale && matchesColor && matchesSize;
  });

  // Sort
  const sorted = [...filtered];
  if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
  else if (sort === "rating") sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === "newest") sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
  else sorted.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));

  const activeFilterCount = [
    filters.brands.length, filters.categories.length, filters.sizes.length,
    filters.colors.length, filters.widths.length, filters.genders.length,
    filters.onSaleOnly ? 1 : 0, filters.inStockOnly ? 1 : 0,
    (filters.maxPrice < 500 || filters.minPrice > 0) ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="bg-card border-b border-border py-5 px-4 sm:px-6 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <div className="flex items-center bg-secondary rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setShowSuggestions(true); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search shoes, brands, styles…"
                className="flex-1 bg-transparent border-none outline-none mx-3 text-sm placeholder:text-muted-foreground/50"
              />
              {inputValue && (
                <button onClick={() => { setInputValue(""); setQuery(""); }} className="p-1 rounded-lg hover:bg-background/50">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => handleSearch()}
                className="ml-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-xl text-sm font-medium hover:opacity-90"
              >
                Search
              </button>
            </div>

            {/* AI Suggestions */}
            {showSuggestions && (
              <AISearchSuggestions
                query={inputValue}
                onSelect={s => { handleSearch(s); setShowSuggestions(false); }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        {query && (
          <div className="flex gap-2 mb-4">
            {[{ id: "catalog", label: "Our Catalog" }, { id: "web", label: "🌐 Live Web Results" }].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === "web" && !webResults.length && query) handleSearch(); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.id === "web" && webLoading && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
              </button>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {activeTab === "catalog" ? `${sorted.length} shoes` : `${webResults.length} web results`}
              {query ? ` for "${query}"` : ""}
            </p>
            {dataAge && activeTab === "web" && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> {dataAge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            {activeTab === "catalog" && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showFilters || activeFilterCount > 0
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
                )}
              </button>
            )}

            {/* Sort */}
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sort === opt.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && activeTab === "catalog" && (
            <AdvancedFilters
              filters={filters}
              onChange={setFilters}
              shoes={shoes}
              onClose={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {activeFilterCount > 0 && activeTab === "catalog" && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {filters.brands.map(b => (
              <span key={b} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                {b} <button onClick={() => setFilters(f => ({ ...f, brands: f.brands.filter(x => x !== b) }))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.categories.map(c => (
              <span key={c} className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                {c} <button onClick={() => setFilters(f => ({ ...f, categories: f.categories.filter(x => x !== c) }))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.onSaleOnly && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-destructive/10 text-destructive rounded-full">
                On Sale <button onClick={() => setFilters(f => ({ ...f, onSaleOnly: false }))}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* CATALOG TAB */}
        {activeTab === "catalog" && (
          loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : sorted.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map((shoe, i) => <ShoeCard key={shoe.id} shoe={shoe} index={i} />)}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-lg">No results found</h3>
              <p className="text-muted-foreground text-sm mt-1">Try adjusting your filters or search term</p>
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-4 text-sm text-primary hover:underline">
                Clear all filters
              </button>
            </div>
          )
        )}

        {/* WEB TAB */}
        {activeTab === "web" && (
          <div>
            {webLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Globe className="w-4 h-4 animate-pulse text-primary" />
                  Searching the web for live results…
                </div>
                {[1,2,3].map(i => <div key={i} className="h-28 bg-secondary animate-pulse rounded-2xl" />)}
              </div>
            ) : webResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {webResults.map((item, i) => (
                  <motion.a
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    href={item.buy_url || `https://www.google.com/search?q=${encodeURIComponent((item.brand || "") + " " + (item.name || ""))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="block bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:border-primary/30 transition-all group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{item.brand} · {item.retailer}</p>
                        <h3 className="font-heading font-semibold mt-1 group-hover:text-primary transition-colors">{item.name}</h3>
                        {item.colorway && <p className="text-xs text-muted-foreground mt-0.5">{item.colorway}</p>}
                        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                      </div>
                      {item.in_stock === false && (
                        <span className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full whitespace-nowrap">Out of Stock</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="font-heading font-bold text-xl text-primary">{item.price}</span>
                      {item.original_price && item.original_price !== item.price && (
                        <span className="text-sm text-muted-foreground line-through">{item.original_price}</span>
                      )}
                    </div>
                    {item.release_date && (
                      <p className="text-xs text-muted-foreground mt-1">Released: {item.release_date}</p>
                    )}
                    <span className="text-xs text-primary mt-3 inline-block font-medium group-hover:underline">View →</span>
                  </motion.a>
                ))}
              </div>
            ) : query ? (
              <div className="text-center py-16">
                <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No web results yet. Run a search to see live data.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}