/**
 * TrendingTrendsSection — visualizes shoe popularity trends from catalog data.
 * Shows rising stars, seasonal must-haves, and brand momentum.
 * Pure catalog data — no LLM calls.
 */
import { useState, useEffect } from "react";
import { TrendingUp, Flame, Zap, Star, ArrowUpRight, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { getShoesCatalog } from "../../lib/shoeCache";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SEASON_KEYWORDS = {
  Summer: ["sandal", "slide", "flip flop", "casual", "mesh", "breathable"],
  Winter: ["boot", "waterproof", "insulated", "trail", "hiking"],
  Spring: ["running", "lightweight", "walk"],
  "All Season": ["basketball", "training", "lifestyle"],
};

function getSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return "Spring";
  if (m >= 5 && m <= 8) return "Summer";
  if (m >= 9 && m <= 10) return "Fall";
  return "Winter";
}

function classifyShoe(shoe) {
  const text = `${shoe.name} ${shoe.category} ${shoe.description || ""}`.toLowerCase();
  for (const [season, kws] of Object.entries(SEASON_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) return season;
  }
  return "All Season";
}

export default function TrendingTrendsSection() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rising");
  const currentSeason = getSeason();

  useEffect(() => {
    getShoesCatalog(80).then(data => {
      setShoes(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Rising Stars: high trending_score, recently added or high score relative to price
  const risingStars = shoes
    .filter(s => (s.trending_score || 0) >= 60)
    .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
    .slice(0, 6);

  // Seasonal Must-Haves
  const seasonal = shoes
    .filter(s => classifyShoe(s) === currentSeason || classifyShoe(s) === "All Season")
    .sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0))
    .slice(0, 6);

  // Brand momentum chart data
  const brandMap = {};
  shoes.forEach(s => {
    if (!s.brand) return;
    if (!brandMap[s.brand]) brandMap[s.brand] = { brand: s.brand, score: 0, count: 0 };
    brandMap[s.brand].score += s.trending_score || 0;
    brandMap[s.brand].count += 1;
  });
  const brandChart = Object.values(brandMap)
    .map(b => ({ brand: b.brand, avg: Math.round(b.score / b.count) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 7);

  const BRAND_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff"];

  const tabs = [
    { id: "rising", label: "Rising Stars", icon: Zap },
    { id: "seasonal", label: `${currentSeason} Picks`, icon: Flame },
    { id: "brands", label: "Brand Momentum", icon: BarChart2 },
  ];

  const activeShoes = activeTab === "rising" ? risingStars : seasonal;

  if (loading) {
    return (
      <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-secondary animate-pulse rounded-xl mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary animate-pulse rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-xl">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl">Trending Now</h2>
            <p className="text-xs text-muted-foreground">Popularity insights from our catalog</p>
          </div>
        </div>
        <Link to="/trending" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
          See all <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Brand Momentum Chart */}
      {activeTab === "brands" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-card border border-border/50 rounded-2xl p-5">
            <p className="text-xs text-muted-foreground mb-4">Average trending score by brand (higher = more popular)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={brandChart} layout="vertical" margin={{ left: 0, right: 24 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="brand" tick={{ fontSize: 11 }} width={80} />
                <Tooltip
                  formatter={(v) => [`${v} / 100`, "Trend Score"]}
                  contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                  {brandChart.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Shoe Grid */}
      {activeTab !== "brands" && (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {activeShoes.map((shoe, i) => (
            <Link key={shoe.id} to={`/shoe/${shoe.id}`} className="group block">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="relative aspect-square bg-secondary/40">
                  <img
                    src={shoe.image_url}
                    alt={shoe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { e.target.src = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80"; }}
                  />
                  {/* Trend badge */}
                  <div className="absolute top-2 left-2">
                    {activeTab === "rising" ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                        <Zap className="w-2.5 h-2.5" />
                        {shoe.trending_score || 0}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                        <Flame className="w-2.5 h-2.5" />
                        {currentSeason}
                      </span>
                    )}
                  </div>
                  {shoe.rating && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                      {shoe.rating}
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider truncate">{shoe.brand}</p>
                  <p className="text-xs font-semibold leading-snug line-clamp-2 mt-0.5 group-hover:text-primary transition-colors">{shoe.name}</p>
                  <p className="text-xs font-bold mt-1">${shoe.price}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}

      {/* Trend score legend */}
      {activeTab === "rising" && (
        <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
          <Zap className="w-3 h-3 text-primary" />
          Score = popularity index (0–100). Higher = more trending in our catalog.
        </div>
      )}
    </section>
  );
}