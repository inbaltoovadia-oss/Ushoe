import { useState, useEffect } from "react";
import { Sparkles, MapPin, Search, ArrowRight, TrendingUp } from "lucide-react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
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

const QUICK_TAGS = ["Nike Air Max", "Yeezy", "New Balance 550", "Jordan 1", "Adidas Samba"];

export default function HeroSection() {
  const [slides, setSlides] = useState(FALLBACK_SHOES);
  const [current, setCurrent] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // Load featured shoes from catalog — prefer trending + shoes with images
  useEffect(() => {
    base44.entities.Shoe.list("-trending_score", 40).then(shoes => {
      // First pass: shoes with valid image_url
      const withImages = shoes.filter(s => s.image_url?.startsWith("http"));
      // Second pass: fall back to all trending shoes (image will use onError fallback per shoe)
      const pool = withImages.length >= 3 ? withImages : shoes;

      const featured = pool.slice(0, 5).map(s => ({
        id: s.id,
        image: s.image_url?.startsWith("http")
          ? s.image_url
          : `https://source.unsplash.com/featured/1200x900/?${encodeURIComponent(s.brand + " " + s.name + " sneaker")}`,
        name: s.name,
        brand: s.brand,
        price: s.price,
        tag: s.is_trending
          ? "🔥 Trending Now"
          : s.original_price > s.price
          ? `💸 ${Math.round(((s.original_price - s.price) / s.original_price) * 100)}% Off`
          : "⭐ Top Pick",
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

  const handleSearch = (q) => {
    const query = q || searchQuery.trim();
    if (!query) return navigate("/search");
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden bg-black" style={{ minHeight: "100svh" }}>

      {/* Slideshow background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <img
            src={slide.image}
            alt={slide.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = FALLBACK_SHOES[0].image; }}
          />
          {/* Dark overlay — bottom heavy like the reference */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />
          {/* Shoe label — top right */}
          {slide.brand && (
            <div className="absolute top-5 right-5 flex flex-col items-end gap-1 z-10">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                style={{ background: "rgba(249,115,22,0.85)", backdropFilter: "blur(8px)" }}>
                {slide.tag}
              </div>
              <div className="text-right">
                <p className="text-white font-heading font-bold text-sm drop-shadow-lg">{slide.brand} {slide.name}</p>
                {slide.price && <p className="text-orange-400 font-bold text-sm">${slide.price}</p>}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Orange accent glow (matches reference UI orange accent) */}
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)", filter: "blur(40px)" }} />

      {/* Content */}
      <div className="relative z-20 w-full max-w-2xl mx-auto px-5 sm:px-8 flex flex-col justify-end" style={{ minHeight: "100svh", paddingBottom: "2.5rem" }}>

        {/* AI-Powered badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{
              background: "rgba(255,255,255,0.10)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.20)",
            }}>
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            AI-Powered Discovery
          </div>
        </motion.div>

        {/* Headline — large, left-aligned like reference */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading font-black leading-[1.0] tracking-tight text-white mb-4"
          style={{ fontSize: "clamp(3rem, 12vw, 5rem)", textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}
        >
          Find Your<br />
          <span style={{ color: "#F97316" }}>Perfect Pair</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-white/65 text-base sm:text-lg mb-7 leading-relaxed max-w-md"
        >
          Discover shoes powered by AI. Real prices, real stores, real recommendations — all in one place.
        </motion.p>

        {/* Search bar — matches reference design */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-4"
        >
          <form
            onSubmit={e => { e.preventDefault(); handleSearch(); }}
            className="flex items-center gap-2"
          >
            <div className="flex-1 flex items-center bg-white/10 backdrop-blur-xl rounded-2xl px-4 py-3.5 border border-white/20 focus-within:border-orange-400/60 transition-all">
              <Search className="w-4 h-4 text-white/40 flex-shrink-0 mr-3" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Nike Air Max, Adidas Ultra..."
                className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/40"
              />
            </div>
            <button
              type="submit"
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 hover:opacity-90 active:scale-95 transition-all"
              style={{ background: "#F97316" }}
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </form>
        </motion.div>

        {/* Quick tag pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {QUICK_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => handleSearch(tag)}
              className="text-xs px-3.5 py-1.5 rounded-full text-white/70 hover:text-white transition-all"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Secondary nav links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="flex items-center gap-4"
        >
          <RouterLink
            to="/nearby-stores"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Find Near Me
          </RouterLink>
          <div className="w-px h-4 bg-white/20" />
          <RouterLink
            to="/trending"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            Trending
          </RouterLink>
          <div className="w-px h-4 bg-white/20" />
          <RouterLink
            to="/discover"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Finder
          </RouterLink>
        </motion.div>

        {/* Slide dots */}
        {slides.length > 1 && (
          <div className="flex gap-2 mt-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all rounded-full ${i === current ? "w-6 h-2" : "w-2 h-2 bg-white/30 hover:bg-white/50"}`}
                style={i === current ? { background: "#F97316" } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}