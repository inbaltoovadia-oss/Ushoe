import { useState, useEffect, useRef } from "react";
import { Flame, TrendingUp, Sparkles, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import InterestPicker from "../components/InterestPicker";
import { getInterests, subscribeInterests } from "../lib/interestStore";

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
  );
}