import { useState, useEffect } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";
import { motion, AnimatePresence } from "framer-motion";

const categories = ["All", "Running", "Casual", "Basketball", "Lifestyle", "Training"];

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

  const filtered = activeTab === "All"
    ? shoes
    : shoes.filter((s) => s.category === activeTab);

  const trendingCount = filtered.filter(s => s.is_trending).length;

  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-accent/10 rounded-xl">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl">Trending Now</h2>
            {/* Live pulse indicator */}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {trendingCount > 0 ? `${trendingCount} hot right now · updated daily` : "Most popular shoes right now · updated daily"}
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === cat
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.slice(0, 8).map((shoe, i) => (
              <ShoeCard key={shoe.id} shoe={shoe} index={i} />
            ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No shoes found in this category
        </div>
      )}
    </section>
  );
}