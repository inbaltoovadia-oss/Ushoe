import { motion } from "framer-motion";
import SearchBar from "../SearchBar";
import { Sparkles, Ruler, Camera, MapPin, TrendingUp, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const STATS = [
  { value: "50K+", label: "Shoes Tracked", icon: TrendingUp },
  { value: "4.9★", label: "AI Accuracy", icon: Star },
  { value: "Instant", label: "Web Results", icon: Zap },
];

const QUICK_LINKS = [
  { to: "/discover",       label: "AI Finder",      icon: Sparkles, primary: true },
  { to: "/nearby-stores",  label: "Find Near Me",   icon: MapPin,   primary: false },
  { to: "/fit-predictor",  label: "Fit Predictor",  icon: Ruler,    primary: false },
  { to: "/outfit-matcher", label: "Outfit Matcher", icon: Camera,   primary: false },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[94vh] flex items-center overflow-hidden bg-black">
      {/* Hero Background — high-res dark sneaker */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&h=1080&fit=crop&q=90"
          alt=""
          loading="eager"
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.22) saturate(0.8)" }}
        />
        {/* Spotlight glow on shoe */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_70%_55%,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
        {/* Left-to-content gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        {/* Bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Accent glow blobs */}
      <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none z-0" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-blue-500/8 rounded-full blur-3xl pointer-events-none z-0" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full py-24">
        <div className="max-w-2xl">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2 rounded-full text-sm font-semibold mb-7 backdrop-blur-md"
              aria-label="AI-Powered Shoe Discovery"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              AI-Powered Shoe Discovery
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.04] tracking-tight text-white"
          >
            Find Your
            <br />
            <span className="text-primary drop-shadow-[0_0_30px_rgba(59,130,246,0.6)]">Perfect</span>
            <br />
            Pair.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/70 text-lg sm:text-xl mt-5 max-w-lg leading-relaxed"
          >
            AI searches the web in real time — compare prices, find nearby stores, and get picks made just for you.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8"
          >
            <SearchBar large />
          </motion.div>

          {/* Quick-action buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap gap-3 mt-6"
            role="navigation"
            aria-label="Quick actions"
          >
            {QUICK_LINKS.map(({ to, label, icon: Icon, primary }) => (
              <Link
                key={to}
                to={to}
                aria-label={label}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  primary
                    ? "bg-primary text-white shadow-lg shadow-primary/30 hover:opacity-90"
                    : "bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20"
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex items-center gap-8 mt-12 flex-wrap"
            aria-label="Platform stats"
          >
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-heading font-bold text-xl text-white">{value}</p>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}