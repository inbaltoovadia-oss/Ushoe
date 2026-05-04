/**
 * StoryViewer — Instagram Stories-style full-screen shoe viewer.
 * Tap right → next, tap left → previous. Hold to pause. Auto-advances every 5s.
 * Layout: shoe image on top half (object-contain), text + actions on bottom half.
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
    if (paused) {
      clearInterval(progressRef.current);
      return;
    }
    setProgress(0);
    startTimeRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressRef.current);
        goNext();
      }
    }, 50);
    return () => clearInterval(progressRef.current);
  }, [current, paused, goNext]);

  const handleTap = (e) => {
    if (showShare) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    if (x < window.innerWidth / 2) goPrev();
    else goNext();
  };

  const discount = shoe.original_price > shoe.price
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "#000" }}>
      <div
        className="relative w-full h-full max-w-sm mx-auto flex flex-col"
        onPointerDown={() => { if (!showShare) setPaused(true); }}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onClick={handleTap}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-3">
          {shoes.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: i < current ? "100%" : i === current ? `${progress}%` : "0%", transition: "none" }}
              />
            </div>
          ))}
        </div>

        {/* Top bar */}
        <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <span className="text-white font-bold text-[10px]">{(shoe.brand || "?")[0]}</span>
            </div>
            <div>
              <p className="text-white font-semibold text-xs leading-none">{shoe.brand}</p>
              <p className="text-white/60 text-[10px] mt-0.5">{shoe.category}</p>
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

        {/* === IMAGE — top 55% === */}
        <div className="relative flex-none" style={{ height: "55%" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "linear-gradient(180deg, #111 0%, #1a1a2e 100%)" }}
            >
              <img
                src={imgSrc}
                alt={shoe.name}
                className="w-full h-full object-contain p-6"
                style={{ maxHeight: "100%" }}
                onError={() => setImgSrc(DEFAULT_FALLBACK)}
                draggable={false}
              />
              {/* Subtle side glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* === INFO PANEL — bottom 45% === */}
        <div
          className="flex-1 flex flex-col justify-between px-5 py-5"
          style={{ background: "linear-gradient(180deg, #0d0d14 0%, #0a0a10 100%)" }}
        >
          <motion.div
            key={`info-${current}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            {/* Name */}
            <h2 className="text-white font-heading font-black text-2xl leading-tight">{shoe.name}</h2>
            {shoe.colorway && (
              <p className="text-white/50 text-sm mt-0.5">{shoe.colorway}</p>
            )}

            {/* Price row */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-white font-bold text-3xl">${shoe.price}</span>
              {shoe.original_price > shoe.price && (
                <span className="text-white/40 text-lg line-through">${shoe.original_price}</span>
              )}
              {discount > 0 && (
                <span className="flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  <Tag className="w-3 h-3" />
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* Rating + counter row */}
            <div className="flex items-center gap-3 mt-2">
              {shoe.rating && (
                <span className="flex items-center gap-1 text-white/60 text-sm">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  {shoe.rating}
                </span>
              )}
              <span className="text-white/30 text-xs">{current + 1} / {shoes.length}</span>
            </div>
          </motion.div>

          {/* Action buttons */}
          <div
            className="flex gap-2 mt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => navigate(`/shoe/${shoe.id}?tab=nearby`)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            >
              <MapPin className="w-4 h-4" />
              Nearby
            </button>

            <button
              onClick={() => navigate(`/shoe/${shoe.id}?tab=online`)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm bg-white text-black"
            >
              <Globe className="w-4 h-4" />
              Buy Online
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setPaused(true); setShowShare(true); }}
              className="w-14 flex items-center justify-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showShare && (
          <ShareShoeCard shoe={shoe} onClose={() => { setShowShare(false); setPaused(false); }} />
        )}
      </AnimatePresence>
    </div>
  );
}