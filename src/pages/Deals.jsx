/**
 * Deals page — validated deals only.
 * 1. Web Deals: non-catalog, live, shipping-validated via Deal Agent
 * 2. Catalog shoes with dynamic DealIndicator badges (only shown when deal confirmed)
 */
import { useState, useEffect } from "react";
import { Tag, Loader2, Sparkles, ShieldCheck, Globe, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import WebDealsSection from "../components/WebDealsSection";
import { getLocation, subscribeLocation } from "../lib/locationStore";

export default function Deals() {
  const [shoes, setShoes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loc, setLoc]         = useState(getLocation());

  useEffect(() => {
    loadCatalog();
    const unsub = subscribeLocation(newLoc => { setLoc(newLoc); });
    return unsub;
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    const all = await base44.entities.Shoe.list("-trending_score", 24);
    setShoes(all);
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 rounded-xl">
              <Tag className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl">Deals & Discounts</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Shipping-validated deals near {loc.city} · Powered by Deal + Shipping Agents
              </p>
            </div>
          </div>

          {/* Trust banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, color: "text-green-600", label: "Shipping Validated", desc: "Only shows deals that ship to you" },
              { icon: Tag,         color: "text-accent",    label: "Live Prices",         desc: "Deal Agent confirms current pricing" },
              { icon: AlertCircle, color: "text-primary",   label: "No Expired Deals",    desc: "Only active, purchasable offers" },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 bg-card border border-border/50 rounded-2xl px-4 py-3">
                <Icon className={`w-4 h-4 ${color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Web Deals — non-catalog, validated by Deal Agent */}
        <section className="mb-12">
          <WebDealsSection />
        </section>

        {/* Catalog section — deal badges load dynamically per card */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-xl">Browse Catalog</h2>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Deal badges appear when confirmed
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Browse all shoes — green badges appear automatically on cards where our Deal Agent confirms a live promotion available in {loc.city}.
          </p>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <AnimatePresence>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {shoes.map((shoe, i) => (
                  <ShoeCard key={shoe.id} shoe={shoe} index={i} showDealIndicator />
                ))}
              </div>
            </AnimatePresence>
          )}
        </section>
      </div>
    </div>
  );
}