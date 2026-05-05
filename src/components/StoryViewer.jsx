/**
 * StoryViewer — Full-screen story viewer rendered via React Portal.
 * Tap right → next, tap left → previous. Hold to pause. Auto-advances every 5s.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Converse: "https://images.unsplash.com/photo-1463100099107-aa0980c362e6?w=800&q=80",
  Vans: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&q=90",
};
const DEFAULT_FALLBACK = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=90";

function getImg(shoe) {
  if (shoe?.image_url?.startsWith("http")) return shoe.image_url;
  const bl = (shoe?.brand || "").toLowerCase();
  const key = Object.keys(BRAND_FALLBACKS).find(k => bl.startsWith(k.toLowerCase()));
  return key ? BRAND_FALLBACKS[key] : DEFAULT_FALLBACK;
}

function StoryViewerInner({ shoes, initialIndex = 0, onClose }) {
  const [current, setCurrent] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const [imgSrc, setImgSrc] = useState(() => getImg(shoes[initialIndex]));
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const navigate = useNavigate();
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  const shoe = shoes[current];

  // Update image when slide changes
  useEffect(() => {
    setImgLoaded(false);
    setImgSrc(getImg(shoe));
  }, [current]);

  // Preload next
  useEffect(() => {
    if (shoes[current + 1]) {
      const img = new Image();
      img.src = getImg(shoes[current + 1]);
    }
  }, [current]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const goNext = useCallback(() => {
    if (current < shoes.length - 1) {
      setDirection(1); setCurrent(i => i + 1); setProgress(0);
    } else { onClose(); }
  }, [current, shoes.length, onClose]);

  const goPrev = useCallback(() => {
    if (current > 0) { setDirection(-1); setCurrent(i => i - 1); setProgress(0); }
  }, [current]);

  // Auto-advance timer
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
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    if (x < window.innerWidth / 2) goPrev(); else goNext();
  };

  const discount = (shoe.original_price > shoe.price)
    ? Math.round(((shoe.original_price - shoe.price) / shoe.original_price) * 100)
    : 0;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Story card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100dvh",
          maxWidth: "calc(100dvh * 9 / 16)",
          overflow: "hidden",
          background: "#0a0a12",
        }}
        onPointerDown={(e) => { if (!showShare) setPaused(true); }}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onClick={handleTap}
      >
        {/* BG gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, #0f0f1a 0%, #1a1020 100%)",
        }} />

        {/* Ambient glow behind shoe */}
        <div style={{
          position: "absolute",
          top: "8%", left: "10%", right: "10%", height: "52%",
          pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 60% at 50% 55%, rgba(99,102,241,0.28) 0%, transparent 70%)",
          filter: "blur(24px)",
        }} />

        {/* ── SHOE IMAGE ── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`img-${current}`}
            initial={{ opacity: 0, scale: 0.94, x: direction > 0 ? 30 : -30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: direction > 0 ? -30 : 30 }}
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: "absolute",
              top: "10%", left: "5%", right: "5%",
              height: "52%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {!imgLoaded && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 20,
              }} />
            )}
            <img
              src={imgSrc}
              alt={shoe.name}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgSrc(DEFAULT_FALLBACK); setImgLoaded(true); }}
              draggable={false}
              style={{
                width: "100%", height: "100%",
                objectFit: "contain",
                objectPosition: "center",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.35s ease",
                userSelect: "none",
                WebkitUserDrag: "none",
                filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.55)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Bottom gradient scrim */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "55%", pointerEvents: "none",
          background: "linear-gradient(to top, rgba(0,0,0,0.97) 35%, rgba(0,0,0,0.6) 60%, transparent 100%)",
        }} />

        {/* ── PROGRESS BARS ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", gap: 4, padding: "12px 12px 0",
        }}>
          {shoes.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2.5, borderRadius: 99,
              background: "rgba(255,255,255,0.25)", overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 99, background: "#fff",
                width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
              }} />
            </div>
          ))}
        </div>

        {/* ── TOP BAR ── */}
        <div style={{
          position: "absolute", top: 22, left: 0, right: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(12px)",
            }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 11 }}>
                {(shoe.brand || "?")[0]}
              </span>
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 600, fontSize: 12, lineHeight: 1 }}>{shoe.brand}</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 2 }}>{shoe.category}</p>
            </div>
            {shoe.is_trending && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(249,115,22,0.9)",
                padding: "3px 8px", borderRadius: 99,
                backdropFilter: "blur(8px)",
              }}>
                <Flame style={{ width: 11, height: 11, color: "#fff" }} />
                <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>Trending</span>
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(12px)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X style={{ width: 16, height: 16, color: "#fff" }} />
          </button>
        </div>

        {/* ── BOTTOM INFO + ACTIONS ── */}
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
            padding: "0 20px 28px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${current}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* Shoe name */}
              <h2 style={{
                color: "#fff", fontWeight: 900, lineHeight: 1.15,
                fontSize: "clamp(1.3rem, 5.5vw, 1.85rem)",
                margin: 0,
              }}>
                {shoe.name}
              </h2>

              {shoe.colorway && (
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4 }}>
                  {shoe.colorway}
                </p>
              )}

              {/* Price + badges */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(1.6rem, 6.5vw, 2.2rem)" }}>
                  ${shoe.price}
                </span>
                {shoe.original_price > shoe.price && (
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, textDecoration: "line-through" }}>
                    ${shoe.original_price}
                  </span>
                )}
                {discount > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "#22c55e", color: "#fff",
                    fontSize: 11, fontWeight: 700,
                    padding: "4px 10px", borderRadius: 99,
                  }}>
                    <Tag style={{ width: 11, height: 11 }} />
                    {discount}% OFF
                  </span>
                )}
                {shoe.rating && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                    <Star style={{ width: 13, height: 13, fill: "#facc15", color: "#facc15" }} />
                    {shoe.rating}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button
              onClick={() => navigate(`/shoe/${shoe.id}?tab=nearby`)}
              style={{
                flex: 1, height: 52, borderRadius: 16,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff", fontWeight: 600, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer", backdropFilter: "blur(12px)",
              }}
            >
              <MapPin style={{ width: 16, height: 16 }} />
              Nearby
            </button>

            <button
              onClick={() => navigate(`/shoe/${shoe.id}?tab=online`)}
              style={{
                flex: 1, height: 52, borderRadius: 16,
                background: "#fff",
                border: "none",
                color: "#000", fontWeight: 700, fontSize: 14,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: "pointer",
              }}
            >
              <Globe style={{ width: 16, height: 16 }} />
              Buy Online
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setPaused(true); setShowShare(true); }}
              style={{
                width: 52, height: 52, borderRadius: 16,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", backdropFilter: "blur(12px)",
              }}
            >
              <Share2 style={{ width: 16, height: 16, color: "#fff" }} />
            </button>
          </div>

          {/* Counter */}
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 10, textAlign: "center", marginTop: 12 }}>
            {current + 1} / {shoes.length}
          </p>
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

export default function StoryViewer(props) {
  return createPortal(<StoryViewerInner {...props} />, document.body);
}