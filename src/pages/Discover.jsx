import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, Globe, ImagePlus, X, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import ShoeCard from "../components/ShoeCard";
import MatchScoreRing from "../components/MatchScoreRing";
import SkeletonCard from "../components/SkeletonCard";
import InterestPicker from "../components/InterestPicker";
import { getInterests, ALL_CATEGORIES } from "../lib/interestStore";
import { getSizeLabel, subscribeSize, getSize } from "../lib/sizeStore";
import SizeSelector from "../components/SizeSelector";
import { getCached, setCache } from "../lib/searchCache";
import { getLocation } from "../lib/locationStore";
import { canSearch, incrementSearchCount, canUse, getPlan, getSearchesUsedToday, PLAN_LIMITS } from "../lib/planStore";
import PlanGate from "../components/PlanGate";
import ShoeProblemSolver from "../components/ShoeProblemSolver";
import { Link } from "react-router-dom";

const CATEGORY_ICONS = {
  Running: "🏃", Basketball: "🏀", Soccer: "⚽", Tennis: "🎾",
  Training: "💪", Lifestyle: "✨", Casual: "👟", Walking: "🚶",
  Hiking: "🥾", Skateboarding: "🛹",
};

export default function Discover() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [webResults, setWebResults] = useState([]);
  const [aiExplanation, setAiExplanation] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [interests, setInterestsState] = useState(getInterests());
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sizeLabel, setSizeLabel] = useState(getSizeLabel());
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [searchBlocked, setSearchBlocked] = useState(false);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => subscribeSize(() => setSizeLabel(getSizeLabel())), []);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Upload immediately
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
  };

  const handleSearch = async (text) => {
    const q = text || (selectedCategory ? `Best ${selectedCategory} shoes` : query);
    if (!q.trim() && !imageUrl) return;
    // Free plan search limit
    if (!canSearch()) {
      setSearchBlocked(true);
      return;
    }
    setSearchBlocked(false);
    incrementSearchCount();
    const finalQ = q.trim() || (imageUrl ? "Find shoes matching this image" : "");
    setQuery(finalQ);
    setLoading(true);
    setResults(null);
    setWebResults([]);
    if (resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    // Check cache first (skip if image uploaded)
    if (!imageUrl) {
      const cached = getCached(finalQ);
      if (cached) {
        setResults(cached.results);
        setWebResults(cached.webResults);
        setAiExplanation(cached.summary);
        setLoading(false);
        await base44.entities.SearchHistory.create({ query: finalQ, results_count: cached.results.length });
        return;
      }
    }

    const allShoes = await base44.entities.Shoe.list("-trending_score", 50);

    // Run catalog matching and web search in parallel with separate simple schemas
    const sizePref = getSize();
    const sizeNote = sizePref.us ? `The user's shoe size is US ${sizePref.us} (EU ${sizePref.eu}, UK ${sizePref.uk}). Prefer shoes available in this size.` : "";

    const catalogPrompt = `You are a shoe recommendation AI. The user is looking for: "${finalQ}"
${selectedCategory ? `Category: ${selectedCategory}.` : ""}
${imageUrl ? "The user uploaded an image — identify the shoe style/type from it." : ""}
${sizeNote}

From the catalog below, pick up to 5 best matches by index number:
${allShoes.map((s, i) => `${i}: ${s.brand} ${s.name} $${s.price} ${s.category} sizes:${(s.sizes_available||[]).join(",")}`).join("\n")}

Write a short 1 sentence summary of what you found.`;

    const loc = getLocation();
    const webPrompt = `Find 6 real shoes matching: "${finalQ}"${selectedCategory ? ` in category ${selectedCategory}` : ""} that are available to ship to ${loc.city}.
CRITICAL: Only include retailers that explicitly ship to ${loc.city}. Do NOT include retailers that don't ship there.
For each provide: brand, name, price (as string like "$120"), retailer name, whether it ships to ${loc.city} (ships_to_user must be true), and a direct buy URL.`;

    const [catalogResponse, webResponse] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: catalogPrompt,
        file_urls: imageUrl ? [imageUrl] : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  match_score: { type: "number" },
                  explanation: { type: "string" },
                },
              },
            },
          },
        },
      }),
      base44.integrations.Core.InvokeLLM({
        prompt: webPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            web_picks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  brand: { type: "string" },
                  price: { type: "string" },
                  retailer: { type: "string" },
                  ships_to_user: { type: "boolean" },
                  reason: { type: "string" },
                  search_url: { type: "string" },
                },
              },
            },
          },
        },
      }),
    ]);

    const recs = (catalogResponse.recommendations || [])
      .filter((r) => r.index >= 0 && r.index < allShoes.length)
      .map((r) => ({ shoe: allShoes[r.index], match_score: r.match_score, explanation: r.explanation }));

    setResults(recs);
    // Only keep results that ship to user
    setWebResults((webResponse.web_picks || []).filter(p => p.ships_to_user !== false));
    setAiExplanation(catalogResponse.summary || "");
    setLoading(false);

    // Cache the result
    if (!imageUrl) {
      setCache(finalQ, { results: recs, webResults: webResponse.web_picks || [], summary: catalogResponse.summary || "" });
    }

    await base44.entities.SearchHistory.create({ query: finalQ, results_count: recs.length });
  };

  const handleInterestSave = (saved) => {
    setInterestsState(saved);
  };

  return (
    <div className="min-h-screen">
      {showInterestPicker && (
        <InterestPicker
          onClose={() => setShowInterestPicker(false)}
          onSave={handleInterestSave}
        />
      )}
      <AnimatePresence>
        {showSizePicker && <SizeSelector onClose={() => setShowSizePicker(false)} />}
      </AnimatePresence>

      {/* Hero Input Section */}
      <section className="relative py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-3 mb-4 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Globe className="w-4 h-4" />
                AI + Web Search
              </div>
              <button
                onClick={() => setShowInterestPicker(true)}
                className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium hover:bg-accent/20 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                My Interests
              </button>
              <button
                onClick={() => setShowSizePicker(true)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  sizeLabel
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Ruler className="w-4 h-4" />
                {sizeLabel ? `Size: ${sizeLabel}` : "Set My Size"}
              </button>
            </div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl mb-3">
              What are you looking for?
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              Describe, upload a photo, or pick a category — AI searches the web for you
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {/* Category Quick Picks */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                  className={`text-sm px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  {cat}
                </button>
              ))}
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="relative inline-block mb-4">
                <img src={imagePreview} alt="upload" className="h-20 w-20 rounded-2xl object-cover border-2 border-primary" />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {!imageUrl && <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
              </div>
            )}

            {/* Free plan search counter */}
            {getPlan() === "free" && (
              <div className="flex items-center justify-center gap-2 mb-3 text-xs text-muted-foreground">
                {(() => {
                  const used = getSearchesUsedToday();
                  const max = PLAN_LIMITS.free.aiSearchesPerDay;
                  const remaining = max - used;
                  return remaining > 0 ? (
                    <span>{remaining} of {max} free AI searches remaining today</span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      Daily limit reached — <Link to="/settings" className="underline text-primary">Upgrade to Pro</Link> for unlimited
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Example Prompt Pills */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {[
                "Best running shoes under $150",
                "Comfortable white sneakers",
                "Nike basketball shoes size 11",
                "Lightweight hiking shoes",
                "Stylish shoes for work",
              ].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => { setQuery(prompt); handleSearch(prompt); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-card border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
              <div className="flex items-center bg-card border border-border rounded-2xl px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-lg shadow-primary/5">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={selectedCategory ? `Search ${selectedCategory} shoes…` : "I need comfortable running shoes under $160..."}
                  className="flex-1 bg-transparent border-none outline-none mx-3 text-base placeholder:text-muted-foreground/50"
                />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="p-2 rounded-xl hover:bg-secondary transition-colors mr-1"
                  title="Upload shoe image"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Shoe Problem Solver */}
      <ShoeProblemSolver />

      {/* Results */}
      <div ref={resultsRef} />
      {searchBlocked && (
        <div className="max-w-2xl mx-auto px-4 pb-8">
          <PlanGate
            locked
            feature="Daily AI Search Limit Reached"
            description="Free plan allows 5 AI searches per day. Upgrade to Pro for unlimited searches."
          />
        </div>
      )}
      <AnimatePresence>
        {loading && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 animate-pulse text-primary" />
              <span className="text-muted-foreground">AI is searching the web for you…</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </motion.section>
        )}

        {results && !loading && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-10">
            {/* AI Summary */}
            {aiExplanation && (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI Web Summary</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{aiExplanation}</p>
              </div>
            )}

            {/* Web Picks */}
            {webResults.length > 0 && (
              <div>
                <h2 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Also Found on the Web
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {webResults.map((pick, i) => {
                    const url = pick.search_url && pick.search_url.startsWith("http")
                      ? pick.search_url
                      : `https://www.google.com/search?q=${encodeURIComponent((pick.brand || "") + " " + (pick.name || "") + " buy")}`;
                    const fallbackImg = `https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop`;
                    return (
                      <motion.a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="group block bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
                      >
                        <div className="aspect-square overflow-hidden bg-secondary/40">
                          <img
                            src={fallbackImg}
                            alt={pick.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="p-3">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{pick.brand}</p>
                          <p className="font-heading font-semibold text-xs mt-0.5 line-clamp-2 group-hover:text-primary transition-colors">{pick.name}</p>
                          {pick.price && <p className="text-primary font-bold text-sm mt-1">{pick.price}</p>}
                          {pick.retailer && <p className="text-[10px] text-muted-foreground truncate">{pick.retailer}</p>}
                          <p className="text-[10px] text-green-600 mt-1 font-medium">✓ Ships to you</p>
                          <p className="text-[10px] text-primary mt-0.5 font-medium group-hover:underline">Shop →</p>
                        </div>
                      </motion.a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DB Results */}
            {results.length > 0 && (
              <div>
                <h2 className="font-heading font-bold text-xl mb-4">Best Matches In Our Catalog</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map((result, i) => (
                    <motion.div key={result.shoe.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="relative">
                      <div className="absolute top-3 right-3 z-20">
                        <MatchScoreRing score={result.match_score} />
                      </div>
                      <ShoeCard shoe={result.shoe} index={i} />
                      <p className="text-xs text-muted-foreground italic mt-2 px-1">{result.explanation}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}


          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}