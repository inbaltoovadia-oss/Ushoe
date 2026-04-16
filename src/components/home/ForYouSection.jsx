import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";
import ShoeListingSidebar from "./ShoeListingSidebar";
import SponsoredModal from "../SponsoredModal";

const DEFAULT_FILTERS = {
  brands: [],
  categories: [],
  minPrice: 0,
  maxPrice: 500,
  onSaleOnly: false,
  sort: "trending",
};

export default function ForYouSection() {
  const [allShoes, setAllShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sponsorModal, setSponsorModal] = useState(null);

  useEffect(() => {
    loadPersonalized();
  }, []);

  const loadPersonalized = async () => {
    setLoading(true);
    let profiles = [];
    let shoes = [];

    try {
      [profiles, shoes] = await Promise.all([
        base44.entities.UserProfile.list("-created_date", 1),
        base44.entities.Shoe.list("-trending_score", 100),
      ]);
    } catch {
      try {
        shoes = await base44.entities.Shoe.list("-trending_score", 100);
      } catch {
        setLoading(false);
        return;
      }
    }

    const p = profiles[0] || null;
    setProfile(p);
    setAllShoes(shoes);
    setLoading(false);
  };

  // Personalization scoring (unchanged from original)
  const getBaseShoes = () => {
    if (!profile?.survey_completed) return allShoes;
    return allShoes.map((shoe) => {
      let score = 0;
      if (profile.main_use?.includes(shoe.category)) score += 40;
      if (profile.preferred_brands?.includes(shoe.brand)) score += 30;
      if (profile.budget_max && shoe.price <= profile.budget_max) score += 20;
      if (profile.gender && (shoe.gender === profile.gender || shoe.gender === "Unisex")) score += 10;
      score += (shoe.trending_score || 0) * 0.1;
      return { ...shoe, _score: score };
    }).sort((a, b) => b._score - a._score);
  };

  const applyFilters = (shoes) => {
    return shoes.filter(shoe => {
      if (filters.brands.length && !filters.brands.includes(shoe.brand)) return false;
      if (filters.categories.length && !filters.categories.includes(shoe.category)) return false;
      if (shoe.price < filters.minPrice) return false;
      if (filters.maxPrice < 500 && shoe.price > filters.maxPrice) return false;
      if (filters.onSaleOnly && !(shoe.original_price > shoe.price)) return false;
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
    return sorted; // trending — already sorted by score / trending_score
  };

  const SPONSORED_INDICES = [3, 11, 19]; // positions that get sponsored treatment
  const SPONSORED_PLAN_TIERS = ["brand", "featured", "starter"]; // mock tiers per slot

  const rawDisplayed = applySort(applyFilters(getBaseShoes()));

  // Inject sponsored shoes at the front based on "plan" (mocked: every 7th shoe is sponsored)
  const sponsoredShoes = rawDisplayed.filter((_, i) => SPONSORED_INDICES.includes(i));
  const regularShoes = rawDisplayed.filter((_, i) => !SPONSORED_INDICES.includes(i));
  // Brand-tier sponsored go first, then regular
  const displayedShoes = [...sponsoredShoes, ...regularShoes];

  const activeFilterCount = filters.brands.length + filters.categories.length +
    (filters.onSaleOnly ? 1 : 0) + (filters.maxPrice < 500 || filters.minPrice > 0 ? 1 : 0);

  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl">
                {profile?.survey_completed ? "Picked For You" : "Trending Now"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile?.survey_completed
                  ? `Based on your style: ${[...(profile.main_use || []), ...(profile.style_preference || [])].slice(0, 3).join(", ")}`
                  : "The hottest shoes right now"}
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
          {/* Sidebar */}
          {showSidebar && (
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <ShoeListingSidebar
                filters={filters}
                onChange={setFilters}
              />
            </aside>
          )}

          {/* Mobile sidebar overlay */}
          {showSidebar && (
            <div className="lg:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
              <div className="relative ml-auto w-72 h-full bg-background overflow-y-auto p-4 shadow-xl">
                <ShoeListingSidebar
                  filters={filters}
                  onChange={setFilters}
                  onClose={() => setShowSidebar(false)}
                />
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
                <p className="text-xs text-muted-foreground mb-3">{rawDisplayed.length} shoe{rawDisplayed.length !== 1 ? "s" : ""}</p>
                {/* Sponsored featured row — brand-tier shoes shown larger */}
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
                          sponsored={true}
                          sponsorTier={SPONSORED_PLAN_TIERS[i] || "starter"}
                          onSponsorClick={() => setSponsorModal(shoe)}
                        />
                      ))}
                    </div>
                    <div className="border-t border-border/50 mt-6 mb-4" />
                  </div>
                )}

                <div className={`grid gap-4 sm:gap-6 ${showSidebar ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
                  {regularShoes.map((shoe, i) => (
                    <ShoeCard
                      key={shoe.id}
                      shoe={shoe}
                      index={i}
                      sponsored={false}
                      onSponsorClick={() => setSponsorModal(shoe)}
                    />
                  ))}
                </div>
                {sponsorModal && (
                  <SponsoredModal
                    shoe={sponsorModal}
                    onClose={() => setSponsorModal(null)}
                    onSponsorComplete={loadPersonalized}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg">No shoes match your filters</h3>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-4 text-sm text-primary hover:underline"
                >
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