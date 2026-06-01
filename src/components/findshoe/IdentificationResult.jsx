import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { RotateCcw, MapPin, Globe, ShoppingBag, Star, Zap, Flame, Trophy, TrendingUp, ExternalLink, CheckCircle, ShoppingCart } from "lucide-react";
import ShoeCard from "../ShoeCard";
import NearbyStores from "../NearbyStores";
import BuyOnline from "../BuyOnline";

function ConfidenceBadge({ confidence }) {
  const cfg = confidence >= 80
    ? { color: "text-green-700 bg-green-100 dark:bg-green-950/40 dark:text-green-400", label: "High confidence", icon: "✓" }
    : confidence >= 50
    ? { color: "text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400", label: "Possible match", icon: "~" }
    : { color: "text-red-600 bg-red-100 dark:bg-red-950/40 dark:text-red-400", label: "Low confidence", icon: "?" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <Zap className="w-3 h-3" /> {confidence}% — {cfg.label}
    </span>
  );
}

function PopularityBadge({ popularity }) {
  const cfg = {
    iconic: { color: "text-yellow-700 bg-yellow-100 dark:bg-yellow-950/40", icon: Trophy, label: "Iconic" },
    popular: { color: "text-blue-700 bg-blue-100 dark:bg-blue-950/40", icon: TrendingUp, label: "Popular" },
    niche: { color: "text-purple-700 bg-purple-100 dark:bg-purple-950/40", icon: Star, label: "Niche" },
    rare: { color: "text-rose-700 bg-rose-100 dark:bg-rose-950/40", icon: Flame, label: "Rare" },
  }[popularity] || { color: "text-muted-foreground bg-secondary", icon: Star, label: popularity };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

export default function IdentificationResult({ result, imageUrl, onReset }) {
  const { identified, catalog_matches = [], similar_matches = [], other_shoes = [], online_results = [] } = result;
  const [activeAction, setActiveAction] = useState(null); // "nearby" | "online"
  const [selectedCatalogShoe, setSelectedCatalogShoe] = useState(catalog_matches[0] || null);

  const hasExactMatch = catalog_matches.length > 0;
  const searchShoe = selectedCatalogShoe || {
    id: `ai_${Date.now()}`,
    name: identified.model || identified.full_name,
    brand: identified.brand,
    model: identified.model,
    colorway: identified.colorway,
    category: "Lifestyle",
    sizes_available: [],
    image_url: imageUrl,
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Main AI Result Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-start gap-4">
          {imageUrl && (
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary ring-2 ring-primary/10">
              <img src={imageUrl} alt="Analyzed" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{identified.brand}</span>
              {identified.is_limited && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">Limited</span>
              )}
            </div>
            <h2 className="font-heading font-bold text-xl leading-tight">
              {identified.model || identified.full_name || "Unknown Sneaker"}
            </h2>
            {identified.colorway && (
              <p className="text-sm text-muted-foreground mt-0.5">{identified.colorway}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <ConfidenceBadge confidence={identified.confidence} />
              {identified.popularity && <PopularityBadge popularity={identified.popularity} />}
              {identified.release_year && (
                <span className="text-xs text-muted-foreground">Released {identified.release_year}</span>
              )}
              {identified.retail_price_usd && (
                <span className="text-xs font-semibold text-primary">~${identified.retail_price_usd} retail</span>
              )}
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {identified.reasoning && (
          <div className="bg-secondary/50 rounded-2xl px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">AI reasoning: </span>
              {identified.reasoning}
            </p>
          </div>
        )}

        {/* Styling Notes */}
        {identified.styling_notes && (
          <div className="flex items-start gap-2 bg-primary/5 rounded-2xl px-4 py-2.5">
            <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{identified.styling_notes}</p>
          </div>
        )}

        {/* Other shoes detected */}
        {other_shoes.length > 0 && (
          <div className="border border-border/50 rounded-2xl p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Also detected</p>
            {other_shoes.slice(0, 3).map((shoe, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border/30 last:border-0">
                <span className="text-base">👟</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{[shoe.brand, shoe.model].filter(Boolean).join(' ') || "Unknown"}</p>
                  {shoe.colorway && <p className="text-xs text-muted-foreground">{shoe.colorway}</p>}
                </div>
                {shoe.confidence != null && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">{shoe.confidence}%</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setActiveAction(activeAction === "nearby" ? null : "nearby")}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
              activeAction === "nearby"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-primary/10 text-primary border-2 border-primary/20 hover:bg-primary/15"
            }`}
          >
            <MapPin className="w-4 h-4" /> Find Near Me
          </button>
          <button
            onClick={() => setActiveAction(activeAction === "online" ? null : "online")}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
              activeAction === "online"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-primary/10 text-primary border-2 border-primary/20 hover:bg-primary/15"
            }`}
          >
            <Globe className="w-4 h-4" /> Buy Online
          </button>
        </div>

        <AnimatePresence>
          {activeAction === "nearby" && (
            <motion.div key="nearby" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <NearbyStores shoe={searchShoe} title="Stores Near You" maxCount={4} />
            </motion.div>
          )}
          {activeAction === "online" && (
            <motion.div key="online" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <BuyOnline shoe={searchShoe} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Exact catalog matches */}
      {hasExactMatch && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <h3 className="font-heading font-bold text-base">Exact Matches in Catalog</h3>
            <span className="text-xs text-muted-foreground ml-auto">{catalog_matches.length} found</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {catalog_matches.map((shoe, i) => (
              <div
                key={shoe.id}
                onClick={() => setSelectedCatalogShoe(shoe)}
                className={`cursor-pointer rounded-2xl transition-all ${selectedCatalogShoe?.id === shoe.id ? 'ring-2 ring-primary' : ''}`}
              >
                <ShoeCard shoe={shoe} index={i} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Similar recommendations */}
      {similar_matches.length > 0 && (
        <div>
          <h3 className="font-heading font-bold text-base mb-3">Similar Sneakers You'll Love</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {similar_matches.map((shoe, i) => (
              <ShoeCard key={shoe.id} shoe={shoe} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Low confidence fallback */}
      {!hasExactMatch && identified.confidence < 40 && (
        <div className="text-center py-8 space-y-3">
          <div className="text-4xl">🤔</div>
          <h3 className="font-heading font-bold text-lg">Not sure about this one</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            The image may be blurry or this shoe isn't in our catalog yet. Try a clearer photo or describe it below.
          </p>
          <Link
            to="/search"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="w-4 h-4" /> Search Manually
          </Link>
        </div>
      )}

      {/* Online results from web search */}
      {online_results.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-green-600" />
            <h3 className="font-heading font-bold text-base">Buy Online — Live Results</h3>
          </div>
          <div className="space-y-2">
            {online_results.map((r, i) => (
              <motion.a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between gap-3 bg-card border border-border/60 rounded-2xl px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.in_stock ? 'bg-green-500' : 'bg-red-400'}`} />
                  <div>
                    <p className="font-heading font-semibold text-sm group-hover:text-primary transition-colors">{r.retailer}</p>
                    <p className="text-[10px] text-muted-foreground">{r.in_stock ? 'In stock' : 'May be sold out'}{r.is_official ? ' · Official store' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {r.price && <span className="font-heading font-bold text-base text-primary">{r.price}</span>}
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-sm font-medium"
      >
        <RotateCcw className="w-4 h-4" />
        Identify Another Shoe
      </button>
    </div>
  );
}