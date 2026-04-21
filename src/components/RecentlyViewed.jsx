import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getRecentlyViewed, subscribeRecentlyViewed } from "../lib/recentlyViewedStore";
import ShoeImage from "./ShoeImage";

export default function RecentlyViewed() {
  const [items, setItems] = useState(getRecentlyViewed());

  useEffect(() => subscribeRecentlyViewed(setItems), []);

  if (items.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-heading font-bold text-xl">Recently Viewed</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((shoe, i) => (
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
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-2 truncate">{shoe.brand}</p>
              <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{shoe.name}</p>
              {shoe.price && <p className="text-xs text-primary font-bold mt-0.5">${shoe.price}</p>}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}