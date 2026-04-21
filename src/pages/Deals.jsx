import { useState, useEffect } from "react";
import { Tag, Loader2, RefreshCw, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import { getCached, setCache } from "../lib/searchCache";

const CACHE_KEY = "deals_page";

export default function Deals() {
  const [dbDeals, setDbDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => { loadDeals(); }, []);

  const loadDeals = async (force = false) => {
    if (!force) {
      const cached = getCached(CACHE_KEY);
      if (cached) {
        setDbDeals(cached.db);
        setLastUpdated(cached.ts);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setRefreshing(force);

    const allShoes = await base44.entities.Shoe.list("-trending_score", 100);
    const onSale = allShoes.filter((s) => s.original_price && s.original_price > s.price);
    onSale.sort((a, b) => ((b.original_price - b.price) / b.original_price) - ((a.original_price - a.price) / a.original_price));
    const deals = onSale.slice(0, 12);
    setDbDeals(deals);

    const now = Date.now();
    setLastUpdated(now);
    setCache(CACHE_KEY, { db: deals, ts: now });
    setLoading(false);
    setRefreshing(false);
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
                  Sale shoes from our catalog
                  {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => loadDeals(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : dbDeals.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No deals found right now. Check back later!</p>
          </div>
        ) : (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-accent" />
              <h2 className="font-heading font-bold text-xl">Sale Shoes</h2>
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{dbDeals.length} items</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {dbDeals.map((shoe, i) => <ShoeCard key={shoe.id} shoe={shoe} index={i} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}