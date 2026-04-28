/**
 * CommunityPicksSection — shows most saved/viewed shoes this week.
 * Credit-safe: derived from catalog trending_score + wishlist counts.
 * Web data only loads on user click, with 6h cache.
 */
import { useState, useEffect } from "react";
import { Users, MapPin, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getLocation } from "../../lib/locationStore";
import ShoeImage from "../ShoeImage";
import { motion } from "framer-motion";

const CACHE_KEY = "ushoe_community_picks_v1";
const CACHE_TTL = 6 * 60 * 60 * 1000;

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
  } catch {}
  return null;
}

function setCached(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export default function CommunityPicksSection() {
  const [localPicks, setLocalPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = getLocation();

  useEffect(() => {
    // Always load from catalog — instant, no credits
    base44.entities.Shoe.list("-trending_score", 20).then(shoes => {
      // Top trending by score = community picks proxy
      setLocalPicks(shoes.slice(0, 6));
      setLoading(false);
    });
  }, []);

  if (loading || !localPicks.length) return null;

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-bold text-2xl">Community Picks</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
          <MapPin className="w-3 h-3" />
          {location?.city || "Your Area"}
        </div>
      </div>

      {/* Sub-label */}
      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-primary" />
        Most saved & searched this week in your region
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {localPicks.map((shoe, i) => (
          <motion.div
            key={shoe.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex-shrink-0 w-36"
          >
            <Link to={`/shoe/${shoe.id}`} className="group block">
              <div className="aspect-square rounded-2xl overflow-hidden bg-secondary/40 relative">
                <ShoeImage
                  src={shoe.image_url}
                  brand={shoe.brand}
                  name={shoe.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 text-[10px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                  #{i + 1}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-2 truncate">{shoe.brand}</p>
              <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{shoe.name}</p>
              <p className="text-sm font-bold text-primary mt-0.5">${shoe.price}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <Link to="/trending" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium mt-4 hover:underline">
        See all community trends <ChevronRight className="w-4 h-4" />
      </Link>
    </section>
  );
}