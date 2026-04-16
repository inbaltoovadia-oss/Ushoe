import { useState, useEffect } from "react";
import { Rocket, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import SponsoredModal from "../SponsoredModal";

function timeLeft(sponsoredUntil) {
  const now = new Date();
  const end = new Date(sponsoredUntil);
  const diffMs = end - now;
  if (diffMs <= 0) return null;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d left`;
  return `${hours}h left`;
}

const PLAN_LABELS = {
  starter: { label: "Starter", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  featured: { label: "Featured", color: "bg-primary/10 text-primary" },
  premium: { label: "Max Visibility", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function SponsoredSection({ refreshKey }) {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sponsorModal, setSponsorModal] = useState(null);

  useEffect(() => {
    loadSponsored();
  }, [refreshKey]);

  const loadSponsored = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Shoe.filter({ is_sponsored: true });
      const now = new Date();
      // Filter to only active (not expired), sort by plan tier
      const PLAN_ORDER = { premium: 0, featured: 1, starter: 2 };
      const active = all
        .filter((s) => s.sponsored_until && new Date(s.sponsored_until) > now)
        .sort((a, b) => (PLAN_ORDER[a.sponsored_plan] ?? 9) - (PLAN_ORDER[b.sponsored_plan] ?? 9));
      setShoes(active);
    } catch {
      setShoes([]);
    }
    setLoading(false);
  };

  if (!loading && shoes.length === 0) return null;

  return (
    <section className="py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Rocket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-2xl">Sponsored</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Featured listings from brands & sellers</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border animate-pulse">
                <div className="aspect-square bg-secondary" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-secondary rounded-full w-16" />
                  <div className="h-4 bg-secondary rounded-full w-3/4" />
                  <div className="h-5 bg-secondary rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {shoes.map((shoe, i) => {
              const planMeta = PLAN_LABELS[shoe.sponsored_plan] || PLAN_LABELS.starter;
              const remaining = timeLeft(shoe.sponsored_until);
              return (
                <motion.div
                  key={shoe.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group relative bg-card border border-amber-200/60 dark:border-amber-800/40 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Sponsored badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md">
                    <Rocket className="w-3 h-3" />
                    Sponsored
                  </div>

                  {/* Plan tier badge */}
                  <div className={`absolute top-3 right-3 z-10 text-[10px] px-2 py-0.5 rounded-full font-semibold ${planMeta.color}`}>
                    {planMeta.label}
                  </div>

                  <Link to={`/shoe/${shoe.id}`}>
                    <div className="aspect-square overflow-hidden bg-secondary/30">
                      <img
                        src={shoe.image_url}
                        alt={shoe.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{shoe.brand}</p>
                      <h3 className="font-heading font-semibold text-sm mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                        {shoe.name}
                      </h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-heading font-bold text-base">${shoe.price}</span>
                        {remaining && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {remaining}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {sponsorModal && (
          <SponsoredModal
            shoe={sponsorModal}
            onClose={() => setSponsorModal(null)}
            onSponsorComplete={loadSponsored}
          />
        )}
      </div>
    </section>
  );
}