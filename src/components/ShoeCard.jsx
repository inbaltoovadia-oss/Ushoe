import { useState, useEffect } from "react";
import { Heart, MapPin, ArrowRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  isInWishlist,
  addToWishlistLocal,
  removeFromWishlistLocal,
  subscribeWishlist,
} from "../lib/wishlistStore";

export default function ShoeCard({ shoe, index = 0 }) {
  const [wishlisted, setWishlisted] = useState(isInWishlist(shoe.id));
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    return subscribeWishlist(() => setWishlisted(isInWishlist(shoe.id)));
  }, [shoe.id]);

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) {
      removeFromWishlistLocal(shoe.id);
      const items = await base44.entities.WishlistItem.filter({ shoe_id: shoe.id });
      if (items.length > 0) await base44.entities.WishlistItem.delete(items[0].id);
    } else {
      addToWishlistLocal(shoe.id);
      await base44.entities.WishlistItem.create({
        shoe_id: shoe.id,
        shoe_name: shoe.name,
        shoe_brand: shoe.brand,
        shoe_image: shoe.image_url,
        shoe_price: shoe.price,
        price_alert: false,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/shoe/${shoe.id}`} className="group block">
        <div className="relative bg-card rounded-2xl overflow-hidden border border-border/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-secondary/30">
            {!imgLoaded && (
              <div className="absolute inset-0 bg-secondary animate-pulse" />
            )}
            <img
              src={shoe.image_url}
              alt={shoe.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgLoaded(true)}
            />

            {/* Overlay Actions */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button
                onClick={toggleWishlist}
                className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${
                  wishlisted
                    ? "bg-red-500 text-white"
                    : "bg-white/80 dark:bg-black/50 text-foreground hover:bg-white dark:hover:bg-black/70"
                }`}
              >
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-current" : ""}`} />
              </button>
            </div>

            {/* Trending Badge */}
            {shoe.is_trending && (
              <div className="absolute top-3 left-3 flex items-center gap-1 bg-accent text-accent-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
                <Flame className="w-3 h-3" />
                Trending
              </div>
            )}

            {/* Sale Badge */}
            {shoe.original_price > shoe.price && (
              <div className="absolute bottom-3 left-3 bg-destructive text-destructive-foreground px-2.5 py-1 rounded-full text-xs font-semibold">
                {Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)}% OFF
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {shoe.brand}
            </p>
            <h3 className="font-heading font-semibold text-foreground mt-1 group-hover:text-primary transition-colors line-clamp-1">
              {shoe.name}
            </h3>

            {/* Features */}
            {shoe.features && shoe.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {shoe.features.slice(0, 2).map((f) => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 bg-secondary rounded-full text-muted-foreground"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-baseline gap-2">
                <span className="font-heading font-bold text-lg">${shoe.price}</span>
                {shoe.original_price > shoe.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    ${shoe.original_price}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>Find nearby</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}