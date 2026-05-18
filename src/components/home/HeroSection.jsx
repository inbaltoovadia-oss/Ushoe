import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Search, Brain, TrendingUp, MapPin, Bell } from "lucide-react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getShoesCatalog } from "../../lib/shoeCache";

const FALLBACK_SHOES = [
  { image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1400&h=900&fit=crop&q=90", brand: "Nike", name: "Air Max 90", tag: "🔥 Trending" },
  { image: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1400&h=900&fit=crop&q=90", brand: "Jordan", name: "1 Retro High", tag: "✨ Icon" },
  { image: "https://images.unsplash.com/photo-1556906781-9a414e2a9c86?w=1400&h=900&fit=crop&q=90", brand: "Adidas", name: "Ultra Boost", tag: "⚡ Top Pick" },
];

const QUICK_TAGS = ["Nike Air Max", "Jordan 1", "New Balance 550", "Adidas Samba", "Yeezy"];

export default function HeroSection() {
  const [slides, setSlides] = useState(FALLBACK_SHOES);
  const [current, setCurrent] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getShoesCatalog(80).then(shoes => {
      const withImages = shoes.filter(s => s.image_url?.startsWith("http"));
      const pool = withImages.length >= 3 ? withImages : shoes;
      const featured = pool.slice(0, 5).map(s => ({
        id: s.id,
        image: s.image_url?.startsWith("http") ? s.image_url : FALLBACK_SHOES[0].image,
        name: s.name,
        brand: s.brand,
        price: s.price,
        tag: s.is_trending ? "🔥 Trending" : s.original_price > s.price ? `💸 ${Math.round(((s.original_price - s.price) / s.original_price) * 100)}% Off` : "⭐ Top Pick",
      }));
      if (featured.length >= 2) setSlides(featured);
    });
  }, []);

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

      {/* Background slideshow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          <img
            src={slide.image}
            alt={slide.name}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = FALLBACK_SHOES[0].image; }}
          />
          {/* Multi-layer dark gradient — cinematic look */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Accent glow */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[300px] pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at bottom left, rgba(249,115,22,0.15) 0%, transparent 60%)", filter: "blur(60px)" }} />

      {/* Content */}
      <div className="relative z-20 w-full max-w-2xl mx-auto px-5 sm:px-8 flex flex-col justify-end"
        style={{ minHeight: "100svh", paddingBottom: "3rem" }}>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white tracking-widest uppercase"
            style={{ background: "rgba(249,115,22,0.18)", border: "1px solid rgba(249,115,22,0.35)", backdropFilter: "blur(12px)" }}>
            <Brain className="w-3 h-3 text-orange-400" />
            AI Sneaker Assistant
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading font-black leading-[1.0] tracking-tight text-white mb-4"
          style={{ fontSize: "clamp(3.2rem, 12vw, 5.5rem)", textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}
        >
          Find Your<br />
          <span style={{ color: "#F97316" }}>Perfect Pair</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-white/60 text-base sm:text-lg mb-7 leading-relaxed max-w-md"
        >
          AI-powered shoe discovery — real prices, local store availability, and personalized picks. All in one place.
        </motion.p>

        {/* Search bar */}
        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          onSubmit={e => { e.preventDefault(); handleSearch(); }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="flex-1 flex items-center rounded-2xl px-4 py-3.5 transition-all focus-within:border-orange-400/70"
            style={{ background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(20px)" }}>
            <Search className="w-4 h-4 text-white/35 flex-shrink-0 mr-3" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Nike, Jordan, Adidas..."
              className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/35"
            />
          </div>
          <button
            type="submit"
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
            style={{ background: "#F97316" }}
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </motion.form>

        {/* Quick tags */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }} className="flex flex-wrap gap-2 mb-8">
          {QUICK_TAGS.map(tag => (
            <button key={tag} onClick={() => handleSearch(tag)}
              className="text-xs px-3.5 py-1.5 rounded-full text-white/60 hover:text-white transition-all"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {tag}
            </button>
          ))}
        </motion.div>

        {/* Nav links */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }} className="flex items-center gap-4">
          <RouterLink to="/nearby-stores" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
            <MapPin className="w-4 h-4" /> Near Me
          </RouterLink>
          <div className="w-px h-4 bg-white/15" />
          <RouterLink to="/trending" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
            <TrendingUp className="w-4 h-4" /> Trending
          </RouterLink>
          <div className="w-px h-4 bg-white/15" />
          <RouterLink to="/assistant" className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
            <Sparkles className="w-4 h-4" /> AI Chat
          </RouterLink>
        </motion.div>

        {/* Slide dots */}
        {slides.length > 1 && (
          <div className="flex gap-2 mt-8">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`transition-all rounded-full ${i === current ? "w-6 h-2" : "w-2 h-2 bg-white/25 hover:bg-white/45"}`}
                style={i === current ? { background: "#F97316" } : undefined} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}