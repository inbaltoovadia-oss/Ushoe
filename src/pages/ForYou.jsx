import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Heart, Search, ClipboardList, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import { getUserProfile, subscribeUserProfile } from "../lib/userProfileStore";
import { rankShoes, buildExplanation } from "../lib/personalizationEngine";
import { Link } from "react-router-dom";

export default function ForYou() {
  const [shoes, setShoes] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState("");
  const [hasSignals, setHasSignals] = useState(false);

  useEffect(() => {
    load();
    // Re-run whenever preferences/quiz/wishlist/searches change
    const unsub = subscribeUserProfile(() => load());
    return unsub;
  }, []);

  const load = async (force = false) => {
    setLoading(true);
    const [allShoes, userProfile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 120),
      getUserProfile(force),
    ]);

    const signals = userProfile && (
      userProfile.preferred_brands?.length ||
      userProfile.main_use?.length ||
      userProfile.searched_brands?.length ||
      userProfile.searched_categories?.length ||
      userProfile.wishlist_brands?.length ||
      userProfile.tracked_brands?.length
    );

    setHasSignals(!!signals);
    setProfile(userProfile);
    setExplanation(buildExplanation(userProfile));

    const ranked = rankShoes(allShoes, userProfile, { limit: 24 });
    setShoes(ranked);
    setLoading(false);
  };

  const signalSources = [
    { icon: Search, label: "Search history", active: !!(profile?.searched_brands?.length || profile?.searched_categories?.length) },
    { icon: ClipboardList, label: "Style quiz", active: !!(profile?.preferred_brands?.length || profile?.main_use?.length) },
    { icon: Heart, label: "Wishlist", active: !!profile?.wishlist_brands?.length },
    { icon: TrendingUp, label: "Price tracking", active: !!profile?.tracked_brands?.length },
  ];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-3xl">For You</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{explanation}</p>
              </div>
            </div>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Signal sources */}
          <div className="flex flex-wrap gap-2 mt-4">
            {signalSources.map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  active
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
                {active && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />}
              </div>
            ))}
          </div>

          {/* No signals CTA */}
          {!hasSignals && !loading && (
            <div className="mt-6 bg-primary/5 border border-primary/10 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Help us personalize your feed</p>
                <p className="text-xs text-muted-foreground mt-0.5">Take the style quiz or search for shoes to get tailored recommendations.</p>
              </div>
              <div className="flex gap-2">
                <Link to="/style-quiz" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                  Style Quiz
                </Link>
                <Link to="/discover" className="px-4 py-2 bg-secondary rounded-xl text-xs font-semibold hover:bg-secondary/80 transition-colors">
                  Search Shoes
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Shoe grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {shoes.map((shoe, i) => (
                <div key={shoe.id} className="relative">
                  <ShoeCard shoe={shoe} index={i} />
                  {shoe._matchReasons?.length > 0 && (
                    <div className="mt-1.5 mx-1 flex flex-wrap gap-1">
                      {shoe._matchReasons.slice(0, 2).map((r) => (
                        <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}