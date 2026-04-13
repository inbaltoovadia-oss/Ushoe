import { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";

const categories = ["All", "Running", "Casual", "Basketball", "Lifestyle"];

export default function TrendingSection() {
  const [activeTab, setActiveTab] = useState("All");
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShoes();
  }, []);

  const loadShoes = async () => {
    setLoading(true);
    const data = await base44.entities.Shoe.list("-trending_score", 50);
    setShoes(data);
    setLoading(false);
  };

  const filtered =
    activeTab === "All" ? shoes : shoes.filter((s) => s.category === activeTab);

  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-accent" />
            <h2 className="font-heading font-bold text-2xl sm:text-3xl">Trending Now</h2>
          </div>
          <p className="text-muted-foreground text-sm">Most popular shoes right now</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === cat
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.slice(0, 8).map((shoe, i) => (
              <ShoeCard key={shoe.id} shoe={shoe} index={i} />
            ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No shoes found in this category
        </div>
      )}
    </section>
  );
}