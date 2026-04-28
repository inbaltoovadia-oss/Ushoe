/**
 * SimilarAlternatives — shows cheaper, similar, trending alternatives.
 * Purely derived from catalog, zero API calls.
 */
import { useState, useEffect } from "react";
import { Tag, Zap, Smile, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import ShoeImage from "./ShoeImage";
import { motion } from "framer-motion";

const TABS = [
  { id: "cheaper", label: "Cheaper", icon: Tag },
  { id: "similar", label: "Similar Style", icon: Smile },
  { id: "trending", label: "Trending", icon: TrendingUp },
];

function findAlternatives(shoe, allShoes) {
  const others = allShoes.filter(s => s.id !== shoe.id);

  const cheaper = others
    .filter(s => s.price < shoe.price * 0.85 && s.category === shoe.category)
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);

  const similar = others
    .filter(s => s.category === shoe.category && s.brand !== shoe.brand)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const trending = others
    .filter(s => s.is_trending || (s.trending_score || 0) > 60)
    .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
    .slice(0, 4);

  return { cheaper, similar, trending };
}

export default function SimilarAlternatives({ shoe }) {
  const [activeTab, setActiveTab] = useState("cheaper");
  const [alts, setAlts] = useState(null);

  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 60).then(all => {
      setAlts(findAlternatives(shoe, all));
    });
  }, [shoe.id]);

  if (!alts) return null;
  const list = alts[activeTab] || [];
  if (list.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alternatives</p>

      <div className="flex gap-1.5 mb-4 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = alts[id]?.length || 0;
          if (!count) return null;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                activeTab === id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {list.map((alt, i) => (
          <motion.div
            key={alt.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/shoe/${alt.id}`} className="group flex gap-3 items-center p-2 rounded-xl hover:bg-secondary/60 transition-colors">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                <ShoeImage src={alt.image_url} brand={alt.brand} name={alt.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{alt.brand}</p>
                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{alt.name}</p>
                <p className="text-sm font-bold text-primary mt-0.5">${alt.price}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}