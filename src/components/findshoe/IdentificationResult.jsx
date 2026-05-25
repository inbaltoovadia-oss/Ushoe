import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { RotateCcw, MapPin, Globe, ShoppingBag, ChevronRight, Star, Zap } from "lucide-react";
import ShoeCard from "../ShoeCard";
import NearbyStores from "../NearbyStores";
import BuyOnline from "../BuyOnline";

function ConfidenceBadge({ confidence }) {
  const color = confidence >= 80 ? "text-green-600 bg-green-100 dark:bg-green-950/40"
    : confidence >= 50 ? "text-amber-600 bg-amber-100 dark:bg-amber-950/40"
    : "text-red-500 bg-red-100 dark:bg-red-950/40";
  const label = confidence >= 80 ? "High confidence" : confidence >= 50 ? "Possible match" : "Low confidence";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>
      <Zap className="w-3 h-3" /> {confidence}% — {label}
    </span>
  );
}

export default function IdentificationResult({ result, imageUrl, onReset }) {
  const { identified, catalog_matches = [], similar_matches = [], other_shoes = [] } = result;
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
      {/* AI Result Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-start gap-4">
          {imageUrl && (
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary">
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
              {identified.release_year && (
                <span className="text-xs text-muted-foreground">Released {identified.release_year}</span>
              )}
              {identified.retail_price_usd && (
                <span className="text-xs font-semibold text-primary">~${identified.retail_price_usd} retail</span>
              )}
            </div>
          </div>
        </div>

        {identified.reasoning && (
          <div className="bg-secondary/50 rounded-2xl px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">AI reasoning: </span>
              {identified.reasoning}
            </p>
          </div>
        )}

        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setActiveAction(activeAction === "nearby" ? null : "nearby")}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
              activeAction === "nearby"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-primary/10 text-primary border-2 border-primary/25 hover:bg-primary/15"
            }`}
          >
            <MapPin className="w-4 h-4" /> Find Near Me
          </button>
          <button
            onClick={() => setActiveAction(activeAction === "online" ? null : "online")}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all ${
              activeAction === "online"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "bg-primary/10 text-primary border-2 border-primary/25 hover:bg-primary/15"
            }`}
          >
            <Globe className="w-4 h-4" /> Buy Online
          </button>
        </div>

        {activeAction === "nearby" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <NearbyStores shoe={searchShoe} title="Stores Near You" maxCount={4} />
          </motion.div>
        )}
        {activeAction === "online" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <BuyOnline shoe={searchShoe} />
          </motion.div>
        )}
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
              <div key={shoe.id} onClick={() => setSelectedCatalogShoe(shoe)} className="cursor-pointer">
                <ShoeCard shoe={shoe} index={i} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other shoes detected */}
      {other_shoes.length > 0 && (
        <div className="glass-card rounded-3xl p-4 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Also detected in image</h3>
          {other_shoes.slice(0, 3).map((shoe, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
              <span className="text-lg">👟</span>
              <div>
                <p className="text-sm font-medium">{[shoe.brand, shoe.model].filter(Boolean).join(' ') || shoe.name || "Unknown"}</p>
                {shoe.colorway && <p className="text-xs text-muted-foreground">{shoe.colorway}</p>}
              </div>
              {shoe.confidence && (
                <span className="ml-auto text-xs text-muted-foreground">{shoe.confidence}%</span>
              )}
            </div>
          ))}
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

      {/* Confidence low: no match found */}
      {!hasExactMatch && identified.confidence < 40 && (
        <div className="text-center py-8 space-y-3">
          <div className="text-4xl">🤔</div>
          <h3 className="font-heading font-bold text-lg">Not sure about this one</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            The image may be blurry or the shoe isn't in our catalog yet. Try a clearer photo or describe the shoe in the search.
          </p>
          <Link to="/search" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity">
            <ShoppingBag className="w-4 h-4" /> Search Manually
          </Link>
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