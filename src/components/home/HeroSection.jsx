import { useState, useEffect } from "react";
import { Sparkles, Ruler, Camera, MapPin, Search, ChevronRight } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const FALLBACK_SHOES = [
  {
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=900&fit=crop&q=95",
    name: "Nike Air Max",
    brand: "Nike",
    tag: "🔥 Most Popular",
  },
  {
    image: "https://images.unsplash.com/photo-1608667508764-33cf0726b13a?w=1200&h=900&fit=crop&q=95",
    name: "Adidas Ultra Boost",
    brand: "Adidas",
    tag: "⚡ Trending Now",
  },
  {
    image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1200&h=900&fit=crop&q=95",
    name: "Jordan 1 Retro",
    brand: "Jordan",
    tag: "✨ Icon",
  },
];

const QUICK_LINKS = [
  { to: "/search",        label: "Search",      icon: Search,   primary: true },
  { to: "/nearby-stores", label: "Near Me",     icon: MapPin,   primary: true },
  { to: "/discover",      label: "AI Finder",   icon: Sparkles, primary: false },
  { to: "/fit-predictor", label: "Fit Check",   icon: Ruler,    primary: false },
];

export default function HeroSection() {
  const [slides, setSlides] = useState(FALLBACK_SHOES);
  const [current, setCurrent] = useState(0);

  // Load featured shoes from catalog (no credits, pure DB read)
  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 10).then(shoes => {
      const featured = shoes
        .filter(s => s.image_url?.startsWith("http"))
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          image: s.image_url,
          name: s.name,
          brand: s.brand,
          price: s.price,
          tag: s.is_trending ? "🔥 Trending" : s.original_price > s.price ? `💸 ${Math.round(((s.original_price - s.price) / s.original_price) * 100)}% Off` : "⭐ Top Pick",
        }));
      if (featured.length >= 2) setSlides(featured);
    });
  }, []);

  // Auto-advance
  useEffect(() => {
    const t = setInterval(() => setCurrent(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[current];

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-black">

      {/* Slideshow background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <img
            src={slide.image}
            alt={slide.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = FALLBACK_SHOES[0].image; }}
          />
          {/* Dark overlay — strong gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/50" />
        </motion.div>
      </AnimatePresence>

      {/* Ambient glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-primary/15 blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-5 sm:px-8 py-24 flex flex-col items-center text-center">

        {/* Slide label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`tag-${current}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.28)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.45) inset, 0 4px 16px rgba(0,0,0,0.25)",
              }}>
              {slide.tag}
              {slide.brand && <span className="text-white/60 ml-1">· {slide.brand}</span>}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading font-black text-5xl sm:text-7xl lg:text-8xl leading-[1.02] tracking-tight text-white"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,1)" }}
        >
          Find Your
          <br />
          <span className="text-primary" style={{ textShadow: "0 0 60px rgba(59,130,246,0.7), 0 0 20px rgba(59,130,246,0.4)" }}>
            Perfect
          </span>
          <br />
          Pair.
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="text-white/65 text-lg sm:text-xl mt-5 max-w-lg leading-relaxed"
        >
          AI searches the web in real time — compare prices, find nearby stores, and get picks made just for you.
        </motion.p>

        {/* CTAs */}
        <motion.nav
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          aria-label="Main actions"
          className="flex flex-wrap justify-center gap-3 mt-10"
        >
          {QUICK_LINKS.map(({ to, label, icon: Icon, primary }) => (
            <RouterLink
              key={to}
              to={to}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[48px] hover:scale-105 active:scale-95 ${
                primary ? "bg-primary text-white shadow-xl shadow-primary/40 hover:opacity-90" : ""
              }`}
              style={!primary ? {
                background: "rgba(255,255,255,0.13)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.32)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.50) inset, 0 6px 20px rgba(0,0,0,0.22)",
                color: "white",
              } : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </RouterLink>
          ))}
        </motion.nav>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex items-center gap-2 mt-14 flex-wrap justify-center"
        >
          {[
            { value: "50K+",    label: "Shoes Tracked" },
            { value: "4.9★",    label: "AI Accuracy" },
            { value: "Instant", label: "Web Results" },
          ].map(({ value, label }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-px h-8 bg-white/15" />}
              <div className="text-center px-5 py-3 rounded-2xl relative overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.30) inset",
                }}>
                <p className="font-heading font-bold text-xl text-white">{value}</p>
                <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Slide dots */}
        {slides.length > 1 && (
          <div className="flex gap-2 mt-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all rounded-full ${i === current ? "bg-primary w-6 h-2" : "bg-white/30 w-2 h-2 hover:bg-white/50"}`}
              />
            ))}
          </div>
        )}

        {/* Browse CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10"
        >
          {slide.id ? (
            <RouterLink
              to={`/shoe/${slide.id}`}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors group"
            >
              View {slide.name}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </RouterLink>
          ) : (
            <RouterLink
              to="/trending"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors group"
            >
              Browse trending shoes
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </RouterLink>
          )}
        </motion.div>
      </div>
    </section>
  );
}