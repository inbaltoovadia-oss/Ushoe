import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getUserProfile } from "../lib/userProfileStore";
import { rankShoes } from "../lib/personalizationEngine";
import ShoeCard from "../components/ShoeCard";
import StoryViewer from "../components/StoryViewer";

export default function ForYou() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(null);

  useEffect(() => { loadShoes(); }, []);

  const loadShoes = async () => {
    setLoading(true);
    const [allShoes, profile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 80),
      getUserProfile(),
    ]);
    const ranked = rankShoes(allShoes, profile, { limit: 40 });
    setShoes(ranked);
    setLoading(false);
  };

  return (
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
        <button
          onClick={loadShoes}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Story entry row */}
          {shoes.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">Tap to explore</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {shoes.slice(0, 10).map((shoe, i) => (
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

      {/* Story viewer */}
      <AnimatePresence>
        {storyIndex !== null && shoes.length > 0 && (
          <StoryViewer
            shoes={shoes.slice(0, 10)}
            initialIndex={storyIndex}
            onClose={() => setStoryIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}