import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, SlidersHorizontal, X, Brain, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";
import ShoeListingSidebar from "./ShoeListingSidebar";
import SponsoredModal from "../SponsoredModal";
import { getUserProfile } from "../../lib/userProfileStore";
import { rankShoes, buildExplanation } from "../../lib/personalizationEngine";
import { getWishlistIds } from "../../lib/wishlistStore";

const DEFAULT_FILTERS = {
  brands: [],
  categories: [],
  colors: [],
  minPrice: 0,
  maxPrice: 500,
  onSaleOnly: false,
  sort: "personalized",
};

const HOME_CATEGORIES = [
  { label: "Sport", emoji: "⚽" },
  { label: "Casual", emoji: "👟" },
  { label: "Running", emoji: "🏃" },
  { label: "Basketball", emoji: "🏀" },
  { label: "Tennis", emoji: "🎾" },
  { label: "Lifestyle", emoji: "✨" },
];

const SPONSORED_INDICES = [3, 11, 19];
const SPONSORED_PLAN_TIERS = ["brand", "featured", "starter"];

export default function ForYouSection() {
  const [allShoes, setAllShoes] = useState([]);
  const [rankedShoes, setRankedShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sponsorModal, setSponsorModal] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [shoes, userProfile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 150),
      getUserProfile(),
    ]);

    const wishlistIds = Array.from(getWishlistIds());
    const ranked = rankShoes(shoes, userProfile, { excludeIds: [], limit: 150 });

    setAllShoes(shoes);
    setRankedShoes(ranked);
    setProfile(userProfile);
    setExplanation(buildExplanation(userProfile));
    setLoading(false);
  };

  // Apply manual filters on top of the personalized ranking
  const applyFilters = (shoes) => {
    return shoes.filter(shoe => {
      if (filters.brands.length && !filters.brands.includes(shoe.brand)) return false;
      if (filters.categories.length && !filters.categories.includes(shoe.category)) return false;
      if (shoe.price < filters.minPrice) return false;
      if (filters.maxPrice < 500 && shoe.price > filters.maxPrice) return false;
      if (filters.onSaleOnly && !(shoe.original_price > shoe.price)) return false;
      // Color filter — check colorway or colors_available fields
      if (filters.colors?.length) {
        const colorwayStr = (shoe.colorway || "").toLowerCase();
        const colorsAvail = (shoe.colors_available || []).map(c => c.toLowerCase());
        const matches = filters.colors.some(c => {
          const cl = c.toLowerCase();
          return colorwayStr.includes(cl) || colorsAvail.some(ca => ca.includes(cl));
        });
        if (!matches) return false;
      }
      return true;
    });
  };

  const applySort = (shoes) => {
    const sorted = [...shoes];
    if (filters.sort === "newest") return sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
    if (filters.sort === "highest_discount") return sorted.sort((a, b) => {
      const discA = a.original_price > a.price ? (a.original_price - a.price) / a.original_price : 0;
      const discB = b.original_price > b.price ? (b.original_price - b.price) / b.original_price : 0;
      return discB - discA;
    });
    if (filters.sort === "price_asc") return sorted.sort((a, b) => a.price - b.price);
    if (filters.sort === "price_desc") return sorted.sort((a, b) => b.price - a.price);
    if (filters.sort === "rating") return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    // default: personalized — already sorted by _score
    return sorted;
  };

  const rawDisplayed = applySort(applyFilters(rankedShoes));
  const sponsoredShoes = rawDisplayed.filter((_, i) => SPONSORED_INDICES.includes(i));
  const regularShoes = rawDisplayed.filter((_, i) => !SPONSORED_INDICES.includes(i));
  const displayedShoes = [...sponsoredShoes, ...regularShoes];

  const activeFilterCount = filters.brands.length + filters.categories.length +
    (filters.colors?.length || 0) +
    (filters.onSaleOnly ? 1 : 0) + (filters.maxPrice < 500 || filters.minPrice > 0 ? 1 : 0);

  const hasProfile = profile?.survey_completed || profile?.recent_queries?.length > 0;

  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              {hasProfile ? <Brain className="w-5 h-5 text-primary" /> : <Sparkles className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl">
                {hasProfile ? "Picked For You" : "Trending Now"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {hasProfile && <TrendingUp className="w-3 h-3" />}
                {explanation}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!profile?.survey_completed && (
              <Link to="/survey" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Personalize <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-all ${
                showSidebar || activeFilterCount > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary-foreground/20 text-primary-foreground text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category quick-picks */}
        <div className="flex flex-wrap gap-2 mb-4">
          {HOME_CATEGORIES.map(({ label, emoji }) => {
            const active = filters.categories.includes(label);
            return (
              <button
                key={label}
                onClick={() => {
                  const current = filters.categories;
                  const updated = active ? current.filter(c => c !== label) : [...current, label];
                  setFilters(f => ({ ...f, categories: updated }));
                }}
                className={`flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-full font-medium transition-all border ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card"
                }`}
              >
                <span>{emoji}</span>{label}
              </button>
            );
          })}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
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
            {filters.maxPrice < 500 && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                Under ${filters.maxPrice} <button onClick={() => setFilters(f => ({ ...f, maxPrice: 500 }))}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Layout: sidebar + grid */}
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          {showSidebar && (
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <ShoeListingSidebar filters={filters} onChange={setFilters} />
            </aside>
          )}

          {/* Mobile sidebar overlay */}
          {showSidebar && (
            <div className="lg:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
              <div className="relative ml-auto w-72 h-full bg-background overflow-y-auto p-4 shadow-xl">
                <ShoeListingSidebar filters={filters} onChange={setFilters} onClose={() => setShowSidebar(false)} />
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : displayedShoes.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {rawDisplayed.length} shoe{rawDisplayed.length !== 1 ? "s" : ""}
                  {hasProfile && <span className="ml-1 text-primary">· personalized</span>}
                </p>

                {/* Featured / Sponsored row */}
                {sponsoredShoes.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">⭐ Featured</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {sponsoredShoes.map((shoe, i) => (
                        <ShoeCard
                          key={shoe.id + "-sp"}
                          shoe={shoe}
                          index={i}
                          sponsored
                          sponsorTier={SPONSORED_PLAN_TIERS[i] || "starter"}
                          onSponsorClick={() => setSponsorModal(shoe)}
                        />
                      ))}
                    </div>
                    <div className="border-t border-border/50 mt-6 mb-4" />
                  </div>
                )}

                <div className={`grid gap-4 sm:gap-5 ${showSidebar ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
                  {regularShoes.map((shoe, i) => (
                    <ShoeCard
                      key={shoe.id}
                      shoe={shoe}
                      index={i}
                      onSponsorClick={() => setSponsorModal(shoe)}
                    />
                  ))}
                </div>

                {sponsorModal && (
                  <SponsoredModal
                    shoe={sponsorModal}
                    onClose={() => setSponsorModal(null)}
                    onSponsorComplete={load}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg">No shoes match your filters</h3>
                <button onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-4 text-sm text-primary hover:underline">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}