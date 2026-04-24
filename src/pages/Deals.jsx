/**
 * Deals page — two sections:
 * 1. Catalog shoes (browsable, no price assumptions)
 * 2. Web Deals section (non-catalog, live Deal Agent results)
 */
import { useState, useEffect } from "react";
import { Tag, Loader2, RefreshCw, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import WebDealsSection from "../components/WebDealsSection";
import { getLocation } from "../lib/locationStore";

export default function Deals() {
  const [shoes, setShoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const loc = getLocation();

  useEffect(() => { loadCatalog(); }, []);

  const loadCatalog = async () => {
    setLoading(true);
    // Load catalog shoes by trending score — no price filtering
    // Deal indicators are applied dynamically by DealIndicator component on each card
    const all = await base44.entities.Shoe.list("-trending_score", 24);
    setShoes(all);
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Tag className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-3xl">Deals & Discounts</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Live deals near {loc.city} · Powered by Deal + Inventory Agents
                </p>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div className="mt-4 flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-2xl px-4 py-3">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">How this works: </span>
              Browse catalog shoes below — deal badges appear when our Deal Agent confirms a live promotion.
              Scroll down for non-catalog Web Deals discovered in real time near {loc.city}.
            </div>
          </div>
        </motion.div>

        {/* Catalog section */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-accent" />
            <h2 className="font-heading font-bold text-xl">Catalog Shoes</h2>
            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              Deal badges load dynamically
            </span>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {shoes.map((shoe, i) => <ShoeCard key={shoe.id} shoe={shoe} index={i} showDealIndicator />)}
            </div>
          )}
        </section>

        {/* Web Deals — non-catalog products from Deal Agent */}
        <WebDealsSection />
      </div>
    </div>
  );
}