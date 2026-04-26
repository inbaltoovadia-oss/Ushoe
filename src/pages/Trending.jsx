import { useState, useEffect, useRef } from "react";
import { Flame, TrendingUp, Sparkles, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import InterestPicker from "../components/InterestPicker";
import { getInterests, subscribeInterests } from "../lib/interestStore";
import PullToRefresh from "../components/PullToRefresh";
import LiveTrendsSection from "../components/LiveTrendsSection";

const SPORT_CATEGORIES = ["Running", "Basketball", "Soccer", "Tennis", "Training", "Hiking", "Skateboarding"];
const ALL_TABS = ["For You", "All", "Running", "Basketball", "Soccer", "Tennis", "Training", "Casual", "Lifestyle", "Walking", "Hiking"];

export default function Trending() {
  const [activeTab, setActiveTab] = useState("For You");
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interests, setInterestsState] = useState(getInterests());
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    loadShoes();
    const unsub = subscribeInterests(setInterestsState);
    return unsub;
  }, []);

  const loadShoes = async () => {
    setLoading(true);
    const data = await base44.entities.Shoe.list("-trending_score", 50);
    setShoes(data);
    setLoading(false);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getFiltered = () => {
    if (activeTab === "For You") {
      if (interests.length === 0) return shoes; // fallback to all if no interests set
      return shoes.filter((s) => interests.includes(s.category));
    }
    if (activeTab === "All") return shoes;
    return shoes.filter((s) => s.category === activeTab);
  };

  const filtered = getFiltered();

  return (
    <PullToRefresh onRefresh={loadShoes}>
    <div className="min-h-screen py-8 px-4 sm:px-6">
      {showInterestPicker && (
        <InterestPicker
          onClose={() => setShowInterestPicker(false)}
          onSave={setInterestsState}
        />
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div ref={topRef} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Flame className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-3xl">Trending</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {activeTab === "For You"
                    ? interests.length > 0
                      ? `Personalized for your interests: ${interests.join(", ")}`
                      : "Set your interests to personalize this feed"
                    : "The hottest shoes right now"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInterestPicker(true)}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Interests</span>
            </button>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {ALL_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "For You" && <Sparkles className="w-3.5 h-3.5" />}
              {tab}
            </button>
          ))}
        </div>

        {/* For You empty state */}
        {activeTab === "For You" && interests.length === 0 && !loading && (
          <div className="text-center py-12 mb-8 bg-primary/5 border border-primary/10 rounded-2xl">
            <Sparkles className="w-10 h-10 text-primary/40 mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-lg">Set your interests</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Tell us what you like and we'll personalize your trending feed.</p>
            <button
              onClick={() => setShowInterestPicker(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:opacity-90"
            >
              Choose Interests
            </button>
          </div>
        )}

        {/* Live Trend Agent Section */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-lg">Live Market Trends</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Updated every 2 weeks</span>
          </div>
          <LiveTrendsSection />
        </div>

        {/* Featured Carousel — top 5 trending */}
        {!loading && filtered.length > 0 && (
          <div className="mb-10">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" /> Hot Right Now
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
              {filtered.slice(0, 8).map((shoe, i) => (
                <motion.a
                  key={shoe.id}
                  href={`/shoe/${shoe.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative flex-shrink-0 w-56 h-72 rounded-3xl overflow-hidden group cursor-pointer"
                >
                  <img
                    src={shoe.image_url}
                    alt={shoe.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Trending score bar */}
                  <div className="absolute top-3 left-3 right-3">
                    <div className="bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5">
                      <Flame className="w-3 h-3 text-accent flex-shrink-0" />
                      <div className="flex-1 bg-white/20 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (shoe.trending_score || 50))}%` }}
                          transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }}
                          className="h-full bg-accent rounded-full"
                        />
                      </div>
                      <span className="text-[10px] text-white/80 font-bold">{shoe.trending_score || "–"}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">{shoe.brand}</p>
                    <p className="font-heading font-bold text-white text-sm leading-tight mt-0.5 line-clamp-2">{shoe.name}</p>
                    <p className="text-white font-semibold text-sm mt-1">${shoe.price}</p>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        )}

        {/* Shoes Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((shoe, i) => <ShoeCard key={shoe.id} shoe={shoe} index={i} />)}
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
    </PullToRefresh>
  );
}