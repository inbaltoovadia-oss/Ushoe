/**
 * PersonalizedSection — fully client-side, zero integration credits.
 * Uses the local personalization engine + cached user profile.
 * Replaces the old backend function call (getPersonalizedHomepage).
 */
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";
import { getUserProfile } from "../../lib/userProfileStore";
import { rankShoes } from "../../lib/personalizationEngine";
import { Link } from "react-router-dom";

export default function PersonalizedSection() {
  const [shoes, setShoes] = useState([]);
  const [hasPrefs, setHasPrefs] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [allShoes, profile] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 80),
      getUserProfile(),
    ]);

    const hasSignals = !!(
      profile?.survey_completed ||
      profile?.preferred_brands?.length ||
      profile?.main_use?.length ||
      profile?.wishlist_brands?.length ||
      profile?.searched_brands?.length
    );

    setHasPrefs(hasSignals);

    if (!hasSignals) {
      setReason("Take the style quiz to get personalized recommendations.");
      setLoading(false);
      return;
    }

    const ranked = rankShoes(allShoes, profile, { limit: 8 });
    setShoes(ranked);

    // Build a simple reason string
    const parts = [];
    if (profile?.preferred_brands?.length) parts.push(profile.preferred_brands.slice(0, 2).join(", "));
    if (profile?.main_use?.length) parts.push(profile.main_use[0]);
    if (profile?.budget_max) parts.push(`budget $${profile.budget_max}`);
    setReason(parts.length ? `Based on your interest in ${parts.join(", ")}` : "Based on your profile");

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

  if (!hasPrefs) {
    return (
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-accent/10 border border-accent/20 rounded-3xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="font-heading font-bold text-xl mb-2">Complete Your Style Quiz</h3>
          <p className="text-muted-foreground mb-4">{reason}</p>
          <Link to="/survey" className="inline-block bg-accent text-accent-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Take the Quiz
          </Link>
        </div>
      </section>
    );
  }

  if (!shoes.length) return null;

  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-2xl">Recommended for You</h2>
        </div>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {shoes.map((shoe, i) => (
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
  );
}