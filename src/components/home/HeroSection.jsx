import { motion } from "framer-motion";
import SearchBar from "../SearchBar";
import { Sparkles, Ruler, Camera, TrendingUp, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const STATS = [
  { value: "50K+", label: "Shoes Tracked", icon: TrendingUp },
  { value: "4.9★", label: "AI Accuracy", icon: Star },
  { value: "Instant", label: "Web Results", icon: Zap },
];

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=400&h=400&fit=crop",
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920&h=1080&fit=crop"
          alt="Hero"
          className="w-full h-full object-cover scale-105"
          style={{ filter: "brightness(0.45)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Animated accent blobs */}
      <div className="absolute top-20 right-1/3 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse z-0" />
      <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl z-0" style={{ animationDelay: "1s" }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Shoe Discovery
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-heading font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
            >
              Find Your
              <br />
              <span className="text-primary">Perfect</span>
              <br />
              Pair.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground text-lg mt-5 max-w-md leading-relaxed"
            >
              AI searches the web in real time. Compare prices, find nearby stores, get personalized picks.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8"
            >
              <SearchBar large />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-wrap items-center gap-3 mt-6"
            >
              <Link
                to="/discover"
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
              >
                <Sparkles className="w-4 h-4" />
                AI Finder
              </Link>
              <Link
                to="/fit-predictor"
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-foreground border border-white/20 px-5 py-3 rounded-2xl font-medium hover:bg-white/20 transition-colors"
              >
                <Ruler className="w-4 h-4" />
                Fit Predictor
              </Link>
              <Link
                to="/outfit-matcher"
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-foreground border border-white/20 px-5 py-3 rounded-2xl font-medium hover:bg-white/20 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Outfit Matcher
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center gap-8 mt-10"
            >
              {STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center">
                  <p className="font-heading font-bold text-xl text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — stacked shoe images */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.35 }}
            className="hidden lg:flex items-center justify-center relative h-[500px]"
          >
            <div className="absolute -inset-8 bg-primary/10 rounded-full blur-3xl" />
            {HERO_IMAGES.map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 + i * 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 + i * 0.15 }}
                className="absolute"
                style={{
                  left: `${i * 28}%`,
                  top: `${10 + i * 15}%`,
                  zIndex: HERO_IMAGES.length - i,
                  transform: `rotate(${(i - 1) * 6}deg)`,
                }}
              >
                <div className="w-52 h-52 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10">
                  <img src={src} alt="shoe" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}