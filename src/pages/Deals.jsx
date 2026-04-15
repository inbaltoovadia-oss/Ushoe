import { useState, useEffect } from "react";
import { Tag, Loader2, Globe, RefreshCw, ExternalLink, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import SkeletonCard from "../components/SkeletonCard";
import { getCached, setCache } from "../lib/searchCache";

const CACHE_KEY = "deals_page";

export default function Deals() {
  const [dbDeals, setDbDeals] = useState([]);
  const [webDeals, setWebDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => { loadDeals(); }, []);

  const loadDeals = async (force = false) => {
    if (!force) {
      const cached = getCached(CACHE_KEY);
      if (cached) {
        setDbDeals(cached.db);
        setWebDeals(cached.web);
        setLastUpdated(cached.ts);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setRefreshing(force);

    const [allShoes, aiDeals] = await Promise.all([
      base44.entities.Shoe.list("-trending_score", 100),
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a shoe deals expert. Search the web for the BEST current shoe deals right now (today).
Find top 9 deals from Nike, Adidas, New Balance, ASICS, Puma, Converse, Vans, Jordan, Reebok, Hoka, and other major brands.
Focus on the biggest discounts (% off), clearance sales, flash deals, and outlet pricing.
Include deals from major retailers: Nike.com, Adidas.com, FootLocker, Finish Line, Zappos, Dick's Sporting Goods.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            deals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  original_price: { type: "number" },
                  sale_price: { type: "number" },
                  discount_pct: { type: "number" },
                  retailer: { type: "string" },
                  category: { type: "string" },
                  deal_link: { type: "string" },
                  expires: { type: "string" },
                  image_url: { type: "string" },
                },
              },
            },
          },
        },
      }),
    ]);

    // DB deals: shoes with original_price > price
    const onSale = allShoes.filter((s) => s.original_price && s.original_price > s.price);
    onSale.sort((a, b) => ((b.original_price - b.price) / b.original_price) - ((a.original_price - a.price) / a.original_price));
    setDbDeals(onSale.slice(0, 12));
    setWebDeals(aiDeals.deals || []);

    const now = Date.now();
    setLastUpdated(now);
    setCache(CACHE_KEY, { db: onSale.slice(0, 12), web: aiDeals.deals || [], ts: now });
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
                  Live deals sourced from the web
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
              Refresh Deals
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {["all", "catalog", "web"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "all" ? "All Deals" : tab === "catalog" ? "Our Catalog" : "Web Deals"}
              </button>
            ))}
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="space-y-10">
            {/* Catalog Deals */}
            {(activeTab === "all" || activeTab === "catalog") && dbDeals.length > 0 && (
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

            {/* Web Deals */}
            {(activeTab === "all" || activeTab === "web") && webDeals.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="font-heading font-bold text-xl">Live Web Deals</h2>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">AI sourced</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {webDeals.map((deal, i) => (
                    <motion.a
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      href={deal.deal_link || `https://www.google.com/search?q=${encodeURIComponent(deal.brand + " " + deal.name + " sale")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all group"
                    >
                      <div className="relative p-5">
                        <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
                          -{deal.discount_pct || Math.round(((deal.original_price - deal.sale_price) / deal.original_price) * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{deal.brand} · {deal.retailer}</p>
                        <h3 className="font-heading font-semibold mt-1 group-hover:text-primary transition-colors">{deal.name}</h3>
                        {deal.category && <p className="text-xs text-muted-foreground mt-1">{deal.category}</p>}
                        <div className="flex items-baseline gap-2 mt-3">
                          <span className="font-heading font-bold text-2xl text-green-600 dark:text-green-400">
                            ${deal.sale_price}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">${deal.original_price}</span>
                        </div>
                        {deal.expires && (
                          <p className="text-xs text-muted-foreground mt-2">Expires: {deal.expires}</p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-primary mt-3 font-medium group-hover:underline">
                          View Deal <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </section>
            )}

            {dbDeals.length === 0 && webDeals.length === 0 && (
              <div className="text-center py-16">
                <Tag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No deals found. Try refreshing!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}