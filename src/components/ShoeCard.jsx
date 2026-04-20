import { useState, useEffect } from "react";
import { Heart, Flame, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  isInWishlist,
  addToWishlistLocal,
  removeFromWishlistLocal,
  subscribeWishlist,
} from "../lib/wishlistStore";
import ShoeOptionsMenu from "./ShoeOptionsMenu";
import PriceTrackButton from "./PriceTrackButton";

// Red shoe placeholder — shown when no real image is available
const RED_SHOE_PLACEHOLDER = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop";
function neutralFallback() {
  return RED_SHOE_PLACEHOLDER;
}

export default function ShoeCard({ shoe, index = 0, sponsored = false, onSponsorClick }) {
  const [wishlisted, setWishlisted] = useState(isInWishlist(shoe.id));
  // Only use image_url if it's a known reliable source (Unsplash), otherwise use placeholder
  const initialImg = (shoe.image_url && shoe.image_url.includes("unsplash.com"))
    ? shoe.image_url
    : neutralFallback();
  const [imgSrc, setImgSrc] = useState(initialImg);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => subscribeWishlist(() => setWishlisted(isInWishlist(shoe.id))), [shoe.id]);

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

  const discount = shoe.original_price > shoe.price
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
    >
      <Link to={`/shoe/${shoe.id}`} className="group block">
        <div className={`card-3d relative bg-card rounded-2xl overflow-hidden border ${
          sponsored ? "border-amber-400/50 shadow-amber-400/10 shadow-md" : "border-border/40"
        } transition-all duration-300`}>

          {/* ── Image ── */}
          <div className="relative aspect-square overflow-hidden bg-secondary/40">
            {/* Skeleton shimmer while loading */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/60 to-secondary animate-pulse" />
            )}
            <img
              src={imgSrc}
              alt={shoe.name}
              loading="lazy"
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-108 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              style={{ transform: imgLoaded ? undefined : "scale(1.02)" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgSrc(neutralFallback());
                setImgLoaded(true);
              }}
            />

            {/* Top-right actions */}
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
              <button
                onClick={toggleWishlist}
                className={`p-2 rounded-full backdrop-blur-sm transition-all duration-200 shadow-sm ${
                  wishlisted
                    ? "bg-red-500 text-white shadow-red-500/30"
                    : "bg-white/75 dark:bg-black/50 text-foreground hover:bg-white dark:hover:bg-black/70"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-current" : ""}`} />
              </button>
              {/* Price Track compact */}
              <PriceTrackButton shoe={shoe} compact />
              <ShoeOptionsMenu shoe={shoe} onSponsorClick={() => onSponsorClick?.()} />
            </div>

            {/* Top-left badge */}
            {sponsored ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSponsorClick?.(); }}
                className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm hover:bg-amber-600 transition-colors z-10"
              >
                <Rocket className="w-2.5 h-2.5" />
                Sponsored
              </button>
            ) : shoe.is_trending ? (
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-accent/90 backdrop-blur-sm text-accent-foreground px-2 py-0.5 rounded-full text-[10px] font-semibold">
                <Flame className="w-2.5 h-2.5" />
                Trending
              </div>
            ) : null}

            {/* Sale badge */}
            {discount > 0 && (
              <div className="absolute bottom-2.5 left-2.5 bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-[10px] font-bold">
                {discount}% OFF
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className="p-3.5">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest truncate">
              {shoe.brand}
            </p>
            <h3 className="font-heading font-semibold text-sm text-foreground mt-0.5 group-hover:text-primary transition-colors line-clamp-2 leading-snug min-h-[2.5rem]">
              {shoe.name}
            </h3>

            {shoe.colorway && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{shoe.colorway}</p>
            )}

            <div className="flex items-center justify-between mt-2.5">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading font-bold text-base">${shoe.price}</span>
                {discount > 0 && (
                  <span className="text-[11px] text-muted-foreground line-through">${shoe.original_price}</span>
                )}
              </div>
              {shoe.rating && (
                <span className="text-[10px] text-muted-foreground">⭐ {shoe.rating}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}