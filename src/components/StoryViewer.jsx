/**
 * StoryViewer — Full-screen 9:16 story card. No scroll. Everything visible at once.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Globe, Share2, Tag, Flame, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ShareShoeCard from "./ShareShoeCard";

const STORY_DURATION = 5000;

const BRAND_FALLBACKS = {
  Nike: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=90",
  Adidas: "https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=800&q=90",
  Jordan: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=90",
  Puma: "https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=800&q=90",
  "New Balance": "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=90",
  Converse: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800&q=90",
  Vans: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=90",
};
const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=90";

function getImg(shoe) {
  if (shoe.image_url?.startsWith("http")) return shoe.image_url;
  const bl = (shoe.brand || "").toLowerCase();
  const key = Object.keys(BRAND_FALLBACKS).find(k => bl.startsWith(k.toLowerCase()));
  return key ? BRAND_FALLBACKS[key] : DEFAULT_FALLBACK;
}

export default function StoryViewer({ shoes, initialIndex = 0, onClose }) {
  const [current, setCurrent] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const [imgSrc, setImgSrc] = useState(getImg(shoes[initialIndex]));
  const [showShare, setShowShare] = useState(false);
  const navigate = useNavigate();
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  const shoe = shoes[current];

  useEffect(() => {
    if (shoes[current + 1]) {
      const img = new Image();
      img.src = getImg(shoes[current + 1]);
    }
  }, [current]);

  useEffect(() => {
    setImgSrc(getImg(shoe));
  }, [current]);

  const goNext = useCallback(() => {
    if (current < shoes.length - 1) {
      setDirection(1);
      setCurrent(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [current, shoes.length, onClose]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(i => i - 1);
      setProgress(0);
    }
  }, [current]);

  useEffect(() => {
    if (paused) { clearInterval(progressRef.current); return; }
    setProgress(0);
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - startTimeRef.current) / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { clearInterval(progressRef.current); goNext(); }
    }, 50);
    return () => clearInterval(progressRef.current);
  }, [current, paused, goNext]);

  const handleTap = (e) => {
    if (showShare) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    if (x < window.innerWidth / 2) goPrev(); else goNext();
  };

  const discount = shoe.original_price > shoe.price
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  return (
    // Full-screen black backdrop
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">

      {/* Story card — max 9:16, centered, never overflows */}
      <div
        className="relative w-full bg-black overflow-hidden"
        style={{
          // 9:16 aspect ratio, capped at full viewport
          maxWidth: "min(100vw, calc(100vh * 9 / 16))",
          height: "100dvh",
          maxHeight: "100dvh",
        }}
        onPointerDown={() => { if (!showShare) setPaused(true); }}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onClick={handleTap}
      >

        {/* ── BACKGROUND IMAGE (fills entire card) ── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0"
          >
            {/* Dark gradient bg so image has depth */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #0f0f1a 0%, #1a1020 100%)" }} />
            {/* Soft ambient glow behind shoe */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 70% 50% at 50% 45%, rgba(99,102,241,0.18) 0%, transparent 70%)" }} />
            {/* The shoe image — centered, contained, top portion */}
            <div className="absolute left-0 right-0" style={{ top: "10%", height: "48%" }}>
              <img
                src={imgSrc}
                alt={shoe.name}
                className="w-full h-full object-contain"
                style={{ padding: "0 10%" }}
                onError={() => setImgSrc(DEFAULT_FALLBACK)}
                draggable={false}
              />
            </div>
            {/* Bottom gradient for text legibility */}
            <div className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 40%, rgba(0,0,0,0.3) 70%, transparent 100%)" }} />
          </motion.div>
        </AnimatePresence>

        {/* ── PROGRESS BARS — absolute top ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-3 pb-2">
          {shoes.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: i < current ? "100%" : i === current ? `${progress}%` : "0%", transition: "none" }}
              />
            </div>
          ))}
        </div>

        {/* ── TOP BAR: brand avatar + trending + close ── */}
        <div className="absolute top-7 left-0 right-0 z-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/25">
              <span className="text-white font-bold text-[11px]">{(shoe.brand || "?")[0]}</span>
            </div>
            <div>
              <p className="text-white font-semibold text-xs leading-none">{shoe.brand}</p>
              <p className="text-white/50 text-[10px] mt-0.5">{shoe.category}</p>
            </div>
            {shoe.is_trending && (
              <div className="flex items-center gap-1 bg-orange-500/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3 text-white" />
                <span className="text-white text-[10px] font-bold">Trending</span>
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── BOTTOM CONTENT: absolutely positioned, no scroll ── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-5"
          style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Shoe info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${current}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-white font-heading font-black leading-tight" style={{ fontSize: "clamp(1.25rem, 5vw, 1.75rem)" }}>
                {shoe.name}
              </h2>
              {shoe.colorway && (
                <p className="text-white/50 text-sm mt-0.5 truncate">{shoe.colorway}</p>
              )}

              {/* Price row */}
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                <span className="text-white font-black" style={{ fontSize: "clamp(1.5rem, 6vw, 2rem)" }}>
                  ${shoe.price}
                </span>
                {shoe.original_price > shoe.price && (
                  <span className="text-white/35 text-base line-through">${shoe.original_price}</span>
                )}
                {discount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    <Tag className="w-3 h-3" />
                    {discount}% OFF
                  </span>
                )}
                {shoe.rating && (
                  <span className="inline-flex items-center gap-1 text-white/60 text-sm ml-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {shoe.rating}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate(`/shoe/${shoe.id}?tab=nearby`)}
              className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm rounded-2xl"
              style={{ height: 52, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(12px)" }}
            >
              <MapPin className="w-4 h-4 flex-shrink-0" />
              Nearby
            </button>

            <button
              onClick={() => navigate(`/shoe/${shoe.id}?tab=online`)}
              className="flex-1 flex items-center justify-center gap-2 font-semibold text-sm rounded-2xl bg-white text-black"
              style={{ height: 52 }}
            >
              <Globe className="w-4 h-4 flex-shrink-0" />
              Buy Online
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setPaused(true); setShowShare(true); }}
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 52, height: 52, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(12px)" }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Story counter */}
          <p className="text-center text-white/25 text-[10px] mt-3">{current + 1} / {shoes.length}</p>
        </div>
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {showShare && (
          <ShareShoeCard shoe={shoe} onClose={() => { setShowShare(false); setPaused(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}