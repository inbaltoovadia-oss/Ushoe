import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";

export default function PersonalizedSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonalized();
  }, []);

  const loadPersonalized = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('getPersonalizedHomepage', {});
      setData(response.data);
    } catch (error) {
      console.error('Failed to load personalized section:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="font-heading font-bold text-2xl mb-6">Recommended for You</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    );
  }

  if (!data?.has_preferences) {
    return (
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-accent/10 border border-accent/20 rounded-3xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="font-heading font-bold text-xl mb-2">Complete Your Style Quiz</h3>
          <p className="text-muted-foreground mb-4">{data?.personalization_reason}</p>
          <a href="/survey" className="inline-block bg-accent text-accent-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Take the Quiz
          </a>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Recommended for You */}
      {data?.recommended_for_you?.length > 0 && (
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-bold text-2xl">Recommended for You</h2>
            </div>
            <p className="text-sm text-muted-foreground">{data.personalization_reason}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.recommended_for_you.map((shoe, i) => (
              <motion.div
                key={shoe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ShoeCard shoe={shoe} index={i} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Section */}
      {data?.trending?.length > 0 && (
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <h2 className="font-heading font-bold text-2xl mb-6">Trending Now</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.trending.map((shoe, i) => (
              <motion.div
                key={shoe.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ShoeCard shoe={shoe} index={i} />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}