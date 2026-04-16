import { useState, useEffect } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../ShoeCard";
import SkeletonCard from "../SkeletonCard";

export default function ForYouSection() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadPersonalized();
  }, []);

  const loadPersonalized = async () => {
    setLoading(true);
    let profiles = [];
    let allShoes = [];

    try {
      [profiles, allShoes] = await Promise.all([
        base44.entities.UserProfile.list("-created_date", 1),
        base44.entities.Shoe.list("-trending_score", 50),
      ]);
    } catch {
      try {
        allShoes = await base44.entities.Shoe.list("-trending_score", 50);
      } catch {
        setLoading(false);
        return;
      }
    }

    const p = profiles[0] || null;
    setProfile(p);

    if (!p || !p.survey_completed) {
      setShoes(allShoes.slice(0, 8));
      setLoading(false);
      return;
    }

    // Score each shoe based on profile
    const scored = allShoes.map((shoe) => {
      let score = 0;
      if (p.main_use?.includes(shoe.category)) score += 40;
      if (p.preferred_brands?.includes(shoe.brand)) score += 30;
      if (p.budget_max && shoe.price <= p.budget_max) score += 20;
      if (p.gender && (shoe.gender === p.gender || shoe.gender === "Unisex")) score += 10;
      score += (shoe.trending_score || 0) * 0.1;
      return { ...shoe, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    setShoes(scored.slice(0, 8));
    setLoading(false);
  };

  return (
    <section className="py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl">
                {profile?.survey_completed ? "Picked For You" : "Trending Now"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profile?.survey_completed
                  ? `Based on your style: ${[...(profile.main_use || []), ...(profile.style_preference || [])].slice(0, 3).join(", ")}`
                  : "The hottest shoes right now"}
              </p>
            </div>
          </div>
          {!profile?.survey_completed && (
            <Link
              to="/survey"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Personalize <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {shoes.map((shoe, i) => <ShoeCard key={shoe.id} shoe={shoe} index={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}