import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, SlidersHorizontal } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserProfile } from "../lib/userProfileStore";
import { rankShoes } from "../lib/personalizationEngine";
import ShoeCard from "../components/ShoeCard";
import StoryViewer from "../components/StoryViewer";
import InterestPicker from "../components/InterestPicker";

const STORY_CACHE_KEY = "ushoe_daily_stories";

function getTodayKey(profile) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  // A simple hash of preference signals so the cache busts when preferences change
  const prefSig = [
    ...(profile.preferred_brands || []),
    ...(profile.main_use || []),
    profile.gender || "",
    String(profile.budget_max || ""),
  ].join("|");
  return `${today}__${prefSig}`;
}

function loadStoryCache() {
  try {
    const raw = localStorage.getItem(STORY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveStoryCache(key, stories) {
  try {
    localStorage.setItem(STORY_CACHE_KEY, JSON.stringify({ key, stories }));
  } catch {}
}

export default function ForYou() {
  const [shoes, setShoes] = useState([]);
  const [storyShoes, setStoryShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(null);
  const [showInterests, setShowInterests] = useState(false);

  useEffect(() => { loadShoes(); }, []);

  const loadShoes = async (force = false) => {
    setLoading(true);
    const [allShoes, profile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 80),
      getUserProfile(),
    ]);
    const ranked = rankShoes(allShoes, profile, { limit: 40 });
    setShoes(ranked);

    // Daily story selection — use cache unless forced or date/prefs changed
    const todayKey = getTodayKey(profile);
    const cached = loadStoryCache();
    if (!force && cached && cached.key === todayKey && cached.stories?.length > 0) {
      // Restore story shoes from cache (match by id against fresh data)
      const idSet = new Set(cached.stories.map(s => s.id));
      const restored = ranked.filter(s => idSet.has(s.id)).slice(0, 10);
      setStoryShoes(restored.length > 0 ? restored : ranked.slice(0, 10));
    } else {
      const daily = ranked.slice(0, 10);
      setStoryShoes(daily);
      saveStoryCache(todayKey, daily);
    }

    setLoading(false);
  };

  return (
    <>
    <div className="min-h-screen pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-6">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            For You
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Personalized picks based on your style</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInterests(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors text-sm font-medium"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Interests</span>
          </button>
          <button
            onClick={() => loadShoes(true)}
            className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Story entry row — refreshes daily based on preferences */}
          {storyShoes.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">Today's picks · tap to explore</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {storyShoes.map((shoe, i) => (
                  <button
                    key={shoe.id}
                    onClick={() => setStoryIndex(i)}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-16 h-16 rounded-full border-2 border-primary p-0.5 bg-secondary overflow-hidden">
                      <img
                        src={shoe.image_url}
                        alt={shoe.name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80"; }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate w-16 text-center">{shoe.brand}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {shoes.map((shoe, i) => (
                <ShoeCard key={shoe.id} shoe={shoe} index={i} />
              ))}
            </AnimatePresence>
          </div>

          {shoes.length === 0 && (
            <div className="text-center py-24 text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No personalized picks yet. Complete your style survey!</p>
            </div>
          )}
        </>
      )}

    </div>

      {/* Story viewer — outside page container so it fills the full screen */}
      <AnimatePresence>
        {storyIndex !== null && storyShoes.length > 0 && (
          <StoryViewer
            shoes={storyShoes}
            initialIndex={storyIndex}
            onClose={() => setStoryIndex(null)}
          />
        )}
      </AnimatePresence>

      {showInterests && (
        <InterestPicker
          onClose={() => setShowInterests(false)}
          onSave={() => loadShoes(true)}
        />
      )}
    </>
  );
}