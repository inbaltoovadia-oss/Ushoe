import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Sparkles, TrendingUp, MapPin, Bell, ArrowRight, Search } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    color: "#3B5BDB",
    bg: "rgba(59,91,219,0.12)",
    border: "rgba(59,91,219,0.3)",
    title: "AI Sneaker Chat",
    description: "Ask anything. Get real shoe recommendations tailored to your style, budget, and location — instantly.",
    cta: "Try it now",
    href: "/assistant",
    badge: "Most Popular",
  },
  {
    icon: Sparkles,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.3)",
    title: "Personalized For You",
    description: "Shoes matched to your taste based on what you love, how you move, and what you've explored.",
    cta: "See my picks",
    href: "/for-you",
    badge: null,
  },
  {
    icon: TrendingUp,
    color: "#F97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.3)",
    title: "What's Trending",
    description: "Real-time hype meter. See what's blowing up in sneaker culture right now, near you.",
    cta: "Explore trends",
    href: "/trending",
    badge: null,
  },
  {
    icon: MapPin,
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    title: "Find Nearby Stores",
    description: "AI searches local shops for your exact shoe and size. Know who has it before you leave home.",
    cta: "Find stores",
    href: "/nearby-stores",
    badge: null,
  },
  {
    icon: Bell,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    title: "Price & Restock Alerts",
    description: "Track any shoe. Get notified the moment the price drops or your size comes back in stock.",
    cta: "Set alerts",
    href: "/wishlist",
    badge: null,
  },
  {
    icon: Search,
    color: "#EC4899",
    bg: "rgba(236,72,153,0.12)",
    border: "rgba(236,72,153,0.3)",
    title: "Smart Discovery",
    description: "Browse the full catalog with AI-powered filters — find shoes by vibe, use case, or sport.",
    cta: "Start exploring",
    href: "/discover",
    badge: null,
  },
];

function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
    >
      <Link to={feature.href} className="block group h-full">
        <div className="relative h-full rounded-2xl p-5 transition-all duration-300 group-hover:scale-[1.02] group-hover:-translate-y-1"
          style={{ background: "#111115", border: `1px solid ${feature.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>

          {feature.badge && (
            <div className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: feature.bg, color: feature.color, border: `1px solid ${feature.border}` }}>
              {feature.badge}
            </div>
          )}

          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
            style={{ background: feature.bg, border: `1px solid ${feature.border}` }}>
            <Icon className="w-5 h-5" style={{ color: feature.color }} />
          </div>

          <h3 className="font-heading font-bold text-white text-base mb-2 leading-tight">{feature.title}</h3>
          <p className="text-sm leading-relaxed mb-5" style={{ color: "#9CA3AF" }}>{feature.description}</p>

          <div className="flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5"
            style={{ color: feature.color }}>
            {feature.cta}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function FeaturePreviewSection() {
  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: "#0A0A0D" }}>
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
            style={{ background: "rgba(59,91,219,0.12)", border: "1px solid rgba(59,91,219,0.3)", color: "#5B8BF5" }}>
            <Sparkles className="w-3 h-3" />
            Everything you need
          </div>
          <h2 className="font-heading font-black text-white mb-4"
            style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", lineHeight: 1.1 }}>
            Not just a shoe store.<br />
            <span style={{ color: "#F97316" }}>Your sneaker AI.</span>
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#6B7280", lineHeight: 1.7 }}>
            uShoe combines AI recommendations, live web search, real store inventory, and price tracking — so you never miss a perfect pair.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-14"
        >
          <Link to="/assistant"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #3B5BDB 0%, #F97316 100%)", boxShadow: "0 8px 32px rgba(59,91,219,0.35)" }}>
            <Brain className="w-4 h-4" />
            Start with AI Chat
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}