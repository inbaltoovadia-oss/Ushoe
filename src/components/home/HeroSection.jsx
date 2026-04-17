import { motion } from "framer-motion";
import { Sparkles, Ruler, Camera, MapPin, Search } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

const QUICK_LINKS = [
  { to: "/search",         label: "Search Shoes",  icon: Search,    primary: true },
  { to: "/nearby-stores",  label: "Find Near Me",  icon: MapPin,    primary: true },
  { to: "/discover",       label: "AI Finder",     icon: Sparkles,  primary: false },
  { to: "/fit-predictor",  label: "Fit Predictor", icon: Ruler,     primary: false },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[94vh] flex items-center justify-center overflow-hidden bg-black">

      {/* ── Dark background base ── */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_60%,#111827_0%,#000000_100%)]" />
      </div>

      {/* ── Shoe — main focal point ── */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none" aria-hidden="true">
        {/* Glow ring behind shoe */}
        <div className="absolute w-[480px] h-[480px] sm:w-[640px] sm:h-[640px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] rounded-full bg-primary/15 blur-2xl" />

        {/* Shoe image — centered, large, dominant */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="relative"
        >
          {/* Drop shadow glow */}
          <div className="absolute -inset-8 bg-primary/8 rounded-full blur-3xl" />

          <motion.img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=900&fit=crop&q=95"
            alt="Premium sneaker"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-[320px] sm:w-[480px] lg:w-[600px] object-contain drop-shadow-[0_40px_80px_rgba(59,130,246,0.35)]"
            style={{
              filter: "drop-shadow(0 0 60px rgba(59,130,246,0.25)) drop-shadow(0 30px 60px rgba(0,0,0,0.8))",
            }}
          />
        </motion.div>
      </div>

      {/* ── Top gradient so text reads clearly ── */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/85" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 py-24 flex flex-col items-center text-center">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2 rounded-full text-sm font-semibold mb-8 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            AI-Powered Shoe Discovery
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-heading font-black text-5xl sm:text-7xl lg:text-8xl leading-[1.02] tracking-tight text-white"
        >
          Find Your
          <br />
          <span
            className="text-primary"
            style={{ textShadow: "0 0 60px rgba(59,130,246,0.7), 0 0 20px rgba(59,130,246,0.4)" }}
          >
            Perfect
          </span>
          <br />
          Pair.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="text-white/65 text-lg sm:text-xl mt-5 max-w-lg leading-relaxed"
        >
          AI searches the web in real time — compare prices, find nearby stores, and get picks made just for you.
        </motion.p>

        {/* CTA buttons — primary actions always front & center */}
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
              aria-label={label}
              className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-semibold text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[48px] ${
                primary
                  ? "bg-primary text-white shadow-xl shadow-primary/30 hover:opacity-90 hover:scale-105"
                  : "bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 hover:scale-105"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {label}
            </RouterLink>
          ))}
        </motion.nav>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex items-center gap-10 mt-14 flex-wrap justify-center"
          aria-label="Platform stats"
        >
          {[
            { value: "50K+",    label: "Shoes Tracked" },
            { value: "4.9★",    label: "AI Accuracy" },
            { value: "Instant", label: "Web Results" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-heading font-bold text-2xl text-white">{value}</p>
              <p className="text-xs text-white/45 mt-1 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}