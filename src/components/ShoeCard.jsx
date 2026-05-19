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
import SponsoredModal from "./SponsoredModal";
import DealIndicator from "./DealIndicator.jsx";
import MatchScoreBadge from "./MatchScoreBadge";




// Brand-specific fallbacks — Unsplash URLs are reliable and CORS-safe
const BRAND_FALLBACKS = {
  Nike: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  Adidas: "https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=600&q=80",
  "Adidas Samba": "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=600&q=80",
  Jordan: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&q=80",
  Puma: "https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=600&q=80",
  "New Balance": "https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&q=80",
  Converse: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=600&q=80",
  Vans: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80",
  Hoka: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  Asics: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&q=80",
  Reebok: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80",
  Saucony: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80",
  Brooks: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
};
const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80";

function getBrandFallback(brand, name) {
  if (!brand) return DEFAULT_FALLBACK;
  const bl = brand.toLowerCase();
  const nl = (name || "").toLowerCase();
  // Special case: Adidas Samba
  if (bl === "adidas" && nl.includes("samba")) return BRAND_FALLBACKS["Adidas Samba"];
  // Exact match first
  const exact = Object.keys(BRAND_FALLBACKS).find(k => k.toLowerCase() === bl);
  if (exact) return BRAND_FALLBACKS[exact];
  // Then check if the brand starts with the key
  const prefix = Object.keys(BRAND_FALLBACKS).find(k => bl.startsWith(k.toLowerCase()));
  if (prefix) return BRAND_FALLBACKS[prefix];
  return DEFAULT_FALLBACK;
}

export default function ShoeCard({ shoe, index = 0, sponsored = false, onSponsorClick, showDealIndicator = false }) {
  const [wishlisted, setWishlisted] = useState(isInWishlist(shoe.id));
  const [showSponsorModal, setShowSponsorModal] = useState(false);

  const buildSources = () => {
    const s = [];
    if (shoe.image_url && shoe.image_url.startsWith("http")) s.push(shoe.image_url);
    s.push(getBrandFallback(shoe.brand, shoe.name));
    if (!s.includes(DEFAULT_FALLBACK)) s.push(DEFAULT_FALLBACK);
    return s;
  };

  const [sources] = useState(buildSources);
  const [srcIdx, setSrcIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);

  const currentSrc = sources[srcIdx];
  const handleImgError = () => {
    if (srcIdx < sources.length - 1) setSrcIdx(i => i + 1);
  };

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
    <>
      {showSponsorModal && (
        <SponsoredModal
          shoe={shoe}
          onClose={() => setShowSponsorModal(false)}
          onSponsorComplete={() => setShowSponsorModal(false)}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.04 }}
      >
        <Link to={`/shoe/${shoe.id}`} className="group block">
        <div className={`card-3d relative rounded-2xl overflow-hidden transition-all duration-300 ${
          sponsored
            ? "border border-amber-400/50 shadow-amber-400/10 shadow-lg glass-card"
            : "glass-card"
        }`}>

          {/* ── Image ── */}
          <div className="relative aspect-square overflow-hidden bg-secondary/40">
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/60 to-secondary animate-pulse" />
            )}
            <img
              key={currentSrc}
              src={currentSrc}
              alt={shoe.name}
              loading="lazy"
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={handleImgError}
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
              <ShoeOptionsMenu shoe={shoe} onSponsorClick={() => { setShowSponsorModal(true); onSponsorClick?.(); }} />
            </div>

            {/* Top-left badge */}
            {sponsored ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSponsorModal(true); onSponsorClick?.(); }}
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

            {/* Live deal indicator from Deal Agent */}
            {showDealIndicator && (
              <div className="absolute bottom-2.5 left-2.5 z-10">
                <DealIndicator shoe={shoe} />
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

            <div className="mt-1.5">
              <MatchScoreBadge shoe={shoe} />
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="font-heading font-bold text-base">${shoe.price}</span>
              {shoe.rating && (
                <span className="text-[10px] text-muted-foreground">⭐ {shoe.rating}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      </motion.div>
    </>
  );
}