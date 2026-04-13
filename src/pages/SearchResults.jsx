import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import StoreCard from "../components/StoreCard";
import SkeletonCard from "../components/SkeletonCard";
import SearchBar from "../components/SearchBar";

const sortOptions = [
  { label: "Trending", value: "trending" },
  { label: "Price: Low", value: "price_asc" },
  { label: "Price: High", value: "price_desc" },
  { label: "Rating", value: "rating" },
];

export default function SearchResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [shoes, setShoes] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("trending");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ brand: "", category: "", maxPrice: 300 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [shoeData, storeData] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 50),
      base44.entities.Store.list("-rating", 20),
    ]);
    setShoes(shoeData);
    setStores(storeData);
    setLoading(false);
  };

  const handleSearch = (q) => {
    setQuery(q);
    window.history.replaceState(null, "", `/search?q=${encodeURIComponent(q)}`);
  };

  // Filter & sort
  let filtered = shoes.filter((shoe) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      shoe.name.toLowerCase().includes(q) ||
      shoe.brand.toLowerCase().includes(q) ||
      (shoe.category || "").toLowerCase().includes(q) ||
      (shoe.description || "").toLowerCase().includes(q) ||
      (shoe.features || []).some((f) => f.toLowerCase().includes(q));

    const matchesBrand = !filters.brand || shoe.brand === filters.brand;
    const matchesCategory = !filters.category || shoe.category === filters.category;
    const matchesPrice = shoe.price <= filters.maxPrice;

    return matchesQuery && matchesBrand && matchesCategory && matchesPrice;
  });

  if (sort === "price_asc") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else filtered.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));

  const brands = [...new Set(shoes.map((s) => s.brand))];
  const categories = [...new Set(shoes.map((s) => s.category).filter(Boolean))];

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="bg-card border-b border-border py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Sort & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {filtered.length} results{query ? ` for "${query}"` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showFilters
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <div className="flex gap-1 bg-secondary rounded-xl p-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sort === opt.value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 flex flex-wrap gap-6">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Brand</label>
              <select
                value={filters.brand}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                className="bg-secondary border-none rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">All Brands</option>
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="bg-secondary border-none rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Max Price: ${filters.maxPrice}
              </label>
              <input
                type="range"
                min={50}
                max={500}
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                className="w-40 accent-primary"
              />
            </div>
            <button
              onClick={() => setFilters({ brand: "", category: "", maxPrice: 300 })}
              className="self-end text-xs text-primary hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* Results - Split View on Desktop */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Shoes Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filtered.map((shoe, i) => (
                  <ShoeCard key={shoe.id} shoe={shoe} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg">No results found</h3>
                <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {/* Nearby Stores Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <h3 className="font-heading font-semibold text-lg mb-4">Nearby Stores</h3>
            <div className="space-y-3">
              {stores.slice(0, 4).map((store, i) => (
                <StoreCard key={store.id} store={store} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}