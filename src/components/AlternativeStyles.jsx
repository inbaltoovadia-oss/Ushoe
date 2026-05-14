/**
 * AlternativeStyles — AI-powered section finding:
 * 1. Other colorways of the same model in our catalog
 * 2. Visually similar shoes (same silhouette/style/category) from catalog
 */
import { useState, useEffect } from "react";
import { Sparkles, Palette, Layers, Loader2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import ShoeImage from "./ShoeImage";

const TABS = [
  { id: "colorways", label: "Other Colorways", icon: Palette },
  { id: "similar",   label: "Similar Style",   icon: Layers },
];

function scoreVisualSimilarity(shoe, candidate) {
  let score = 0;
  if (candidate.category === shoe.category) score += 40;
  if (candidate.brand === shoe.brand)       score += 15;
  if (candidate.gender === shoe.gender)     score += 10;
  // Shared features
  const shoeFeatures = new Set((shoe.features || []).map(f => f.toLowerCase()));
  (candidate.features || []).forEach(f => {
    if (shoeFeatures.has(f.toLowerCase())) score += 8;
  });
  // Price proximity (within 30%)
  const priceDiff = Math.abs(candidate.price - shoe.price) / shoe.price;
  if (priceDiff < 0.1) score += 12;
  else if (priceDiff < 0.3) score += 6;
  return score;
}

function findColorways(shoe, allShoes) {
  // Same model name (ignoring colorway descriptor) from same brand
  const modelBase = shoe.name
    .replace(/\b(white|black|grey|gray|blue|red|green|yellow|pink|purple|orange|brown|cream|navy|coral|olive|mint|teal|maroon|beige|tan|sand|gold|silver|bone|volt|infrared)\b/gi, "")
    .trim()
    .toLowerCase();

  return allShoes
    .filter(s => {
      if (s.id === shoe.id) return false;
      if (s.brand !== shoe.brand) return false;
      const candidateBase = s.name
        .replace(/\b(white|black|grey|gray|blue|red|green|yellow|pink|purple|orange|brown|cream|navy|coral|olive|mint|teal|maroon|beige|tan|sand|gold|silver|bone|volt|infrared)\b/gi, "")
        .trim()
        .toLowerCase();
      // Check if base model names are similar
      return candidateBase === modelBase ||
        candidateBase.includes(modelBase) ||
        modelBase.includes(candidateBase) ||
        // Also check colorway field
        (s.colorway && shoe.colorway && s.colorway !== shoe.colorway && s.category === shoe.category);
    })
    .slice(0, 6);
}

function findSimilarStyle(shoe, allShoes) {
  return allShoes
    .filter(s => s.id !== shoe.id && s.category === shoe.category)
    .map(s => ({ shoe: s, score: scoreVisualSimilarity(shoe, s) }))
    .filter(x => x.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.shoe);
}

export default function AlternativeStyles({ shoe }) {
  const [activeTab, setActiveTab]   = useState("colorways");
  const [colorways, setColorways]   = useState([]);
  const [similar, setSimilar]       = useState([]);
  const [aiSimilar, setAiSimilar]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [aiLoading, setAiLoading]   = useState(false);

  useEffect(() => {
    if (!shoe) return;
    setLoading(true);
    setAiSimilar([]);

    base44.entities.Shoe.list("-trending_score", 100).then(all => {
      const cw = findColorways(shoe, all);
      const sm = findSimilarStyle(shoe, all);
      setColorways(cw);
      setSimilar(sm);
      setLoading(false);

      // If we have fewer than 3 visually similar, ask AI for better matches
      if (sm.length < 3) {
        fetchAiSimilar(shoe, all);
      }
    });
  }, [shoe?.id]);

  const fetchAiSimilar = async (shoe, allShoes) => {
    setAiLoading(true);
    const candidates = allShoes
      .filter(s => s.id !== shoe.id && s.category === shoe.category)
      .slice(0, 30)
      .map(s => `id:${s.id} | ${s.brand} ${s.name} | $${s.price} | ${s.colorway || ""}`);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a sneaker style expert. Given this shoe and a list of catalog shoes, pick the 4 most visually and stylistically similar options.

TARGET SHOE: ${shoe.brand} ${shoe.name}${shoe.colorway ? ` (${shoe.colorway})` : ""}
Category: ${shoe.category}
Features: ${(shoe.features || []).join(", ")}
Description: ${shoe.description || ""}

CATALOG OPTIONS:
${candidates.join("\n")}

Return the IDs of the 4 best visual matches. Consider silhouette, design language, intended use, and aesthetic similarity. Prioritize shoes with different brands for variety.`,
      response_json_schema: {
        type: "object",
        properties: {
          similar_ids: { type: "array", items: { type: "string" }, maxItems: 4 },
        },
      },
    });

    const ids = res.similar_ids || [];
    const matched = ids.map(id => allShoes.find(s => s.id === id)).filter(Boolean);
    setAiSimilar(matched);
    setAiLoading(false);
  };

  if (loading) return null;

  const colorwayList = colorways;
  const similarList  = aiSimilar.length > 0 ? [...new Map([...similar, ...aiSimilar].map(s => [s.id, s])).values()].slice(0, 6) : similar;

  // Don't render if nothing to show
  const hasColorways = colorwayList.length > 0;
  const hasSimilar   = similarList.length > 0;
  if (!hasColorways && !hasSimilar) return null;

  // Default to first available tab
  const availableTabs = TABS.filter(t => t.id === "colorways" ? hasColorways : hasSimilar);
  const currentTab    = availableTabs.find(t => t.id === activeTab) ? activeTab : availableTabs[0]?.id;
  const list          = currentTab === "colorways" ? colorwayList : similarList;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/60 bg-card/60 p-5 mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-base">Alternative Styles</h3>
        </div>
        {aiLoading && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            AI matching…
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {availableTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              currentTab === id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
            <span className="text-[10px] opacity-70">
              ({id === "colorways" ? colorwayList.length : similarList.length})
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {list.map((alt, i) => (
            <motion.div
              key={alt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/shoe/${alt.id}`}
                className="group flex flex-col rounded-xl overflow-hidden bg-secondary/40 hover:bg-secondary/80 transition-all border border-border/40 hover:border-primary/30 hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden bg-secondary">
                  <ShoeImage
                    src={alt.image_url}
                    brand={alt.brand}
                    name={alt.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide truncate">{alt.brand}</p>
                  <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors mt-0.5 leading-tight">{alt.name}</p>
                  {alt.colorway && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{alt.colorway}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-sm font-bold text-primary">${alt.price}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {list.length > 0 && (
        <Link
          to={`/search?q=${encodeURIComponent(currentTab === "colorways" ? shoe.name : shoe.category)}`}
          className="mt-4 flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
        >
          View all {currentTab === "colorways" ? "colorways" : "similar styles"}
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
}