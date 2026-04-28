/**
 * DailyPicksSection — rotating "Today's picks" from catalog metadata.
 * Zero API calls. Rotates daily using a date seed.
 */
import { useState, useEffect } from "react";
import { Tag, TrendingUp, Star, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ShoeImage from "../ShoeImage";
import { motion } from "framer-motion";
import SkeletonCard from "../SkeletonCard";

const PICKS = [
  { id: "deal",    label: "Today's Best Deal",     icon: Tag,        color: "text-green-600",  bg: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",  border: "border-green-200/60 dark:border-green-800/40" },
  { id: "trend",   label: "Today's Trend Pick",    icon: TrendingUp, color: "text-orange-600", bg: "from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",   border: "border-orange-200/60 dark:border-orange-800/40" },
  { id: "value",   label: "Best Value Today",       icon: DollarSign, color: "text-blue-600",   bg: "from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20",           border: "border-blue-200/60 dark:border-blue-800/40" },
  { id: "rated",   label: "Staff Favorite",         icon: Star,       color: "text-purple-600", bg: "from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20", border: "border-purple-200/60 dark:border-purple-800/40" },
];

// Deterministic seed from today's date so picks change daily but are consistent per day
function dateSeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickOf(shoes, type, seed) {
  if (!shoes.length) return null;
  const candidates = {
    deal:   shoes.filter(s => s.original_price > s.price),
    trend:  shoes.filter(s => s.is_trending || (s.trending_score || 0) > 60),
    value:  shoes.filter(s => s.price < 100),
    rated:  shoes.filter(s => (s.rating || 0) >= 4.2),
  }[type] || shoes;

  if (!candidates.length) return shoes[seed % shoes.length];
  return candidates[seed % candidates.length];
}

export default function DailyPicksSection() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 80).then(all => {
      setShoes(all);
      setLoading(false);
    });
  }, []);

  const seed = dateSeed();

  if (loading) {
    return (
      <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="font-heading font-bold text-2xl mb-5">Today's Picks</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    );
  }

  const picks = PICKS.map(p => ({ ...p, shoe: pickOf(shoes, p.id, seed + p.id.charCodeAt(0)) })).filter(p => p.shoe);
  if (!picks.length) return null;

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Star className="w-5 h-5 text-amber-500" />
        <h2 className="font-heading font-bold text-2xl">Today's Picks</h2>
        <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 px-2 py-0.5 rounded-full font-medium">Updated Daily</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {picks.map((pick, i) => {
          const Icon = pick.icon;
          const discount = pick.shoe.original_price > pick.shoe.price
            ? Math.round(((pick.shoe.original_price - pick.shoe.price) / pick.shoe.original_price) * 100)
            : 0;

          return (
            <motion.div
              key={pick.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Link to={`/shoe/${pick.shoe.id}`} className="group block">
                <div className={`rounded-2xl border bg-gradient-to-br ${pick.bg} ${pick.border} overflow-hidden hover:shadow-lg transition-all duration-300`}>
                  <div className="aspect-square overflow-hidden bg-white/30 dark:bg-black/20 relative">
                    <ShoeImage
                      src={pick.shoe.image_url}
                      brand={pick.shoe.brand}
                      name={pick.shoe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {discount > 0 && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">-{discount}%</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className={`flex items-center gap-1 text-[10px] font-bold mb-1.5 ${pick.color}`}>
                      <Icon className="w-3 h-3" />
                      {pick.label}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{pick.shoe.brand}</p>
                    <p className="text-sm font-semibold truncate mt-0.5 group-hover:text-primary transition-colors leading-tight">{pick.shoe.name}</p>
                    <p className="font-heading font-bold text-base mt-1">${pick.shoe.price}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}