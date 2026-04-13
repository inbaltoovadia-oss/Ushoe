import { useState, useEffect } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";

const categories = ["All", "Running", "Casual", "Basketball", "Lifestyle", "Walking", "Training"];

export default function Trending() {
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
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Flame className="w-6 h-6 text-accent" />
            </div>
            <h1 className="font-heading font-bold text-3xl">Trending</h1>
          </div>
          <p className="text-muted-foreground">
            The most popular shoes based on searches, saves, and engagement
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === cat
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Shoes Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((shoe, i) => (
              <ShoeCard key={shoe.id} shoe={shoe} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg">No trending shoes in this category</h3>
            <p className="text-muted-foreground text-sm mt-1">Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}